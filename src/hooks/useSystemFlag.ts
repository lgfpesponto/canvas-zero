/**
 * Hook para flags globais (tabela system_flags).
 * Lê valor inicial e escuta Realtime para refletir mudanças em todas as abas.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSystemFlag(key: string, fallback = true) {
  const [value, setValue] = useState<boolean>(fallback);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('system_flags')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (!error && data) setValue(!!data.value);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`system_flags:${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_flags', filter: `key=eq.${key}` },
        (payload) => {
          const v = (payload.new as any)?.value;
          if (typeof v === 'boolean') setValue(v);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [key, refresh]);

  const update = useCallback(async (next: boolean): Promise<{ ok: boolean; error?: string }> => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    const { error } = await supabase
      .from('system_flags')
      .upsert({ key, value: next, updated_at: new Date().toISOString(), updated_by: uid }, { onConflict: 'key' });
    if (error) return { ok: false, error: error.message };
    setValue(next);
    return { ok: true };
  }, [key]);

  return { value, loading, update, refresh };
}
