// Chaves de filtro por ficha compartilhadas entre Estoque, Modelos e Modelos Salvos.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FichaFilterKey { key: string; label: string; tipo?: string; ordem?: number }

// Fallback estático (usado pela Estoque atual e como default caso o hook não seja usado).
export const FICHA_FILTER_KEYS: FichaFilterKey[] = [
  { key: 'modelo', label: 'Modelo' },
  { key: 'tipo_couro_cano', label: 'Tipo Couro Cano' },
  { key: 'tipo_couro_gaspea', label: 'Tipo Couro Gáspea' },
  { key: 'solado', label: 'Solado' },
  { key: 'genero', label: 'Gênero' },
];

/**
 * Hook que lê `ficha_campos` da(s) ficha(s) atual(is) e devolve as chaves de filtro
 * dinâmicas. Deduplica por slug quando o mesmo campo existe em vários tipos.
 * Sempre usa a versão vigente da ficha (não olha snapshot do template).
 */
export function useFichaFilterKeys(tipos: string[]): FichaFilterKey[] {
  const tiposKey = [...tipos].sort().join(',');
  const { data } = useQuery({
    queryKey: ['ficha_filter_keys', tiposKey],
    queryFn: async () => {
      if (tipos.length === 0) return [] as FichaFilterKey[];
      const { data, error } = await supabase
        .from('ficha_campos')
        .select('slug, nome, ordem, ativo, ficha_tipos!inner(slug)')
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
        if (seen.has(slug)) continue;
        seen.set(slug, {
          key: slug,
          label: row.nome || slug,
          tipo: row.ficha_tipos?.slug,
          ordem: row.ordem ?? 0,
        });
      }
      // Garante que "genero" (não é um ficha_campo, é fixo no cabeçalho do pedido) esteja presente.
      if (!seen.has('genero')) {
        seen.set('genero', { key: 'genero', label: 'Gênero', ordem: 9999 });
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
    const snap = getSnapshot(it) || {};
    for (const k of keys) {
      const v = (snap as Record<string, unknown>)[k.key];
      if (v && typeof v === 'string') out[k.key].add(v);
      else if (typeof v === 'boolean' && v === true) out[k.key].add('Sim');
    }
  }
  return out;
}

/** Item passa nos filtros se, para cada categoria selecionada, o valor bate. */
export function matchesFichaFilters(
  snapshot: Record<string, unknown> | null | undefined,
  selFicha: Record<string, Set<string>>,
): boolean {
  const snap = snapshot || {};
  for (const k of Object.keys(selFicha)) {
    const set = selFicha[k];
    if (!set || set.size === 0) continue;
    const raw = (snap as Record<string, unknown>)[k];
    const v = typeof raw === 'boolean' ? (raw ? 'Sim' : '') : raw;
    if (typeof v !== 'string' || !set.has(v)) return false;
  }
  return true;
}

export function countActiveFicha(selFicha: Record<string, Set<string>>): number {
  return Object.values(selFicha).reduce((s, set) => s + (set?.size || 0), 0);
}
