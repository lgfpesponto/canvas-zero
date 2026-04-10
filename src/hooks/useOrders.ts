import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import type { Order } from '@/contexts/AuthContext';
import { orderBarcodeValueLegacy } from '@/contexts/AuthContext';

export interface OrderFilters {
  searchQuery?: string;
  filterDate?: string;
  filterDateEnd?: string;
  filterStatus?: Set<string>;
  filterVendedor?: Set<string>;
  filterProduto?: Set<string>;
}

const PAGE_SIZE = 50;

export function useOrders(filters: OrderFilters, page: number, enabled = true) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  const fetchOrders = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);

    try {
      // Build main query
      let query = supabase.from('orders').select('*', { count: 'exact' });

      // Search filter
      if (filters.searchQuery) {
        query = query.or(`numero.ilike.%${filters.searchQuery}%,cliente.ilike.%${filters.searchQuery}%`);
      }

      // Date filters
      if (filters.filterDate) {
        query = query.gte('data_criacao', filters.filterDate);
      }
      if (filters.filterDateEnd) {
        query = query.lte('data_criacao', filters.filterDateEnd);
      }

      // Status filter
      if (filters.filterStatus && filters.filterStatus.size > 0) {
        query = query.in('status', [...filters.filterStatus]);
      }

      // Product filter
      if (filters.filterProduto && filters.filterProduto.size > 0) {
        const produtos = [...filters.filterProduto];
        const hasBota = produtos.includes('bota');
        const outros = produtos.filter(p => p !== 'bota');

        if (hasBota && outros.length > 0) {
          query = query.or(`tipo_extra.is.null,tipo_extra.in.(${outros.join(',')})`);
        } else if (hasBota && outros.length === 0) {
          query = query.is('tipo_extra', null);
        } else if (outros.length > 0) {
          query = query.in('tipo_extra', outros);
        }
      }

      // Vendedor filter (including Juliana logic)
      if (filters.filterVendedor && filters.filterVendedor.size > 0) {
        const vendedores = [...filters.filterVendedor];
        const orClauses = vendedores.map(v => `vendedor.eq.${v}`);
        // Also match Juliana's sub-clients
        vendedores.forEach(v => {
          orClauses.push(`and(vendedor.eq.Juliana Cristina Ribeiro,cliente.eq.${v})`);
        });
        query = query.or(orClauses.join(','));
      }

      // Pagination
      const start = (page - 1) * PAGE_SIZE;
      query = query
        .order('data_criacao', { ascending: false })
        .order('hora_criacao', { ascending: false })
        .range(start, start + PAGE_SIZE - 1);

      const { data, count: totalCount, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
        setCount(0);
        return;
      }

      setOrders((data || []).map(dbRowToOrder));
      setCount(totalCount || 0);

      // Fetch total value separately (same filters, no pagination)
      let valueQuery = supabase.from('orders').select('preco, quantidade');
      if (filters.searchQuery) {
        valueQuery = valueQuery.or(`numero.ilike.%${filters.searchQuery}%,cliente.ilike.%${filters.searchQuery}%`);
      }
      if (filters.filterDate) valueQuery = valueQuery.gte('data_criacao', filters.filterDate);
      if (filters.filterDateEnd) valueQuery = valueQuery.lte('data_criacao', filters.filterDateEnd);
      if (filters.filterStatus && filters.filterStatus.size > 0) {
        valueQuery = valueQuery.in('status', [...filters.filterStatus]);
      }
      if (filters.filterProduto && filters.filterProduto.size > 0) {
        const produtos = [...filters.filterProduto];
        const hasBota = produtos.includes('bota');
        const outros = produtos.filter(p => p !== 'bota');
        if (hasBota && outros.length > 0) {
          valueQuery = valueQuery.or(`tipo_extra.is.null,tipo_extra.in.(${outros.join(',')})`);
        } else if (hasBota && outros.length === 0) {
          valueQuery = valueQuery.is('tipo_extra', null);
        } else if (outros.length > 0) {
          valueQuery = valueQuery.in('tipo_extra', outros);
        }
      }
      if (filters.filterVendedor && filters.filterVendedor.size > 0) {
        const vendedores = [...filters.filterVendedor];
        const orClauses = vendedores.map(v => `vendedor.eq.${v}`);
        vendedores.forEach(v => {
          orClauses.push(`and(vendedor.eq.Juliana Cristina Ribeiro,cliente.eq.${v})`);
        });
        valueQuery = valueQuery.or(orClauses.join(','));
      }

      const { data: valueData } = await valueQuery;
      if (valueData) {
        setTotalValue(valueData.reduce((s, o) => s + Number(o.preco) * o.quantidade, 0));
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page, enabled]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return { orders, count, totalPages, loading, totalValue, refetch: fetchOrders, pageSize: PAGE_SIZE };
}

