import { useEffect, useRef, useSyncExternalStore } from 'react';
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

/* ───── Store global de presença ───── */
let presenceSnapshot: PresencePayload[] = [];
const listeners = new Set<() => void>();

function setPresence(next: PresencePayload[]) {
  presenceSnapshot = next;
  listeners.forEach(l => l());
}

function subscribePresence(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getPresenceSnapshot() {
  return presenceSnapshot;
}

/** Hook pra ler o estado de presença atualizado em tempo real. */
export function usePresenceState(): PresencePayload[] {
  return useSyncExternalStore(subscribePresence, getPresenceSnapshot, getPresenceSnapshot);
}

/**
 * Hook que registra o usuário logado num canal de presença Realtime.
 */
export function usePresenceTracker() {
  const { user, isLoggedIn, role } = useAuth();
  const location = useLocation();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const joinedAtRef = useRef<string>(new Date().toISOString());
  const pageRef = useRef<string>(location.pathname);

  pageRef.current = location.pathname;

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setPresence([]);
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

    const refreshState = () => {
      const state = channel.presenceState() as Record<string, PresencePayload[]>;
      const map = new Map<string, PresencePayload>();
      Object.values(state).forEach(arr => arr.forEach(u => {
        const prev = map.get(u.user_id);
        if (!prev || new Date(u.last_seen).getTime() > new Date(prev.last_seen).getTime()) {
          map.set(u.user_id, u);
        }
      }));
      setPresence(Array.from(map.values()));
    };

    // IMPORTANTE: registrar listeners ANTES do subscribe
    channel
      .on('presence', { event: 'sync' }, refreshState)
      .on('presence', { event: 'join' }, refreshState)
      .on('presence', { event: 'leave' }, refreshState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(buildPayload());
        }
      });

    const heartbeat = window.setInterval(() => {
      if (channelRef.current) channelRef.current.track(buildPayload());
    }, 30000);

    const handleUnload = () => { try { channel.untrack(); } catch {} };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      try { channel.untrack(); } catch {}
      supabase.removeChannel(channel);
      channelRef.current = null;
      setPresence([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id, role]);

  // Atualiza presence quando muda de rota
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

export function PresenceTracker() {
  usePresenceTracker();
  return null;
}
