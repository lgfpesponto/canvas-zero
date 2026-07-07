import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Devolve todos os pedidos ERRO vinculados ao pedido original (se houver).
 * Um pedido é considerado ERRO se possui `erro_de_pedido_id` = id do original.
 */
export function useLinkedErro(originalId: string | undefined | null) {
  const [linked, setLinked] = useState<{ id: string; numero: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    if (!originalId) { setLinked([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('id, numero')
      .eq('erro_de_pedido_id', originalId)
      .order('created_at', { ascending: true });
    setLinked((data || []).map((r: any) => ({ id: r.id, numero: r.numero })));
    setLoading(false);
  };

  useEffect(() => { refetch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [originalId]);

  return { linked, loading, refetch };
}
