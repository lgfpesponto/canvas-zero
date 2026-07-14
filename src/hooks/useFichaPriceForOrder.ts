/**
 * Resolve preços da ficha respeitando a VERSÃO em que o pedido foi criado.
 *
 * Cada pedido guarda `fichaVersaoId` (versão ativa no momento da criação).
 * Se existir, lê preços do `ficha_versoes.snapshot` daquela versão — assim
 * pedidos antigos preservam os preços originais mesmo depois de uma nova
 * versão da ficha alterar valores globais.
 *
 * Fallback (nesta ordem):
 *   1. snapshot da versão do pedido (se existir e contiver o item)
 *   2. `useFichaVariacoesLookup` (ficha_variacoes atual)
 *   3. deixa o caller aplicar hardcoded fallback (COURO_PRECOS, SOLADO etc.)
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFichaVariacoesLookup } from './useFichaVariacoesLookup';

interface SnapshotIndex {
  bySlugNome: Map<string, number>; // key: `${slug}::${nome.toLowerCase()}` -> preco
}

const CATEGORY_MAP: Record<string, string> = {
  'bordado_cano': 'bordado_cano',
  'bordado_gaspea': 'bordado_gaspea',
  'bordado_taloneira': 'bordado_taloneira',
  'laser_cano': 'laser_cano',
  'laser_gaspea': 'laser_gaspea',
  'laser_taloneira': 'laser_taloneira',
  'couro_cano': 'couro_cano',
  'couro_gaspea': 'couro_gaspea',
  'couro_taloneira': 'couro_taloneira',
  'recorte_cano': 'recorte_cano',
  'recorte_gaspea': 'recorte_gaspea',
  'recorte_taloneira': 'recorte_taloneira',
  'solado': 'solado',
  'cor_sola': 'cor_sola',
  'cor_vira': 'cor_vira',
  'formato_bico': 'formato_bico',
  'modelo': 'tamanho_genero_modelo',
  'tamanho_genero_modelo': 'tamanho_genero_modelo',
};

function buildIndex(snapshot: any): SnapshotIndex {
  const idx: SnapshotIndex = { bySlugNome: new Map() };
  if (!snapshot) return idx;
  const campos: any[] = Array.isArray(snapshot.campos) ? snapshot.campos : [];
  const variacoes: any[] = Array.isArray(snapshot.variacoes) ? snapshot.variacoes : [];
  const campoIdToSlug = new Map<string, string>();
  for (const c of campos) if (c?.id && c?.slug) campoIdToSlug.set(c.id, c.slug);
  for (const v of variacoes) {
    const slug = campoIdToSlug.get(v?.campo_id);
    if (!slug || !v?.nome) continue;
    idx.bySlugNome.set(`${slug}::${String(v.nome).toLowerCase()}`, Number(v.preco_adicional) || 0);
  }
  return idx;
}

async function fetchSnapshotIndex(versaoId: string): Promise<SnapshotIndex> {
  const { data, error } = await supabase
    .from('ficha_versoes')
    .select('snapshot')
    .eq('id', versaoId)
    .maybeSingle();
  if (error || !data) return { bySlugNome: new Map() };
  return buildIndex((data as any).snapshot);
}

export type FindFichaPrice = (nome: string, categoria: string) => number | undefined;

/**
 * Retorna resolver `findFichaPrice` para UM pedido — usa snapshot da versão
 * congelada no pedido, com fallback para a ficha atual.
 */
export function useFichaPriceForOrder(order: any): {
  findFichaPrice: FindFichaPrice;
  loading: boolean;
} {
  const { findFichaPrice: currentFind, loading: curLoading } = useFichaVariacoesLookup();
  const versaoId = (order?.fichaVersaoId as string | null | undefined) || null;

  const { data: snapIdx, isLoading: snapLoading } = useQuery({
    queryKey: ['ficha_versao_snapshot', versaoId],
    queryFn: () => fetchSnapshotIndex(versaoId as string),
    enabled: !!versaoId,
    staleTime: 5 * 60_000,
  });

  const findFichaPrice = useCallback<FindFichaPrice>((nome, categoria) => {
    if (!nome) return undefined;
    const slug = CATEGORY_MAP[categoria] || categoria;
    if (snapIdx) {
      const v = snapIdx.bySlugNome.get(`${slug}::${nome.toLowerCase()}`);
      if (v !== undefined) return v;
    }
    return currentFind(nome, categoria);
  }, [snapIdx, currentFind]);

  return { findFichaPrice, loading: curLoading || (!!versaoId && snapLoading) };
}

/**
 * Versão batch — carrega snapshots de TODAS as versões presentes numa lista
 * de pedidos de uma vez, e retorna resolver `(order, nome, categoria) => preco`.
 */
export function useFichaPriceForOrders(orders: { fichaVersaoId?: string | null }[]): {
  findFichaPrice: (order: { fichaVersaoId?: string | null }, nome: string, categoria: string) => number | undefined;
  loading: boolean;
} {
  const { findFichaPrice: currentFind, loading: curLoading } = useFichaVariacoesLookup();
  const ids = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) if (o?.fichaVersaoId) s.add(o.fichaVersaoId);
    return [...s];
  }, [orders]);

  const queries = useQueries({
    queries: ids.map(id => ({
      queryKey: ['ficha_versao_snapshot', id],
      queryFn: () => fetchSnapshotIndex(id),
      staleTime: 5 * 60_000,
    })),
  });

  const byId = useMemo(() => {
    const m = new Map<string, SnapshotIndex>();
    ids.forEach((id, i) => {
      const d = queries[i]?.data;
      if (d) m.set(id, d);
    });
    return m;
  }, [ids, queries]);

  const anyLoading = queries.some(q => q.isLoading);

  const findFichaPrice = useCallback(
    (order: { fichaVersaoId?: string | null }, nome: string, categoria: string) => {
      if (!nome) return undefined;
      const slug = CATEGORY_MAP[categoria] || categoria;
      const idx = order?.fichaVersaoId ? byId.get(order.fichaVersaoId) : null;
      if (idx) {
        const v = idx.bySlugNome.get(`${slug}::${nome.toLowerCase()}`);
        if (v !== undefined) return v;
      }
      return currentFind(nome, categoria);
    },
    [byId, currentFind],
  );

  return { findFichaPrice, loading: curLoading || anyLoading };
}
