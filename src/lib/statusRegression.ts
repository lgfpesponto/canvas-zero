/**
 * Detecção de transições de status que exigem justificativa.
 * - Regressão na ordem canônica de produção
 * - Pausa (Aguardando)
 * - Cancelamento (Cancelado)
 */
import { PRODUCTION_STATUSES } from './order-logic';

/** Ordem canônica derivada de PRODUCTION_STATUSES, sem 'Cancelado' (tratado à parte). */
export const STATUS_ORDER: string[] = PRODUCTION_STATUSES.filter(s => s !== 'Cancelado');

/** Status que representam pausa (fora da ordem linear). */
export const PAUSE_STATUSES: string[] = ['Aguardando'];

/** Status que representam cancelamento (fora da ordem linear). */
export const CANCEL_STATUSES: string[] = ['Cancelado'];

/**
 * Retorna true se mover de `current` para `next` representa um retrocesso
 * na linha de produção. Status desconhecidos ou 'Cancelado' nunca disparam.
 */
export function isStatusRegression(current: string | undefined | null, next: string): boolean {
  if (!current || !next) return false;
  if (current === next) return false;
  if (next === 'Cancelado' || current === 'Cancelado') return false;

  const currentIdx = STATUS_ORDER.indexOf(current);
  const nextIdx = STATUS_ORDER.indexOf(next);
  if (currentIdx === -1 || nextIdx === -1) return false;

  return nextIdx < currentIdx;
}

export type JustificationKind = 'cancel' | 'pause' | 'regression';

/**
 * Determina se a transição exige confirmação + justificativa, e de qual tipo.
 * Ordem de prioridade: cancelamento > pausa > regressão.
 */
export function requiresJustification(
  current: string | undefined | null,
  next: string,
): JustificationKind | null {
  if (!current || !next) return null;
  if (current === next) return null;

  if (CANCEL_STATUSES.includes(next)) return 'cancel';
  if (PAUSE_STATUSES.includes(next)) return 'pause';
  // Sair de Cancelado para qualquer outra etapa = retrocesso (precisa justificar)
  if (CANCEL_STATUSES.includes(current)) return 'regression';
  // Sair de Aguardando NÃO precisa justificativa (é apenas reativar)
  if (isStatusRegression(current, next)) return 'regression';
  return null;
}