/** Fetch all orders matching filters in batches (for PDF export) */
export async function fetchAllFilteredOrders(filters: OrderFilters): Promise<Order[]> {
  const BATCH = 500;
  let allOrders: Order[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from('orders').select('*');

    if (filters.searchQuery) {
      query = query.or(`numero.ilike.%${filters.searchQuery}%,cliente.ilike.%${filters.searchQuery}%`);
    }
    if (filters.filterDate) query = query.gte('data_criacao', filters.filterDate);
    if (filters.filterDateEnd) query = query.lte('data_criacao', filters.filterDateEnd);
    if (filters.filterStatus && filters.filterStatus.size > 0) {
      query = query.in('status', [...filters.filterStatus]);
    }
    if (filters.filterProduto && filters.filterProduto.size > 0) {
      const produtos = [...filters.filterProduto];
      const hasBota = produtos.includes('bota');
      const outros = produtos.filter(p => p !== 'bota');
      if (hasBota && outros.length > 0) {
        query = query.or(`tipo_extra.is.null,tipo_extra.in.(${outros.join(',')})`);
      } else if (hasBota && outros.length === 0) {
        query = query.is('tipo_extra', null);
      } else if (outros.length > 0) {
        query = query.in('tipo_extra', outros);
      }
    }
    if (filters.filterVendedor && filters.filterVendedor.size > 0) {
      const vendedores = [...filters.filterVendedor];
      const orClauses = vendedores.map(v => `vendedor.eq.${v}`);
      vendedores.forEach(v => {
        orClauses.push(`and(vendedor.eq.Juliana Cristina Ribeiro,cliente.eq.${v})`);
      });
      query = query.or(orClauses.join(','));
    }

    query = query
      .order('data_criacao', { ascending: false })
      .order('hora_criacao', { ascending: false })
      .range(offset, offset + BATCH - 1);

    const { data } = await query;
    if (!data || data.length === 0) { hasMore = false; break; }
    allOrders = allOrders.concat(data.map(dbRowToOrder));
    if (data.length < BATCH) hasMore = false;
    offset += BATCH;
  }

  return allOrders;
}

/** Fetch orders by IDs (for selected export) */
export async function fetchOrdersByIds(ids: string[]): Promise<Order[]> {
  if (ids.length === 0) return [];
  const BATCH = 100;
  let allOrders: Order[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { data } = await supabase.from('orders').select('*').in('id', chunk);
    if (data) allOrders = allOrders.concat(data.map(dbRowToOrder));
  }
  return allOrders;
}

/** Fetch a single order by numero or barcode scan */
export async function fetchOrderByScan(code: string): Promise<Order | null> {
  const trimmed = code.trim();

  // Try by numero first
  const { data: byNumero } = await supabase.from('orders').select('*')
    .eq('numero', trimmed).maybeSingle();
  if (byNumero) return dbRowToOrder(byNumero);

  // Try by full UUID id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    const { data: byId } = await supabase.from('orders').select('*')
      .eq('id', trimmed).maybeSingle();
    if (byId) return dbRowToOrder(byId);
  }

  // Try by barcode hex (last 12 hex chars of UUID) using RPC to cast uuid to text
  const hexRegex = /^[0-9A-Fa-f]{12}$/;
  if (hexRegex.test(trimmed)) {
    const suffix = trimmed.toLowerCase();
    const { data: byHex } = await supabase.rpc('find_order_by_id_suffix', { suffix });
    if (byHex && byHex.length > 0) return dbRowToOrder(byHex[0]);
  }

  // Try legacy barcode (10 digits padded from numero)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    const realNumero = digits.replace(/^0+/, '');
    if (realNumero) {
      // First try exact match on purely numeric orders
      const { data: byExact } = await supabase.from('orders').select('*')
        .eq('numero', realNumero).maybeSingle();
      if (byExact) return dbRowToOrder(byExact);

      // Search candidates that contain the digits (covers alphanumeric orders like E0033715)
      const { data: candidates } = await supabase.from('orders').select('*')
        .ilike('numero', `%${realNumero}%`);
      if (candidates) {
        const match = candidates.find(o => orderBarcodeValueLegacy(o.numero) === trimmed);
        if (match) return dbRowToOrder(match);
      }
    }
  }

  return null;
}

/** Fetch distinct vendedores from all orders */
export async function fetchVendedores(): Promise<string[]> {
  const { data } = await supabase.from('orders').select('vendedor, cliente');
  if (!data) return [];
  const names = new Set<string>();
  data.forEach((o: any) => {
    if (o.vendedor) names.add(o.vendedor);
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
      names.add(o.cliente.trim());
    }
  });
  return [...names].sort();
}
