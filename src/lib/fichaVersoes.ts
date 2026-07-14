import { supabase } from '@/integrations/supabase/client';

export interface FichaSnapshot {
  categorias: any[];
  campos: any[];
  variacoes: any[];
  ficha_tipo?: { id: string; slug: string; lead_time_dias?: number | null } | null;
}

export interface FichaVersao {
  id: string;
  ficha_tipo_id: string;
  versao: number;
  snapshot: FichaSnapshot;
  descricao_mudanca: string | null;
  criado_por: string | null;
  ativa: boolean;
  created_at: string;
}

/** Retorna a versão ativa de um tipo de ficha (bota / cinto / etc). */
export async function getVersaoAtiva(fichaTipoId: string): Promise<FichaVersao | null> {
  const { data, error } = await supabase
    .from('ficha_versoes')
    .select('*')
    .eq('ficha_tipo_id', fichaTipoId)
    .eq('ativa', true)
    .maybeSingle();
  if (error) { console.error('getVersaoAtiva', error); return null; }
  return data as any;
}

/** Retorna o id da versão ativa a partir do slug do tipo (ex: 'bota', 'cinto'). */
export async function getVersaoAtivaIdBySlug(slug: string): Promise<string | null> {
  const { data: tipo } = await supabase
    .from('ficha_tipos')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!tipo?.id) return null;
  const v = await getVersaoAtiva(tipo.id);
  return v?.id ?? null;
}

/** Monta um snapshot do estado atual da ficha no banco. */
export async function buildSnapshotAtual(fichaTipoId: string): Promise<FichaSnapshot> {
  const [{ data: cats }, { data: fields }, { data: catIdsRes }, { data: tipo }] = await Promise.all([
    supabase.from('ficha_categorias').select('*').eq('ficha_tipo_id', fichaTipoId).order('ordem'),
    supabase.from('ficha_campos').select('*').eq('ficha_tipo_id', fichaTipoId).order('ordem'),
    supabase.from('ficha_categorias').select('id').eq('ficha_tipo_id', fichaTipoId),
    supabase.from('ficha_tipos').select('id, slug, lead_time_dias').eq('id', fichaTipoId).maybeSingle(),
  ]);
  const catIds = (catIdsRes || []).map(c => (c as any).id);
  let variacoes: any[] = [];
  if (catIds.length) {
    const { data: vars } = await supabase
      .from('ficha_variacoes')
      .select('*')
      .in('categoria_id', catIds)
      .order('ordem');
    variacoes = vars || [];
  }
  return {
    categorias: cats || [],
    campos: fields || [],
    variacoes,
    ficha_tipo: tipo ? { id: (tipo as any).id, slug: (tipo as any).slug, lead_time_dias: (tipo as any).lead_time_dias ?? null } : null,
  };
}

/** Cria uma nova versão a partir do estado atual do banco e marca como ativa. */
export async function salvarNovaVersao(
  fichaTipoId: string,
  descricao?: string,
  overrideLeadTime?: number | null,
): Promise<{ ok: boolean; id?: string; versao?: number; error?: string }> {
  try {
    // Aplica override de lead_time_dias ANTES do snapshot para que o novo
    // valor faça parte da versão gravada.
    if (overrideLeadTime !== undefined && overrideLeadTime !== null && Number.isFinite(overrideLeadTime) && overrideLeadTime > 0) {
      await supabase
        .from('ficha_tipos')
        .update({ lead_time_dias: overrideLeadTime } as any)
        .eq('id', fichaTipoId);
    }
    const snapshot = await buildSnapshotAtual(fichaTipoId);
    const { data: last } = await supabase
      .from('ficha_versoes')
      .select('versao')
      .eq('ficha_tipo_id', fichaTipoId)
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersao = ((last as any)?.versao || 0) + 1;

    // Desativa versão anterior
    await supabase
      .from('ficha_versoes')
      .update({ ativa: false })
      .eq('ficha_tipo_id', fichaTipoId)
      .eq('ativa', true);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id || null;

    const { data, error } = await supabase
      .from('ficha_versoes')
      .insert({
        ficha_tipo_id: fichaTipoId,
        versao: nextVersao,
        snapshot: snapshot as any,
        descricao_mudanca: descricao || null,
        criado_por: uid,
        ativa: true,
      })
      .select('id, versao')
      .single();
    if (error) throw error;
    return { ok: true, id: (data as any).id, versao: (data as any).versao };
  } catch (err: any) {
    console.error('salvarNovaVersao', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Diff simples entre dois snapshots para exibir no histórico. */
export function diffSnapshots(a: FichaSnapshot | null, b: FichaSnapshot): {
  categoriasAdd: number; categoriasDel: number;
  camposAdd: number; camposDel: number; camposMod: number;
  variacoesAdd: number; variacoesDel: number; variacoesMod: number;
} {
  const empty = { categorias: [], campos: [], variacoes: [] };
  const prev = a || empty;
  const idsPrev = {
    cat: new Set((prev.categorias || []).map((x: any) => x.id)),
    campo: new Set((prev.campos || []).map((x: any) => x.id)),
    var: new Set((prev.variacoes || []).map((x: any) => x.id)),
  };
  const idsNext = {
    cat: new Set((b.categorias || []).map((x: any) => x.id)),
    campo: new Set((b.campos || []).map((x: any) => x.id)),
    var: new Set((b.variacoes || []).map((x: any) => x.id)),
  };
  const catsAdd = [...idsNext.cat].filter(x => !idsPrev.cat.has(x)).length;
  const catsDel = [...idsPrev.cat].filter(x => !idsNext.cat.has(x)).length;
  const camposAdd = [...idsNext.campo].filter(x => !idsPrev.campo.has(x)).length;
  const camposDel = [...idsPrev.campo].filter(x => !idsNext.campo.has(x)).length;
  const varsAdd = [...idsNext.var].filter(x => !idsPrev.var.has(x)).length;
  const varsDel = [...idsPrev.var].filter(x => !idsNext.var.has(x)).length;

  const prevVarsMap = new Map((prev.variacoes || []).map((v: any) => [v.id, v]));
  let varsMod = 0;
  for (const v of b.variacoes || []) {
    const p: any = prevVarsMap.get((v as any).id);
    if (!p) continue;
    if (
      p.nome !== (v as any).nome ||
      Number(p.preco_adicional) !== Number((v as any).preco_adicional) ||
      JSON.stringify(p.relacionamento || null) !== JSON.stringify((v as any).relacionamento || null)
    ) varsMod++;
  }
  const prevCamposMap = new Map((prev.campos || []).map((c: any) => [c.id, c]));
  let camposMod = 0;
  for (const c of b.campos || []) {
    const p: any = prevCamposMap.get((c as any).id);
    if (!p) continue;
    if (p.nome !== (c as any).nome || p.obrigatorio !== (c as any).obrigatorio || p.tipo !== (c as any).tipo) camposMod++;
  }

  return {
    categoriasAdd: catsAdd, categoriasDel: catsDel,
    camposAdd, camposDel, camposMod,
    variacoesAdd: varsAdd, variacoesDel: varsDel, variacoesMod: varsMod,
  };
}
