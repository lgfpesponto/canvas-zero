/**
 * Reconciliador de preços orientado a evento.
 *
 * Substitui o antigo PrecoAutoBackfill (drenador contínuo no cliente).
 * Aqui só fazemos UMA chamada à edge function `reconciliar-precos` quando
 * o usuário loga — ela roda no servidor, processa um lote de pedidos com
 * `preco_regra_versao` desatualizada, e responde quantos faltam. Se ainda
 * sobrou, chamamos de novo (até esvaziar). Sem polling, sem fila local.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { invalidatePrecoRegraVersaoCache } from '@/lib/precoRegraVersao';

const MAX_BATCHES_PER_SESSION = 20; // safety: até 10k pedidos por sessão

export default function PrecoReconciler() {
  const { user, role } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || role === 'bordado') return;
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    let timer: any = null;

    const runBatch = async (n: number): Promise<void> => {
      if (cancelled || n >= MAX_BATCHES_PER_SESSION) return;
      try {
        const { data, error } = await supabase.functions.invoke('reconciliar-precos', {
          body: { batch_size: 500 },
        });
        if (error) {
          console.warn('[PrecoReconciler] edge erro', error.message);
          return;
        }
        invalidatePrecoRegraVersaoCache();
        const restantes = Number(data?.pendentes_restantes) || 0;
        if (restantes > 0 && !cancelled) {
          timer = setTimeout(() => runBatch(n + 1), 1500);
        }
      } catch (e) {
        console.warn('[PrecoReconciler] exceção', e);
      }
    };

    // Pequeno delay para não competir com o boot
    timer = setTimeout(() => runBatch(0), 8000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user, role]);

  return null;
}
