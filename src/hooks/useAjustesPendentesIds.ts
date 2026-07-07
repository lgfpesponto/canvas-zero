import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Retorna Set de order_ids que têm solicitação de ajuste PENDENTE.
 * Só busca para admin_master; caso contrário retorna Set vazio.
 * Recarrega a cada `refreshKey` mudar.
 */
export function useAjustesPendentesIds(refreshKey: unknown = null): Set<string> {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.role !== 'admin_master') { setIds(new Set()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('order_ajuste_solicitacoes')
        .select('order_id')
        .eq('status', 'pendente');
      if (cancelled) return;
      setIds(new Set(((data as any[]) || []).map(r => r.order_id)));
    })();
    return () => { cancelled = true; };
  }, [user?.role, refreshKey]);

  return ids;
}
