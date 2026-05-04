import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllFilteredOrderIds, type OrderFilters } from '@/hooks/useOrders';
import { EXTRA_PRODUCTS } from '@/lib/extrasConfig';

interface NeighborInfo {
  prevId: string | null;
  nextId: string | null;
  index: number; // 0-based; -1 if not found
  total: number;
  loading: boolean;
}

/**
 * Reads the same URL filter keys used by ReportsPage and rebuilds an OrderFilters.
 * Returns null if no relevant filter is present in the URL.
 */
function buildFiltersFromParams(searchParams: URLSearchParams): OrderFilters | null {
  const q = searchParams.get('q') || '';
  const de = searchParams.get('de') || '';
  const ate = searchParams.get('ate') || '';
  const status = searchParams.get('status');
  const vendedor = searchParams.get('vendedor');
  const produtos = searchParams.get('produtos');
  const mudouStatus = searchParams.get('mudou_status');
  const mudouDe = searchParams.get('mudou_de') || '';
  const mudouAte = searchParams.get('mudou_ate') || '';

  const hasAny =
    !!q || !!de || !!ate || !!status || !!vendedor || !!produtos || !!mudouStatus;
  if (!hasAny) return null;

  const defaultProduto = new Set<string>(['bota', 'cinto', ...EXTRA_PRODUCTS.map(p => p.id)]);

  const filters: OrderFilters = {
    searchQuery: q || undefined,
    filterDate: de || undefined,
    filterDateEnd: ate || undefined,
    filterStatus: status ? new Set(status.split(',').filter(Boolean)) : undefined,
    filterVendedor: vendedor ? new Set(vendedor.split(',').filter(Boolean)) : undefined,
    filterProduto: produtos
      ? new Set(produtos.split(',').filter(Boolean))
      : defaultProduto,
    mudouParaStatus: mudouStatus
      ? new Set(mudouStatus.split(',').filter(Boolean))
      : undefined,
    mudouParaStatusDe: mudouDe || undefined,
    mudouParaStatusAte: mudouAte || mudouDe || undefined,
  };
  return filters;
}

/**
 * Returns the previous/next order id relative to currentId.
 * If the URL has filter params (same keys as ReportsPage), the sequence
 * respects those filters. Otherwise it falls back to the user's full scope
 * (vendedor sees own; admin sees all), ordered by created_at DESC.
 */
export function useOrderNeighbors(currentId: string | undefined): NeighborInfo {
  const { user, isAdmin, isLoggedIn, role } = useAuth() as any;
  const [searchParams] = useSearchParams();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Stable signature of the filter params so the effect re-runs when they change.
  const filterKey = useMemo(() => {
    const keys = ['q', 'de', 'ate', 'status', 'vendedor', 'produtos', 'mudou_status', 'mudou_de', 'mudou_ate'];
    return keys.map(k => `${k}=${searchParams.get(k) || ''}`).join('&');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isLoggedIn || !user) { setIds([]); return; }
      setLoading(true);
      try {
        const filters = buildFiltersFromParams(searchParams);

        // Bordado role: sequence follows the portal list (Entrada/Baixa Bordado, oldest first).
        if (role === 'bordado' && !filters) {
          const BATCH = 1000;
          let all: { id: string }[] = [];
          let offset = 0;
          while (true) {
            const { data, error } = await supabase
              .from('orders')
              .select('id')
              .in('status', ['Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos'])
              .order('data_criacao', { ascending: true })
              .order('hora_criacao', { ascending: true })
              .order('id', { ascending: true })
              .range(offset, offset + BATCH - 1);
            if (error || !data || data.length === 0) break;
            all = all.concat(data.map(d => ({ id: (d as any).id })));
            if (data.length < BATCH) break;
            offset += BATCH;
          }
          if (!cancelled) setIds(all.map(o => o.id));
          return;
        }

        if (filters) {
          if (!isAdmin) {
            // RLS handles vendedor scope.
          }
          const filteredIds = await fetchAllFilteredOrderIds(filters);
          if (!cancelled) setIds(filteredIds);
          return;
        }

        // Sem filtros na URL: varredura completa do escopo do usuário.
        const BATCH = 1000;
        let all: { id: string }[] = [];
        let offset = 0;
        while (true) {
          let q = supabase
            .from('orders')
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(offset, offset + BATCH - 1);
          if (!isAdmin) q = q.eq('user_id', user.id);
          const { data, error } = await q;
          if (error || !data || data.length === 0) break;
          all = all.concat(data.map(d => ({ id: (d as any).id })));
          if (data.length < BATCH) break;
          offset += BATCH;
        }
        if (!cancelled) setIds(all.map(o => o.id));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id, isAdmin, role, filterKey]);

  return useMemo(() => {
    if (!currentId || ids.length === 0) {
      return { prevId: null, nextId: null, index: -1, total: ids.length, loading };
    }
    const idx = ids.indexOf(currentId);
    if (idx === -1) return { prevId: null, nextId: null, index: -1, total: ids.length, loading };
    return {
      prevId: idx > 0 ? ids[idx - 1] : null,
      nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
      index: idx,
      total: ids.length,
      loading,
    };
  }, [currentId, ids, loading]);
}
