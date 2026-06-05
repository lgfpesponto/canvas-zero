/**
 * Helpers fire-and-forget para sincronizar variações e custom_options
 * com o sistema Atacado externo.
 *
 * - Cada função PRESSUPÕE que o commit no banco já foi feito (await retornado sem erro).
 * - Internamente chama a edge function `atacado-sync-proxy` via `supabase.functions.invoke`.
 * - Erros não bloqueiam a UI: mostram toast discreto + console.warn. Sucesso fica silencioso.
 * - O log completo fica em `atacado_variacao_sync_log` (visível em /admin/configuracoes).
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TOAST_FAIL_MSG =
  'Sincronização com Atacado falhou — ver log em configurações';

function notifyFailure(context: string, detail?: unknown) {
  console.warn(`[atacadoSync] ${context}`, detail);
  toast.error(TOAST_FAIL_MSG, { duration: 4000, id: 'atacado-sync-fail' });
}

async function invokeSync(body: Record<string, unknown>) {
  try {
    const { data, error } = await supabase.functions.invoke('atacado-sync-proxy', { body });
    if (error) {
      notifyFailure('invoke error', error);
      return { ok: false, error: error.message };
    }
    if (data && (data as any).ok === false && (data as any).skipped !== true) {
      notifyFailure('sync response not ok', data);
      return { ok: false, data };
    }
    return { ok: true, data };
  } catch (e) {
    notifyFailure('invoke threw', e);
    return { ok: false, error: String(e) };
  }
}

/* ─────────── ficha_variacao ─────────── */

export interface FichaVariacaoSyncContext {
  ficha_tipo?: { id: string; slug: string; nome: string } | null;
  categoria?: { id: string; slug: string; nome: string } | null;
  campo?: {
    id: string;
    slug: string;
    nome: string;
    tipo: string;
    vinculo: string | null;
    relacionamento: unknown;
  } | null;
}

export interface FichaVariacaoPayload {
  id: string;
  nome: string;
  preco_adicional: number;
  ordem: number;
  ativo: boolean;
  relacionamento?: unknown;
}

export function syncFichaVariacaoUpsert(
  v: FichaVariacaoPayload,
  ctx: FichaVariacaoSyncContext = {}
) {
  void invokeSync({
    kind: 'ficha_variacao',
    action: 'upsert',
    source_id: v.id,
    payload: {
      nome: v.nome,
      preco_adicional: Number(v.preco_adicional) || 0,
      ordem: Number(v.ordem) || 0,
      ativo: v.ativo !== false,
      relacionamento: v.relacionamento ?? null,
      ficha_tipo: ctx.ficha_tipo ?? null,
      categoria: ctx.categoria ?? null,
      campo: ctx.campo ?? null,
    },
  });
}

export function syncFichaVariacaoDelete(id: string) {
  void invokeSync({
    kind: 'ficha_variacao',
    action: 'delete',
    source_id: id,
    payload: {},
  });
}

/* ─────────── custom_option ─────────── */

export function syncCustomOptionUpsert(opt: {
  id: string;
  categoria: string;
  label: string;
  preco: number;
}) {
  void invokeSync({
    kind: 'custom_option',
    action: 'upsert',
    source_id: opt.id,
    payload: {
      categoria: opt.categoria,
      label: opt.label,
      preco: Number(opt.preco) || 0,
    },
  });
}

export function syncCustomOptionDelete(id: string) {
  void invokeSync({
    kind: 'custom_option',
    action: 'delete',
    source_id: id,
    payload: {},
  });
}

/* ─────────── Reenvio a partir de uma linha do log ─────────── */

export async function retrySyncFromLog(logId: string) {
  const { data: row, error } = await supabase
    .from('atacado_variacao_sync_log')
    .select('source_kind, source_id, action, payload')
    .eq('id', logId)
    .maybeSingle();
  if (error || !row) {
    notifyFailure('retry: log row not found', error);
    return { ok: false };
  }
  return invokeSync({
    kind: row.source_kind,
    action: row.action,
    source_id: row.source_id,
    payload: row.payload ?? {},
    // Não passa log_id — gera nova linha (preserva histórico)
  });
}

