// Mapeia status do portal -> status da Bagy (Dooca)
// Códigos podem variar; se a API rejeitar, ajustar só aqui.
// Labels confirmadas via prints: "Pagamento aprovado", "Separado",
// "Em produção", "Faturado", "Despachado", "Marcar como entregue".

export type BagyTargetStatus =
  | "approved"
  | "separated"
  | "production"
  | "invoiced"
  | "shipped"
  | "delivered"
  | "canceled";

// Mapeia o nome bonito do status_etapas.nome (ou status do pedido) -> Bagy
export function mapPortalStatusToBagy(
  portalStatus: string | null | undefined,
): BagyTargetStatus | null {
  if (!portalStatus) return null;
  const s = portalStatus.trim().toLowerCase();

  if (s === "cancelado" || s === "deletado") return "canceled";
  if (s === "entregue") return "delivered";
  if (s === "expedição" || s === "expedicao" || s === "despachado") {
    return "shipped";
  }
  // Estoque pronto pra envio
  if (s === "separado" || s === "revisão" || s === "revisao") {
    return "separated";
  }
  // Qualquer etapa de produção de ficha
  if (
    s === "em produção" || s === "em producao" ||
    s.startsWith("bordado") || s.startsWith("pesponto") ||
    s === "corte" || s === "montagem" || s === "pespontando" ||
    s === "aguardando" || s === "aguardando couro" ||
    s === "sem bordado" || s === "em aberto"
  ) {
    return "production";
  }
  if (s === "cobrado" || s === "pago" || s === "faturado") {
    return "invoiced";
  }
  return null;
}

// Códigos exatos enviados no PUT /orders/{id} da API Dooca.
// Ajustar aqui se algum nome de status estiver diferente na sua loja.
export const BAGY_STATUS_CODE: Record<BagyTargetStatus, string> = {
  approved: "approved",
  separated: "separated",
  production: "production",
  invoiced: "invoiced",
  shipped: "shipped",
  delivered: "delivered",
  canceled: "canceled",
};
