// Chaves de filtro por ficha compartilhadas entre Estoque, Modelos e Modelos Salvos.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FichaCampoTipo = 'selecao' | 'multipla' | 'checkbox' | string;

export interface FichaFilterKey {
  key: string;            // slug do ficha_campos (snake_case)
  label: string;
  tipo?: string;          // slug da ficha (bota/cinto)
  campoTipo?: FichaCampoTipo;
  ordem?: number;
}

// Fallback estático (usado pela Estoque atual e como default caso o hook não seja usado).
export const FICHA_FILTER_KEYS: FichaFilterKey[] = [
  { key: 'modelo', label: 'Modelo', campoTipo: 'selecao' },
  { key: 'tipo_couro_cano', label: 'Tipo Couro Cano', campoTipo: 'selecao' },
  { key: 'tipo_couro_gaspea', label: 'Tipo Couro Gáspea', campoTipo: 'selecao' },
  { key: 'solado', label: 'Solado', campoTipo: 'selecao' },
  { key: 'genero', label: 'Gênero', campoTipo: 'selecao' },
];

// Só campos "selecionáveis" entram no modal. Textos livres / números não.
const ALLOWED_CAMPO_TIPOS = new Set(['selecao', 'multipla', 'checkbox']);

// Overrides para quando o slug do ficha_campos não bate com a chave do form_data.
// (form_data usa camelCase e alguns campos têm prefixo "tipo").
const FORM_KEY_OVERRIDES: Record<string, string[]> = {
  couro_cano: ['tipoCouroCano'],
  couro_gaspea: ['tipoCouroGaspea'],
  couro_taloneira: ['tipoCouroTaloneira'],
  tipo_couro: ['tipoCouro'],
  cor_couro: ['corCouro'],
};

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** Lista, em ordem, as chaves possíveis no form_data para um slug do ficha_campos. */
export function resolveFormKeys(slug: string): string[] {
  const out = new Set<string>();
  out.add(slug);
  const camel = snakeToCamel(slug);
  if (camel && camel !== slug) out.add(camel);
  for (const alias of FORM_KEY_OVERRIDES[slug] || []) out.add(alias);
  return [...out];
}

function pickValue(snap: Record<string, unknown>, slug: string): unknown {
  for (const k of resolveFormKeys(slug)) {
    const v = snap[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function toValueList(v: unknown, campoTipo?: FichaCampoTipo): string[] {
  if (v === undefined || v === null) return [];
  if (campoTipo === 'checkbox') {
    if (v === true || v === 'true') return ['Sim'];
    return [];
  }
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === 'string' ? x : String(x ?? ''))).filter(Boolean);
  }
  if (typeof v === 'boolean') return v ? ['Sim'] : [];
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (campoTipo === 'multipla' && s.includes(',')) {
      return s.split(',').map((x) => x.trim()).filter(Boolean);
    }
    return [s];
  }
  return [];
}

/**
 * Hook que lê `ficha_campos` da(s) ficha(s) atual(is) e devolve as chaves de filtro
 * dinâmicas. Deduplica por slug (mantém menor ordem) e filtra apenas tipos "selecionáveis".
 * Sempre usa a versão vigente da ficha (não olha snapshot do template).
 */
export function useFichaFilterKeys(tipos: string[]): FichaFilterKey[] {
  const tiposKey = [...tipos].sort().join(',');
  const { data } = useQuery({
    queryKey: ['ficha_filter_keys', tiposKey, 'v2'],
    queryFn: async () => {
      if (tipos.length === 0) return [] as FichaFilterKey[];
      const { data, error } = await supabase
        .from('ficha_campos')
        .select('slug, nome, ordem, ativo, tipo, ficha_tipos!inner(slug)')
        .eq('ativo', true)
        .in('ficha_tipos.slug', tipos)
        .order('ordem');
      if (error) {
        console.error('useFichaFilterKeys error:', error);
        return [] as FichaFilterKey[];
      }
      const seen = new Map<string, FichaFilterKey>();
      for (const row of (data || []) as any[]) {
        const slug = String(row.slug || '').trim();
        if (!slug) continue;
        const campoTipo = String(row.tipo || '').trim();
        if (!ALLOWED_CAMPO_TIPOS.has(campoTipo)) continue;
        const prev = seen.get(slug);
        if (prev && (prev.ordem ?? 0) <= (row.ordem ?? 0)) continue;
        seen.set(slug, {
          key: slug,
          label: row.nome || slug,
          tipo: row.ficha_tipos?.slug,
          campoTipo,
          ordem: row.ordem ?? 0,
        });
      }
      if (!seen.has('genero')) {
        seen.set('genero', { key: 'genero', label: 'Gênero', campoTipo: 'selecao', ordem: 9999 });
      }
      return [...seen.values()].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    },
    staleTime: 30_000,
  });
  return data ?? [];
}

/** Constrói o mapa { key -> Set<valor> } a partir de uma lista de itens. */
export function buildFichaOptions<T>(
  items: T[],
  getSnapshot: (item: T) => Record<string, unknown> | null | undefined,
  keys: FichaFilterKey[] = FICHA_FILTER_KEYS,
): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const k of keys) out[k.key] = new Set();
  for (const it of items) {
    const snap = (getSnapshot(it) || {}) as Record<string, unknown>;
    for (const k of keys) {
      const v = pickValue(snap, k.key);
      for (const val of toValueList(v, k.campoTipo)) out[k.key].add(val);
    }
  }
  return out;
}

/** Item passa nos filtros se, para cada categoria selecionada, o valor bate. */
export function matchesFichaFilters(
  snapshot: Record<string, unknown> | null | undefined,
  selFicha: Record<string, Set<string>>,
  keys: FichaFilterKey[] = FICHA_FILTER_KEYS,
): boolean {
  const snap = (snapshot || {}) as Record<string, unknown>;
  const byKey = new Map(keys.map((k) => [k.key, k] as const));
  for (const k of Object.keys(selFicha)) {
    const set = selFicha[k];
    if (!set || set.size === 0) continue;
    const meta = byKey.get(k);
    const values = toValueList(pickValue(snap, k), meta?.campoTipo);
    if (values.length === 0) return false;
    if (!values.some((v) => set.has(v))) return false;
  }
  return true;
}

export function countActiveFicha(selFicha: Record<string, Set<string>>): number {
  return Object.values(selFicha).reduce((s, set) => s + (set?.size || 0), 0);
}
