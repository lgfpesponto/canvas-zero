import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notificacao {
  id: string;
  order_id: string;
  vendedor: string;
  numero: string;
  descricao: string;
  status_no_momento: string;
  lida: boolean;
  lida_em: string | null;
  created_at: string;
}

export function useNotificacoes() {
  const { user, isAdmin, isLoggedIn } = useAuth();
  const vendedorName = user?.nomeCompleto || '';
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const reloadTimer = useRef<number | null>(null);

  const enabled = isLoggedIn && !isAdmin && !!vendedorName;

  const reload = useCallback(async () => {
    if (!enabled) { setNotificacoes([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('order_notificacoes')
      .select('*')
      .eq('vendedor', vendedorName)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setNotificacoes(data as Notificacao[]);
    setLoading(false);
  }, [enabled, vendedorName]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => { reload(); }, 300);
  }, [reload]);

  useEffect(() => {
    if (!enabled) { setNotificacoes([]); return; }
    reload();

    const channel = supabase
      .channel(`notif_vendedor_${vendedorName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_notificacoes',
          filter: `vendedor=eq.${vendedorName}`,
        },
        () => scheduleReload(),
      )
      .subscribe();

    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [enabled, vendedorName, reload, scheduleReload]);

  const marcarLida = useCallback(async (id: string) => {
    // Otimista
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    await supabase.rpc('marcar_notificacao_lida', { _id: id });
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    await supabase.rpc('marcar_todas_notificacoes_lidas');
  }, []);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas, reload };
}
