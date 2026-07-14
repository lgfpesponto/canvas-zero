import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Comunicado {
  id: string;
  mensagem: string | null;
  expires_at: string | null;
  updated_at: string;
}

export default function ComunicadoBanner() {
  const { isLoggedIn } = useAuth();
  const [row, setRow] = useState<Comunicado | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    const fetchActive = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('system_announcements')
        .select('id, mensagem, expires_at, updated_at')
        .eq('tipo', 'comunicado')
        .eq('ativo', true)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      setRow(data && data[0] ? (data[0] as Comunicado) : null);
    };

    fetchActive();

    const channel = supabase
      .channel('system-announcements-comunicado')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_announcements' },
        () => fetchActive()
      )
      .subscribe();

    const timer = window.setInterval(fetchActive, 60_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(timer);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!row) return;
    const key = `${row.id}::${row.updated_at}`;
    const was = sessionStorage.getItem('comunicado_dismissed') === key;
    setDismissedKey(was ? key : null);
  }, [row?.id, row?.updated_at]);

  if (!isLoggedIn || !row || !row.mensagem) return null;

  const currentKey = `${row.id}::${row.updated_at}`;
  if (dismissedKey === currentKey) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('comunicado_dismissed', currentKey);
    setDismissedKey(currentKey);
  };

  return (
    <div className="bg-blue-500 text-white text-sm font-medium py-2 px-4 border-b border-black/10">
      <div className="container mx-auto flex items-center gap-3">
        <Info size={18} className="shrink-0" />
        <div className="flex-1 leading-snug whitespace-pre-wrap">{row.mensagem}</div>
        <button
          onClick={handleDismiss}
          aria-label="Dispensar comunicado"
          className="shrink-0 rounded p-1 hover:bg-black/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
