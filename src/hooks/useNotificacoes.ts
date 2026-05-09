import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notificacao {
  id: string;
  tipo: 'pedido' | 'comprovante';
  // Pedido
  order_id?: string;
  numero?: string;
  status_no_momento?: string;
  // Comprovante
  comprovante_id?: string;
  subtipo?: 'aprovado' | 'reprovado';
  // Comum
  vendedor: string;
  descricao: string;
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
    const [pedidoRes, comprovRes] = await Promise.all([
      supabase
        .from('order_notificacoes')
        .select('*')
        .eq('vendedor', vendedorName)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('comprovante_notificacoes' as any)
        .select('*')
        .eq('vendedor', vendedorName)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const pedidos: Notificacao[] = !pedidoRes.error && pedidoRes.data
      ? (pedidoRes.data as any[]).map(n => ({
          id: n.id,
          tipo: 'pedido' as const,
          order_id: n.order_id,
          numero: n.numero,
          status_no_momento: n.status_no_momento,
          vendedor: n.vendedor,
          descricao: n.descricao,
          lida: n.lida,
          lida_em: n.lida_em,
          created_at: n.created_at,
        }))
      : [];

    const comprov: Notificacao[] = !comprovRes.error && comprovRes.data
      ? (comprovRes.data as any[]).map(n => ({
          id: n.id,
          tipo: 'comprovante' as const,
          comprovante_id: n.comprovante_id,
          subtipo: n.tipo,
          vendedor: n.vendedor,
          descricao: n.descricao,
          lida: n.lida,
          lida_em: n.lida_em,
          created_at: n.created_at,
        }))
      : [];

    const all = [...pedidos, ...comprov].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setNotificacoes(all);
    setLoading(false);
  }, [enabled, vendedorName]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => { reload(); }, 300);
  }, [reload]);

  useEffect(() => {
    if (!enabled) { setNotificacoes([]); return; }
    reload();

    const safeName = vendedorName.replace(/[^a-zA-Z0-9_]/g, '_');
    const channelName = `notif_vendedor_${safeName}_${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase.channel(channelName);
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_notificacoes', filter: `vendedor=eq.${vendedorName}` },
        () => scheduleReload(),
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'comprovante_notificacoes', filter: `vendedor=eq.${vendedorName}` },
        () => scheduleReload(),
      )
      .subscribe();

    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [enabled, vendedorName, reload, scheduleReload]);

  const marcarLida = useCallback(async (id: string) => {
    const target = notificacoes.find(n => n.id === id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    if (target?.tipo === 'comprovante') {
      await supabase.rpc('marcar_comprovante_notificacao_lida' as any, { _id: id });
    } else {
      await supabase.rpc('marcar_notificacao_lida', { _id: id });
    }
  }, [notificacoes]);

  const marcarTodasLidas = useCallback(async () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    await Promise.all([
      supabase.rpc('marcar_todas_notificacoes_lidas'),
      supabase.rpc('marcar_todas_comprovante_notificacoes_lidas' as any),
    ]);
  }, []);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas, reload };
}
