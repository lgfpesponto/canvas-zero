import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const PRESENCE_CHANNEL = 'portal-presence';

export interface PresencePayload {
  user_id: string;
  nome_completo: string;
  nome_usuario: string;
  role: string;
  page: string;
  joined_at: string;
  last_seen: string;
}

/**
 * Hook que registra o usuário logado num canal de presença Realtime.
 * - Atualiza a página (rota atual) sempre que ela muda.
 * - Envia heartbeat a cada 30s pra manter `last_seen` atualizado.
 * - Sai do canal automaticamente ao deslogar / fechar a aba.
 */
export function usePresenceTracker() {
  const { user, isLoggedIn, role } = useAuth();
  const location = useLocation();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const joinedAtRef = useRef<string>(new Date().toISOString());
  const pageRef = useRef<string>(location.pathname);

  // Mantém referência da página atual sem re-disparar o efeito de criação
  pageRef.current = location.pathname;

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      // Garantir limpeza se o usuário deslogar
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    joinedAtRef.current = new Date().toISOString();

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    const buildPayload = (): PresencePayload => ({
      user_id: user.id,
      nome_completo: user.nomeCompleto || user.nomeUsuario || 'Usuário',
      nome_usuario: user.nomeUsuario || '',
      role: role || user.role || 'user',
      page: pageRef.current,
      joined_at: joinedAtRef.current,
      last_seen: new Date().toISOString(),
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(buildPayload());
      }
    });

    // Heartbeat a cada 30s
    const heartbeat = window.setInterval(() => {
      if (channelRef.current) {
        channelRef.current.track(buildPayload());
      }
    }, 30000);

    // Limpeza ao fechar aba
    const handleUnload = () => {
      try {
        channel.untrack();
      } catch {}
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      try {
        channel.untrack();
      } catch {}
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id, role]);

  // Atualiza presence quando muda de rota (sem recriar canal)
  useEffect(() => {
    if (!channelRef.current || !isLoggedIn || !user?.id) return;
    channelRef.current.track({
      user_id: user.id,
      nome_completo: user.nomeCompleto || user.nomeUsuario || 'Usuário',
      nome_usuario: user.nomeUsuario || '',
      role: role || user.role || 'user',
      page: location.pathname,
      joined_at: joinedAtRef.current,
      last_seen: new Date().toISOString(),
    } as PresencePayload);
  }, [location.pathname, isLoggedIn, user?.id, user?.nomeCompleto, user?.nomeUsuario, role, user?.role]);
}

/** Componente helper pra montar o tracker dentro do AuthProvider + Router. */
export function PresenceTracker() {
  usePresenceTracker();
  return null;
}
