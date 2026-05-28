/**
 * Atualização direta de preço de variações/opções (sem congelamento).
 *
 * HISTÓRICO: Antes este módulo abria um diálogo perguntando o escopo temporal
 * (desde início / data específica / futuro) e chamava a RPC `aplicar_mudanca_preco`
 * que CONGELAVA pedidos antigos (preco_congelado=true) para preservar histórico.
 *
 * REGRA ATUAL: o preço de um pedido é SEMPRE a composição atual.
 * Ao trocar o preço de uma variação/opção fazemos UPDATE direto na tabela e o
 * reconciliador recalcula todos os pedidos afetados na próxima passagem.
 * Sem diálogo, sem congelamento.
 */
import { supabase } from '@/integrations/supabase/client';

export type PriceChangeTarget =
  | { tipo: 'ficha_variacao'; target_id: string; label: string; preco_antes: number; preco_depois: number }
  | { tipo: 'custom_option'; target_id: string; label: string; preco_antes: number; preco_depois: number };

export interface PriceChangeResult {
  mudanca_id: string;
  pedidos_ajustados: number;
  valor_total_compensado?: number;
  status: 'aplicada' | 'pendente';
  modo?: 'congelar' | 'recalcular';
}

// Mantido por compat — não usado mais.
export function registerPriceChangeHandler(_fn: unknown) {
  /* noop */
}

export async function requestPriceChange(target: PriceChangeTarget): Promise<PriceChangeResult | null> {
  if (Number(target.preco_antes) === Number(target.preco_depois)) {
    return { mudanca_id: '', pedidos_ajustados: 0, status: 'aplicada', modo: 'recalcular' };
  }
  const table = target.tipo === 'custom_option' ? 'custom_options' : 'ficha_variacoes';
  const column = target.tipo === 'custom_option' ? 'preco' : 'preco_adicional';
  const { error } = await supabase
    .from(table)
    .update({ [column]: target.preco_depois })
    .eq('id', target.target_id);
  if (error) {
    console.error('requestPriceChange UPDATE falhou', error);
    return null;
  }
  return { mudanca_id: '', pedidos_ajustados: 0, status: 'aplicada', modo: 'recalcular' };
}
