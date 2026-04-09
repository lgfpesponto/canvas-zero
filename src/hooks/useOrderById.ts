import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import type { Order } from '@/contexts/AuthContext';

export function useOrderById(id: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) { setOrder(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (err) {
      console.error('Error fetching order:', err);
      setError(err.message);
      setOrder(null);
    } else if (data) {
      setOrder(dbRowToOrder(data));
    } else {
      setOrder(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
}
