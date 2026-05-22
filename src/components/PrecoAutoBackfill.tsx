/**
 * Drenador global silencioso da fila de backfill de preços (modelo v2).
 *
 * Roda enquanto qualquer usuário (não-bordado) estiver logado: busca direto no
 * banco lotes de pedidos com `preco_migrado_v2 = false` e enfileira na
 * `precoBackfillQueue`. Quando a fila esvazia, busca o próximo lote.
 * Pausa quando a aba fica oculta e retoma no `visibilitychange`.
 *
 * Sem UI, sem toast — 100% background.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import { enqueueBackfill } from '@/lib/precoBackfillQueue';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';
import { useCustomOptions } from '@/hooks/useCustomOptions';
import { useAuth } from '@/contexts/AuthContext';

const BATCH = 200;
const IDLE_BETWEEN_BATCHES_MS = 2000;
const RETRY_AFTER_ERROR_MS = 30_000;

export default function PrecoAutoBackfill() {
  const { user, role } = useAuth();
  const { findFichaPrice, loading: l1 } = useFichaVariacoesLookup();
  const { getByCategoria, loading: l2 } = useCustomOptions();
  const stopRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (role === 'bordado') return;
    if (l1 || l2) return;

    stopRef.current = false;
    let timer: any = null;

    const runOnce = async () => {
      if (stopRef.current) return;
      // Pausa em aba oculta — retoma no listener.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('preco_migrado_v2', false)
          .order('created_at', { ascending: true })
          .limit(BATCH);

        if (error) {
          console.warn('[PrecoAutoBackfill] erro buscando lote', error.message);
          timer = setTimeout(runOnce, RETRY_AFTER_ERROR_MS);
          return;
        }

        if (!data || data.length === 0) {
          // Acabou. Re-checa daqui a um tempão (caso novos pedidos antigos surjam).
          timer = setTimeout(runOnce, 5 * 60_000);
          return;
        }

        const orders = data.map(dbRowToOrder);
        enqueueBackfill(orders, findFichaPrice, getByCategoria);

        // Espera a fila digerir (200ms × N) antes de buscar mais.
        const waitMs = Math.max(IDLE_BETWEEN_BATCHES_MS, orders.length * 220);
        timer = setTimeout(runOnce, waitMs);
      } catch (e) {
        console.warn('[PrecoAutoBackfill] exceção', e);
        timer = setTimeout(runOnce, RETRY_AFTER_ERROR_MS);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !stopRef.current) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(runOnce, 500);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Pequeno delay inicial para não competir com o boot da app.
    timer = setTimeout(runOnce, 5000);

    return () => {
      stopRef.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, role, l1, l2, findFichaPrice, getByCategoria]);

  return null;
}
