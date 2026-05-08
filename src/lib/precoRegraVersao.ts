/**
 * Cache leve da versão atual da régua de preço (system_counters.preco_regra_versao).
 *
 * Toda vez que um pedido é salvo (criação/edição) o frontend grava
 * `preco_regra_versao = <versão atual>` junto com o `preco`, marcando que
 * aquele cálculo foi feito sob a régua vigente. Quando o admin muda uma
 * regra global (ficha_variacoes / custom_options), um trigger SQL bumpa a
 * versão e zera a coluna em todos os pedidos — a edge function reconcilia.
 */
import { supabase } from '@/integrations/supabase/client';

let cached: { value: number; ts: number } | null = null;
let inflight: Promise<number> | null = null;
const TTL_MS = 5 * 60_000;

export async function getCurrentPrecoRegraVersao(): Promise<number> {
  const now = Date.now();
  if (cached && now - cached.ts < TTL_MS) return cached.value;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_preco_regra_versao');
      if (error) throw error;
      const v = Number(data) || 1;
      cached = { value: v, ts: Date.now() };
      return v;
    } catch (e) {
      console.warn('[precoRegraVersao] erro', e);
      return cached?.value ?? 1;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Força refetch (após admin salvar nova régua, por exemplo). */
export function invalidatePrecoRegraVersaoCache() { cached = null; }
