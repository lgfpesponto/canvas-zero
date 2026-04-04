import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DUPLICATE_MSG = 'Este número de pedido já existe no sistema. Não é permitido criar pedidos com números duplicados. Por favor, utilize outro número de pedido.';

export { DUPLICATE_MSG };

export function useCheckDuplicateOrder(numero: string, excludeId?: string) {
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const trimmed = numero.trim();
    if (!trimmed) {
      setIsDuplicate(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        let query = supabase.from('orders').select('id').eq('numero', trimmed);
        if (excludeId) query = query.neq('id', excludeId);
        const { data } = await query.maybeSingle();
        setIsDuplicate(!!data);
      } catch {
        setIsDuplicate(false);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timerRef.current);
  }, [numero, excludeId]);

  return { isDuplicate, checking };
}
