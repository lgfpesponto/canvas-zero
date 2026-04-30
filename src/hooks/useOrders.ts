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
  /** Filtra pedidos cujo histórico contém a transição para qualquer destes status... */
  mudouParaStatus?: Set<string>;
  /** ...dentro do intervalo [mudouParaStatusDe, mudouParaStatusAte] (YYYY-MM-DD) */
  mudouParaStatusDe?: string;
  mudouParaStatusAte?: string;
  /** Filtro admin_master: 'sim' = só conferidos, 'nao' = só não conferidos */
  filterConferido?: 'sim' | 'nao';
}

/** Busca IDs via RPC quando há filtro "mudou para status". Retorna null se filtro inativo. */
async function fetchIdsMudouParaStatus(filters: OrderFilters): Promise<string[] | null> {
  if (!filters.mudouParaStatus || filters.mudouParaStatus.size === 0) return null;
  const de = filters.mudouParaStatusDe || filters.mudouParaStatusAte;
  const ate = filters.mudouParaStatusAte || filters.mudouParaStatusDe;
  if (!de || !ate) return null;
  const { data, error } = await supabase.rpc('find_orders_by_status_change', {
    _status: [...filters.mudouParaStatus],
    _de: de,
    _ate: ate,
  });
  if (error) {
    console.error('Erro find_orders_by_status_change:', error);
    return [];
  }
  return (data as any[] | null)?.map((r: any) => (typeof r === 'string' ? r : r.id)) ?? [];
}

const PAGE_SIZE = 50;

export function useOrders(filters: OrderFilters, page: number, enabled = true) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [totalProdutos, setTotalProdutos] = useState(0);

  const fetchOrders = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);

    try {
      // Filtro "mudou para status" (RPC) — restringe a um conjunto de IDs
      const idsMudou = await fetchIdsMudouParaStatus(filters);
      if (idsMudou !== null && idsMudou.length === 0) {
        setOrders([]); setCount(0); setTotalValue(0); setTotalProdutos(0);
        return;
      }

      // Build main query
      let query = supabase.from('orders').select('*', { count: 'exact' });
      if (idsMudou !== null) query = query.in('id', idsMudou);

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

      // Totais agregados via RPC server-side (sem limite de 1000 linhas)
      const { data: totals, error: totalsErr } = await supabase.rpc('get_orders_totals', {
        _search: filters.searchQuery || null,
        _date_from: filters.filterDate || null,
        _date_to: filters.filterDateEnd || null,
        _status: filters.filterStatus && filters.filterStatus.size > 0 ? [...filters.filterStatus] : null,
        _produtos: filters.filterProduto && filters.filterProduto.size > 0 ? [...filters.filterProduto] : null,
        _vendedores: filters.filterVendedor && filters.filterVendedor.size > 0 ? [...filters.filterVendedor] : null,
        _ids_mudou: idsMudou,
      });
      if (totalsErr) {
        console.error('Erro get_orders_totals:', totalsErr);
        setTotalValue(0);
        setTotalProdutos(0);
      } else if (totals && totals.length > 0) {
        const row: any = totals[0];
        setTotalValue(Number(row.valor_total) || 0);
        setTotalProdutos(Number(row.total_produtos) || 0);
        // Reforça count com o número exato vindo da RPC (mesma lógica de filtros)
        setCount(Number(row.total_pedidos) || (totalCount || 0));
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page, enabled]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return { orders, count, totalPages, loading, totalValue, totalProdutos, refetch: fetchOrders, pageSize: PAGE_SIZE };
}

/** Fetch all orders matching filters in batches (for PDF export) */
export async function fetchAllFilteredOrders(filters: OrderFilters): Promise<Order[]> {
  const BATCH = 500;
  let allOrders: Order[] = [];
  let offset = 0;
  let hasMore = true;

  // Pré-resolve filtro "mudou para status" (mesmo conjunto de IDs entre batches)
  const idsMudou = await fetchIdsMudouParaStatus(filters);
  if (idsMudou !== null && idsMudou.length === 0) return [];

  while (hasMore) {
    let query = supabase.from('orders').select('*');
    if (idsMudou !== null) query = query.in('id', idsMudou);

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

/** Fetch only IDs of all orders matching filters in batches (lightweight, for "select all across pages") */
export async function fetchAllFilteredOrderIds(filters: OrderFilters): Promise<string[]> {
  const BATCH = 1000;
  let allIds: string[] = [];
  let offset = 0;
  let hasMore = true;

  const idsMudou = await fetchIdsMudouParaStatus(filters);
  if (idsMudou !== null && idsMudou.length === 0) return [];

  while (hasMore) {
    let query = supabase.from('orders').select('id');
    if (idsMudou !== null) query = query.in('id', idsMudou);

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
    allIds = allIds.concat(data.map((r: any) => r.id));
    if (data.length < BATCH) hasMore = false;
    offset += BATCH;
  }

  return allIds;
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
  const names = new Set<string>();
  const BATCH = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('orders')
      .select('vendedor, cliente')
      .range(offset, offset + BATCH - 1);

    if (!data || data.length === 0) { hasMore = false; break; }

    data.forEach((o: any) => {
      if (o.vendedor) names.add(o.vendedor);
      if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
        names.add(o.cliente.trim());
      }
    });

    if (data.length < BATCH) hasMore = false;
    offset += BATCH;
  }

  return [...names].sort();
}
