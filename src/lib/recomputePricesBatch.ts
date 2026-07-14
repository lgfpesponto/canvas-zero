/**
 * Recomputa o preço final de uma lista de pedidos (em lotes paralelos) e
 * grava no banco quando diverge do preço armazenado.
 *
 * Usado antes de gerar PDFs financeiros (Cobrança, Expedição, Extras/Cintos)
 * para garantir que o PDF saia com os preços canônicos atualizados —
 * sem depender da fila passiva (precoBackfillQueue).
 *
 * Mutates each Order in place setting `preco` to the recomputed value
 * (so subsequent reads — including PDF generation — see the fresh value).
 */
import type { Order } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  computeTotalToSave,
  type FindFichaPrice,
  type GetByCategoria,
} from '@/lib/recomputeOrderPrice';
import { loadSnapshotIndex, buildFindFichaPriceForOrder } from '@/hooks/useFichaPriceForOrder';

const CHUNK = 10;

export interface RecomputeProgress {
  done: number;
  total: number;
  updated: number;
}

export async function recomputePricesBatch(
  orders: Order[],
  findFichaPrice: FindFichaPrice,
  getByCategoria: GetByCategoria,
  onProgress?: (p: RecomputeProgress) => void,
): Promise<{ updated: number; total: number }> {
  if (!orders || orders.length === 0) return { updated: 0, total: 0 };

  let done = 0;
  let updated = 0;

  const processOne = async (o: Order) => {
    try {
      const target = computeTotalToSave(o, findFichaPrice, getByCategoria);
      const current = Number(o.preco) || 0;
      const diff = Math.abs(target - current);
      // Atualiza se mudou OU se ainda não foi migrado (garante flag = true).
      if (diff > 0.005 || !o.precoMigradoV2) {
        const { error } = await supabase
          .from('orders')
          .update({ preco: target, preco_migrado_v2: true })
          .eq('id', o.id);
        if (!error) {
          (o as any).preco = target;
          (o as any).precoMigradoV2 = true;
          if (diff > 0.005) updated++;
        }
      }
    } catch (e) {
      // Silencioso: se falhar, mantém preço antigo e segue.
      console.warn('recomputePricesBatch: falha em pedido', o.id, e);
    } finally {
      done++;
      onProgress?.({ done, total: orders.length, updated });
    }
  };

  for (let i = 0; i < orders.length; i += CHUNK) {
    const chunk = orders.slice(i, i + CHUNK);
    await Promise.all(chunk.map(processOne));
  }

  return { updated, total: orders.length };
}
