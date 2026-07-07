import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Devolve o pedido ERRO vinculado ao pedido original (se houver).
 * Um pedido é considerado ERRO se possui `erro_de_pedido_id` = id do original.
 */
export function useLinkedErro(originalId: string | undefined | null) {
  const [linked, setLinked] = useState<{ id: string; numero: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    if (!originalId) { setLinked(null); return; }
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, numero')
      .eq('erro_de_pedido_id', originalId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    setLinked(data ? { id: data.id, numero: data.numero } : null);
    setLoading(false);
  };

  useEffect(() => { refetch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [originalId]);

  return { linked, loading, refetch };
}
