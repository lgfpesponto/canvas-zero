/**
 * Bola Grande é cobrada por unidade (igual ao Strass), mas historicamente a
 * quantidade só era gravada dentro do texto de metais ("Bola Grande:24").
 * Este helper lê a quantidade de forma tolerante:
 *   1) extra_detalhes.bolaGrandeQtd (pedidos novos)
 *   2) texto de tipo_metal / tipoMetal ("Bola Grande:24")
 */
export function getBolaGrandeQtd(order: any): number {
  if (!order) return 0;
  const det: any = order.extraDetalhes || order.extra_detalhes || {};
  const direct = Number(det.bolaGrandeQtd) || 0;
  if (direct > 0) return direct;
  const tipoMetal: string = order.tipoMetal || order.tipo_metal || '';
  const m = tipoMetal.match(/Bola\s*Grande\s*:?\s*(\d+)/i);
  return m ? Number(m[1]) || 0 : 0;
}
