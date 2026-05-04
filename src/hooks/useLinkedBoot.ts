import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LinkedBoot {
  status?: string;
  historico?: any[];
}

/**
 * Busca a bota encomendada vinculada a um pedido de Carimbo a Fogo (vinculadoBota = true).
 * Retorna null se o pedido não tem vínculo, ou os dados (status + histórico) da bota encontrada.
 * Usado para calcular o prazo do carimbo de forma dependente.
 */
export function useLinkedBoot(order: any | null | undefined): LinkedBoot | null {
  const [boot, setBoot] = useState<LinkedBoot | null>(null);

  const det = order?.extraDetalhes || {};
  const isCarimboVinculado = order?.tipoExtra === 'carimbo_fogo' && det.vinculadoBota === true;
  const numeroBota: string = (det.numeroPedidoBotaVinculo || '').trim();

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!isCarimboVinculado || !numeroBota) {
        setBoot(null);
        return;
      }
      const { data } = await supabase
        .from('orders')
        .select('status, historico')
        .eq('numero', numeroBota)
        .is('tipo_extra', null)
        .maybeSingle();
      if (!cancel) setBoot(data ? { status: data.status, historico: data.historico as any[] } : null);
    })();
    return () => { cancel = true; };
  }, [isCarimboVinculado, numeroBota]);

  return boot;
}
