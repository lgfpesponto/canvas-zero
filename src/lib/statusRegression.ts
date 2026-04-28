/**
 * Detecção de retrocesso de status na ordem canônica de produção.
 * Usado para exigir justificativa quando um pedido volta para uma etapa anterior.
 */
import { PRODUCTION_STATUSES } from './order-logic';

/** Ordem canônica derivada de PRODUCTION_STATUSES, sem 'Cancelado' (tratado à parte). */
export const STATUS_ORDER: string[] = PRODUCTION_STATUSES.filter(s => s !== 'Cancelado');

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
