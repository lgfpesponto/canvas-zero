/** Pedido originado do Estoque (bota pronta entrega comprada do estoque). */
export function isOrderEstoque(order: any): boolean {
  if (!order) return false;
  const det = (order.extraDetalhes || order.extra_detalhes || {}) as Record<string, any>;
  if (det.origem_estoque === true || det.origem_estoque === 'true') return true;
  if (order.estoqueProdutoId || order.estoque_produto_id) return true;
  const modelo = String(order.modelo || '');
  if (/\(Estoque\)/i.test(modelo)) return true;
  return order.tipoExtra === 'bota_pronta_entrega' && /EST$/i.test(String(order.numero || ''));
}
