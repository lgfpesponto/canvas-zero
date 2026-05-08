/**
 * Plug passivo de backfill: dispara a fila com os pedidos visíveis na tela atual.
 * Usa os mesmos hooks de preço que o detalhe usa.
 */
import { useEffect } from 'react';
import { enqueueBackfill } from '@/lib/precoBackfillQueue';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';
import { useCustomOptions } from '@/hooks/useCustomOptions';
import type { Order } from '@/contexts/AuthContext';

export function usePrecoBackfillBackground(orders: Order[] | Order | null | undefined) {
  const { findFichaPrice, loading: l1 } = useFichaVariacoesLookup();
  const { getByCategoria, loading: l2 } = useCustomOptions();

  useEffect(() => {
    if (l1 || l2) return;
    if (!orders) return;
    const list = Array.isArray(orders) ? orders : [orders];
    if (list.length === 0) return;
    const pending = list.filter(o => o && !o.precoMigradoV2);
    if (pending.length === 0) return;
    enqueueBackfill(pending, findFichaPrice, getByCategoria);
  }, [orders, l1, l2, findFichaPrice, getByCategoria]);
}
