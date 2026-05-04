/**
 * Cálculo dinâmico do prazo de produção dos pedidos.
 * - Dias úteis restantes até o deadline (15/5/1 conforme tipo).
 * - Dias úteis em atraso quando o pedido passou do prazo e ainda não chegou
 *   em uma etapa final (Baixa Site (Despachado), Expedição, Entregue, Cobrado, Pago, Cancelado).
 * - Pedidos do vendedor "Estoque" (estoque interno) não têm prazo de produção.
 */
import { businessDaysRemaining, businessDaysOverdue } from '@/contexts/AuthContext';

export const FINAL_STAGES = ['Baixa Site (Despachado)', 'Expedição', 'Entregue', 'Conferido', 'Cobrado', 'Pago', 'Cancelado'];

/** Lead time padrão por tipo de produto (dias úteis). */
export function getTotalBizDays(order: { tipoExtra?: string | null }): number {
  if (order.tipoExtra === 'cinto') return 5;
  if (order.tipoExtra) return 1;
  return 15;
}

export type DeadlineTone = 'success' | 'danger' | 'normal' | 'muted';

export interface DeadlineInfo {
  daysLeft: number;
  daysOverdue: number;
  isFinal: boolean;
  isOverdue: boolean;
  /** Pedido sem prazo aplicável (ex.: vendedor "Estoque"). */
  isNoDeadline: boolean;
  tone: DeadlineTone;
  /** Texto longo: "5d úteis", "+3d atrasado", "✓", "—". */
  label: string;
  /** Texto compacto: "5d", "+3d", "✓", "—". */
  shortLabel: string;
}

function parseCreatedDate(order: { dataCriacao?: string; horaCriacao?: string }): Date {
  // dataCriacao está em YYYY-MM-DD; combina com hora se houver para precisão.
  const d = order.dataCriacao || '';
  const t = order.horaCriacao || '00:00';
  // Constrói como horário local (Brasília já é o relógio do servidor de exibição).
  const iso = `${d}T${t.length === 5 ? t : '00:00'}:00`;
  const parsed = new Date(iso);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getOrderDeadlineInfo(order: {
  status?: string;
  tipoExtra?: string | null;
  dataCriacao?: string;
  horaCriacao?: string;
  vendedor?: string;
}): DeadlineInfo {
  const isNoDeadline = (order.vendedor || '').trim().toLowerCase() === 'estoque';
  if (isNoDeadline) {
    return {
      daysLeft: 0,
      daysOverdue: 0,
      isFinal: false,
      isOverdue: false,
      isNoDeadline: true,
      tone: 'muted',
      label: '—',
      shortLabel: '—',
    };
  }

  const isFinal = FINAL_STAGES.includes(order.status || '');
  const total = getTotalBizDays(order);
  const start = parseCreatedDate(order);
  const daysLeft = businessDaysRemaining(start, total);
  const daysOverdue = businessDaysOverdue(start, total);
  const isOverdue = !isFinal && daysOverdue > 0;

  let label: string;
  let shortLabel: string;
  let tone: DeadlineTone;

  if (isFinal) {
    label = '✓';
    shortLabel = '✓';
    tone = 'success';
  } else if (isOverdue) {
    label = `+${daysOverdue}d atrasado`;
    shortLabel = `+${daysOverdue}d`;
    tone = 'danger';
  } else {
    label = `${daysLeft}d úteis`;
    shortLabel = `${daysLeft}d`;
    tone = 'normal';
  }

  return { daysLeft, daysOverdue, isFinal, isOverdue, isNoDeadline: false, tone, label, shortLabel };
}

/** Pedido já passou por alguma etapa final em algum momento? */
export function hasReachedFinalStage(order: { status?: string; historico?: any[] }): boolean {
  if (FINAL_STAGES.includes(order.status || '')) return true;
  const hist = Array.isArray(order.historico) ? order.historico : [];
  return hist.some((h: any) => h && FINAL_STAGES.includes(h.local));
}

/** Pedido regrediu de uma etapa final (esteve em final no histórico mas hoje está fora). */
export function hasRegressedFromFinal(order: { status?: string; historico?: any[] }): boolean {
  const isFinalNow = FINAL_STAGES.includes(order.status || '');
  if (isFinalNow) return false;
  const hist = Array.isArray(order.historico) ? order.historico : [];
  return hist.some((h: any) => h && FINAL_STAGES.includes(h.local));
}

/**
 * Regra do painel "Pedidos em Alerta":
 * pedidos atrasados que ainda não estão em etapa final.
 * Inclui tanto os que nunca finalizaram quanto os que regrediram de uma etapa final.
 */
export function isAlertOrder(order: {
  status?: string;
  tipoExtra?: string | null;
  dataCriacao?: string;
  horaCriacao?: string;
  vendedor?: string;
  historico?: any[];
}): boolean {
  const info = getOrderDeadlineInfo(order);
  if (info.isNoDeadline) return false;
  if (info.isFinal) return false; // está em etapa final hoje → sem alerta
  return info.isOverdue; // atrasado e fora de etapa final (regredido ou nunca finalizou)
}