/* ─────────── Sincronização em massa ─────────── */

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export interface SyncAllProgress {
  total: number;
  processed: number;
  current?: string;
}

/**
 * Reenvia upsert de todas variações ativas + todas custom_options.
 * Roda em lotes de 10 com sleep(200) entre lotes para não estourar
 * rate limit do Atacado.
 */
export async function syncAllNow(onProgress?: (p: SyncAllProgress) => void) {
  // Busca tudo
  const [variacoesRes, optionsRes, camposRes, categoriasRes, tiposRes] = await Promise.all([
    supabase.from('ficha_variacoes')
      .select('id, nome, preco_adicional, ordem, ativo, campo_id, categoria_id, relacionamento')
      .eq('ativo', true),
    supabase.from('custom_options').select('id, categoria, label, preco'),
    supabase.from('ficha_campos').select('id, slug, nome, tipo, vinculo, relacionamento, categoria_id, ficha_tipo_id'),
    supabase.from('ficha_categorias').select('id, slug, nome, ficha_tipo_id'),
    supabase.from('ficha_tipos').select('id, slug, nome'),
  ]);

  if (variacoesRes.error) { notifyFailure('syncAllNow ficha_variacoes', variacoesRes.error); return; }
  if (optionsRes.error)  { notifyFailure('syncAllNow custom_options', optionsRes.error); return; }

  const camposById = new Map((camposRes.data ?? []).map((c: any) => [c.id, c]));
  const categoriasById = new Map((categoriasRes.data ?? []).map((c: any) => [c.id, c]));
  const tiposById = new Map((tiposRes.data ?? []).map((t: any) => [t.id, t]));

  type Job = { kind: 'ficha_variacao' | 'custom_option'; body: Record<string, unknown>; label: string };

  const jobs: Job[] = [];

  for (const v of variacoesRes.data ?? []) {
    const campo = v.campo_id ? camposById.get(v.campo_id) : null;
    const categoria = categoriasById.get(v.categoria_id) ?? null;
    const ficha_tipo = categoria ? tiposById.get((categoria as any).ficha_tipo_id) : null;
    jobs.push({
      kind: 'ficha_variacao',
      label: v.nome,
      body: {
        kind: 'ficha_variacao',
        action: 'upsert',
        source_id: v.id,
        payload: {
          nome: v.nome,
          preco_adicional: Number(v.preco_adicional) || 0,
          ordem: Number(v.ordem) || 0,
          ativo: v.ativo !== false,
          relacionamento: v.relacionamento ?? null,
          ficha_tipo: ficha_tipo
            ? { id: (ficha_tipo as any).id, slug: (ficha_tipo as any).slug, nome: (ficha_tipo as any).nome }
            : null,
          categoria: categoria
            ? { id: (categoria as any).id, slug: (categoria as any).slug, nome: (categoria as any).nome }
            : null,
          campo: campo
            ? {
                id: (campo as any).id,
                slug: (campo as any).slug,
                nome: (campo as any).nome,
                tipo: (campo as any).tipo,
                vinculo: (campo as any).vinculo ?? null,
                relacionamento: (campo as any).relacionamento ?? null,
              }
            : null,
        },
      },
    });
  }

  for (const o of optionsRes.data ?? []) {
    jobs.push({
      kind: 'custom_option',
      label: o.label,
      body: {
        kind: 'custom_option',
        action: 'upsert',
        source_id: o.id,
        payload: {
          categoria: o.categoria,
          label: o.label,
          preco: Number(o.preco) || 0,
        },
      },
    });
  }

  const total = jobs.length;
  let processed = 0;
  onProgress?.({ total, processed });

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const slice = jobs.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(slice.map(j => invokeSync(j.body)));
    processed += slice.length;
    onProgress?.({
      total,
      processed,
      current: slice[slice.length - 1]?.label,
    });
    if (i + BATCH_SIZE < jobs.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}
