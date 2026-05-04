import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LinkedBoot {
  status?: string;
  historico?: any[];
}

// Cache simples em memória para evitar consultas duplicadas em listas.
const cache = new Map<string, LinkedBoot | null>();
const inflight = new Map<string, Promise<LinkedBoot | null>>();
const subscribers = new Map<string, Set<(b: LinkedBoot | null) => void>>();

function notify(numero: string, value: LinkedBoot | null) {
  cache.set(numero, value);
  subscribers.get(numero)?.forEach(fn => fn(value));
}

async function fetchBoot(numero: string): Promise<LinkedBoot | null> {
  if (cache.has(numero)) return cache.get(numero) ?? null;
  const existing = inflight.get(numero);
  if (existing) return existing;
  const promise = (async () => {
    const { data } = await supabase
      .from('orders')
      .select('status, historico')
      .eq('numero', numero)
      .is('tipo_extra', null)
      .maybeSingle();
    const value = data ? { status: data.status, historico: data.historico as any[] } : null;
    notify(numero, value);
    inflight.delete(numero);
    return value;
  })();
  inflight.set(numero, promise);
  return promise;
}

/**
 * Busca a bota encomendada vinculada a um pedido de Carimbo a Fogo (vinculadoBota = true).
 * Retorna null se o pedido não tem vínculo, ou os dados (status + histórico) da bota encontrada.
 * Usa cache em memória para reaproveitar consultas em listagens.
 */
export function useLinkedBoot(order: any | null | undefined): LinkedBoot | null {
  const det = order?.extraDetalhes || {};
  const isCarimboVinculado = order?.tipoExtra === 'carimbo_fogo' && det.vinculadoBota === true;
  const numeroBota: string = (det.numeroPedidoBotaVinculo || '').trim();
  const key = isCarimboVinculado && numeroBota ? numeroBota : '';

  const [boot, setBoot] = useState<LinkedBoot | null>(() => (key ? cache.get(key) ?? null : null));

  useEffect(() => {
    if (!key) { setBoot(null); return; }
    let cancel = false;
    if (cache.has(key)) {
      setBoot(cache.get(key) ?? null);
    } else {
      fetchBoot(key).then(v => { if (!cancel) setBoot(v); });
    }
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    const set = subscribers.get(key)!;
    const handler = (v: LinkedBoot | null) => { if (!cancel) setBoot(v); };
    set.add(handler);
    return () => { cancel = true; set.delete(handler); };
  }, [key]);

  return boot;
}
