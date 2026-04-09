/** Generic hook for fetching orders with custom filters — used by dashboards, SpecializedReports, etc. */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import type { Order } from '@/contexts/AuthContext';

interface QueryOptions {
  /** Filter by status list */
  statuses?: string[];
  /** Filter by tipo_extra (null = bota) */
  tipoExtra?: string | null;
  /** Only botas (tipo_extra IS NULL) */
  onlyBotas?: boolean;
  /** Filter by solado (ilike) */
  soladoValues?: string[];
  /** Filter by cor_vira (ilike) */
  corViraValues?: string[];
  /** Limit results */
  limit?: number;
  /** Enable/disable */
  enabled?: boolean;
}

export function useOrdersQuery(options: QueryOptions) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (options.enabled === false) return;
    setLoading(true);
    try {
      const BATCH = 500;
      let allData: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase.from('orders').select('*');

        if (options.statuses && options.statuses.length > 0) {
          query = query.in('status', options.statuses);
        }

        if (options.onlyBotas) {
          query = query.is('tipo_extra', null);
        } else if (options.tipoExtra !== undefined) {
          if (options.tipoExtra === null) {
            query = query.is('tipo_extra', null);
          } else {
            query = query.eq('tipo_extra', options.tipoExtra);
          }
        }

        if (options.soladoValues && options.soladoValues.length > 0) {
          const orClauses = options.soladoValues.map(v => `solado.ilike.${v}`).join(',');
          query = query.or(orClauses);
        }

        if (options.corViraValues && options.corViraValues.length > 0) {
          const orClauses = options.corViraValues.map(v => `cor_vira.ilike.${v}`).join(',');
          query = query.or(orClauses);
        }

        const batchLimit = options.limit ? Math.min(BATCH, options.limit - allData.length) : BATCH;
        query = query.order('created_at', { ascending: false }).range(offset, offset + batchLimit - 1);

        const { data } = await query;
        if (!data || data.length === 0) { hasMore = false; break; }
        allData = allData.concat(data);
        if (data.length < batchLimit) hasMore = false;
        if (options.limit && allData.length >= options.limit) hasMore = false;
        offset += BATCH;
      }

      setOrders(allData.map(dbRowToOrder));
    } finally {
      setLoading(false);
    }
  }, [options.statuses?.join(','), options.tipoExtra, options.onlyBotas, options.soladoValues?.join(','), options.corViraValues?.join(','), options.limit, options.enabled]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}
