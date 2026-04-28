import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  scheduled_at: string;
  mensagem: string | null;
  ativo: boolean;
  updated_at: string;
}

const TOLERANCIA_POS_MIN = 30;
const JANELA_FUTURA_HORAS = 48;

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `hoje às ${hh}`;
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `amanhã às ${hh}`;
  return `${d.toLocaleDateString('pt-BR')} às ${hh}`;
}

function countdownText(iso: string): { text: string; criticalSoon: boolean; passed: boolean } {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) {
    const passedMin = Math.floor(-diffMs / 60000);
    return { text: `publicação iniciada há ${passedMin}min`, criticalSoon: true, passed: true };
  }
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const text = h > 0 ? `faltam ${h}h ${m}min` : `faltam ${m}min`;
  return { text, criticalSoon: totalMin <= 15, passed: false };
}

export default function DeployNoticeBanner() {
  const { isLoggedIn } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [tick, setTick] = useState(0);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Carrega o aviso ativo mais recente dentro da janela visível
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    const fetchActive = async () => {
      const nowIso = new Date().toISOString();
      const ateIso = new Date(Date.now() + JANELA_FUTURA_HORAS * 3600 * 1000).toISOString();
      const desdeIso = new Date(Date.now() - TOLERANCIA_POS_MIN * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('system_announcements')
        .select('id, scheduled_at, mensagem, ativo, updated_at')
        .eq('ativo', true)
        .gte('scheduled_at', desdeIso)
        .lte('scheduled_at', ateIso)
        .order('scheduled_at', { ascending: true })
        .limit(1);
      if (cancelled) return;
      setAnnouncement(data && data[0] ? (data[0] as Announcement) : null);
      // ignora warning para data atual silenciosamente
      void nowIso;
    };

    fetchActive();

    // Realtime: qualquer mudança na tabela refaz o fetch
    const channel = supabase
      .channel('system-announcements-banner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_announcements' },
        () => fetchActive()
      )
      .subscribe();

    // Refetch a cada 60s pra cobrir transição da janela visível
    const refetchTimer = window.setInterval(fetchActive, 60_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(refetchTimer);
    };
  }, [isLoggedIn]);

  // Tick a cada 30s para atualizar contagem regressiva
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Quando muda o aviso (id ou updated_at), reseta dismiss
  useEffect(() => {
    if (!announcement) return;
    const key = `${announcement.id}::${announcement.updated_at}`;
    const wasDismissed = sessionStorage.getItem('deploy_notice_dismissed') === key;
    setDismissedKey(wasDismissed ? key : null);
  }, [announcement?.id, announcement?.updated_at]);

  const view = useMemo(() => {
    if (!announcement) return null;
    const cd = countdownText(announcement.scheduled_at);
    // Se passou da tolerância, esconde
    const diffMin = (Date.now() - new Date(announcement.scheduled_at).getTime()) / 60000;
    if (diffMin > TOLERANCIA_POS_MIN) return null;
    return cd;
    // tick força recálculo a cada 30s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement, tick]);

  if (!isLoggedIn || !announcement || !view) return null;

  const currentKey = `${announcement.id}::${announcement.updated_at}`;
  if (dismissedKey === currentKey) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('deploy_notice_dismissed', currentKey);
    setDismissedKey(currentKey);
  };

  const critical = view.criticalSoon;
  const baseClasses = critical
    ? 'bg-destructive text-destructive-foreground animate-pulse'
    : 'bg-amber-400 text-amber-950';

  const mensagemFinal =
    announcement.mensagem && announcement.mensagem.trim().length > 0
      ? announcement.mensagem.trim()
      : 'Uma nova versão do sistema será publicada. Salve seu trabalho — pedidos não salvos podem ser perdidos.';

  return (
    <div className={`${baseClasses} text-sm font-semibold py-2 px-4 border-b border-black/10`}>
      <div className="container mx-auto flex items-center gap-3">
        <AlertTriangle size={18} className="shrink-0" />
        <div className="flex-1 leading-snug">
          <span className="font-bold">Atenção:</span> {mensagemFinal}{' '}
          <span className="font-bold underline decoration-dotted underline-offset-2">
            {formatScheduled(announcement.scheduled_at)}
          </span>{' '}
          <span className="opacity-80">({view.text})</span>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dispensar aviso"
          className="shrink-0 rounded p-1 hover:bg-black/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
