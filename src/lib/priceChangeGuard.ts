/**
 * Guard global para alterações de preço de variações/opções.
 *
 * Quando algum hook (useUpdateVariacao, updateOption de custom_options, etc.)
 * detecta que o preço de um item já existente mudou, chama `requestPriceChange`.
 * O componente <PriceChangeDialog /> mostra um modal perguntando o ESCOPO
 * temporal (desde o início / data específica / futuro) e, ao confirmar,
 * chama a RPC `aplicar_mudanca_preco` que:
 *   - cria a regra em `preco_mudancas`
 *   - congela o preço dos pedidos elegíveis (preco_congelado=true) e registra
 *     ajuste em extra_detalhes.ajustes_retroativos
 *   - atualiza o preço no banco
 *
 * O hook que chamou NÃO deve fazer o UPDATE direto — a RPC cuida disso.
 */

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

type Requester = (target: PriceChangeTarget) => Promise<PriceChangeResult | null>;

let handler: Requester | null = null;

export function registerPriceChangeHandler(fn: Requester | null) {
  handler = fn;
}

/**
 * Abre o diálogo. Retorna null se o usuário cancelou (NÃO aplicar a mudança).
 * Retorna PriceChangeResult se aplicou (o preço já foi atualizado pela RPC,
 * o chamador NÃO deve fazer UPDATE direto).
 */
export async function requestPriceChange(target: PriceChangeTarget): Promise<PriceChangeResult | null> {
  if (!handler) {
    console.warn('priceChangeGuard: handler não registrado, ignorando mudança de preço');
    return null;
  }
  // Sem mudança real: pula
  if (Number(target.preco_antes) === Number(target.preco_depois)) {
    return { mudanca_id: '', pedidos_ajustados: 0, status: 'aplicada' };
  }
  return handler(target);
}
