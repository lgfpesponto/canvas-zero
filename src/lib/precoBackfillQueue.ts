/**
 * Fila passiva de backfill do `orders.preco` (modelo v2).
 *
 * Toda tela que carrega pedidos chama `enqueue(orders, ...)`. A fila:
 *  - filtra os que ainda têm `precoMigradoV2 === false`
 *  - deduplica por id
 *  - processa em background com throttle de ~5 updates/segundo
 *  - usa o mesmo `computeTotalToSave` da auto-correção do detalhe
 *
 * Resultado: migração 100% automática conforme uso, sem clique nem cron.
 */
import { supabase } from '@/integrations/supabase/client';
import { computeTotalToSave, type FindFichaPrice, type GetByCategoria } from './recomputeOrderPrice';
import type { Order } from '@/contexts/AuthContext';

const THROTTLE_MS = 200; // 5/s
const MAX_QUEUE = 5000;

const pending = new Map<string, Order>();
const inFlight = new Set<string>();
let running = false;
let findFn: FindFichaPrice = () => undefined;
let getCatFn: GetByCategoria = () => [];

export function enqueueBackfill(
  orders: Order[],
  findFichaPrice: FindFichaPrice,
  getByCategoria: GetByCategoria,
) {
  // Mantém os lookups mais recentes (assumimos que carregaram).
  findFn = findFichaPrice;
  getCatFn = getByCategoria;

  for (const o of orders) {
    if (!o || o.precoMigradoV2) continue;
    if (o.precoCongelado) continue; // não recalcula preços travados
    if (inFlight.has(o.id) || pending.has(o.id)) continue;
    if (pending.size >= MAX_QUEUE) break;
    pending.set(o.id, o);
  }

  if (!running) {
    running = true;
    void worker();
  }
}

async function worker() {
  try {
    while (pending.size > 0) {
      const [id, order] = pending.entries().next().value as [string, Order];
      pending.delete(id);
      inFlight.add(id);

      try {
        const expected = computeTotalToSave(order, findFn, getCatFn);
        const before = Number(order.preco) || 0;
        const patch: any = { preco_migrado_v2: true };
        if (Math.abs(expected - before) >= 1) patch.preco = expected;

        const { error } = await supabase.from('orders').update(patch).eq('id', id);
        if (error) {
          console.warn('[precoBackfill] falha', order.numero, error.message);
        }
      } catch (e) {
        console.warn('[precoBackfill] erro inesperado', e);
      } finally {
        inFlight.delete(id);
      }

      await sleep(THROTTLE_MS);
    }
  } finally {
    running = false;
  }
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}
