/**
 * Cálculo dinâmico do prazo de produção dos pedidos.
 * - Dias úteis restantes até o deadline (15/5/1 conforme tipo).
 * - Dias úteis em atraso quando o pedido passou do prazo e ainda não chegou
 *   em uma etapa final (Expedição, Entregue, Cobrado, Pago, Cancelado).
 */
import { businessDaysRemaining, businessDaysOverdue } from '@/contexts/AuthContext';

export const FINAL_STAGES = ['Expedição', 'Entregue', 'Cobrado', 'Pago', 'Cancelado'];

/** Lead time padrão por tipo de produto (dias úteis). */
export function getTotalBizDays(order: { tipoExtra?: string | null }): number {
  if (order.tipoExtra === 'cinto') return 5;
  if (order.tipoExtra) return 1;
  return 15;
}

export type DeadlineTone = 'success' | 'danger' | 'normal';

export interface DeadlineInfo {
  daysLeft: number;
  daysOverdue: number;
  isFinal: boolean;
  isOverdue: boolean;
  tone: DeadlineTone;
  /** Texto longo: "5d úteis", "+3d atrasado", "✓". */
  label: string;
  /** Texto compacto: "5d", "+3d", "✓". */
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
}): DeadlineInfo {
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

  return { daysLeft, daysOverdue, isFinal, isOverdue, tone, label, shortLabel };
}
