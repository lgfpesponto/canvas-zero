/**
 * Detecção de transições de status que exigem justificativa.
 * - Regressão na ordem canônica de produção
 * - Pausa (Aguardando)
 * - Cancelamento (Cancelado)
 */
import { PRODUCTION_STATUSES } from './order-logic';

/** Ordem canônica derivada de PRODUCTION_STATUSES, sem 'Cancelado' (tratado à parte). */
export const STATUS_ORDER: string[] = PRODUCTION_STATUSES.filter(s => s !== 'Cancelado');

/** Ordem canônica para extras (qualquer tipoExtra != 'cinto'). */
export const EXTRAS_STATUS_ORDER: string[] = [
  'Em aberto', 'Produzindo', 'Expedição',
  'Entregue', 'Conferido', 'Cobrado', 'Pago',
];

/**
 * Par livre dos extras: Em aberto ↔ Produzindo podem ser trocados em
 * qualquer direção sem justificativa. Avançar de Em aberto/Produzindo →
 * Expedição também é livre. Já voltar de Expedição → Em aberto/Produzindo
 * é retrocesso e exige justificativa.
 */
const EXTRAS_FREE_PAIR = new Set(['Em aberto', 'Produzindo']);

/** Status que representam pausa (fora da ordem linear). */
export const PAUSE_STATUSES: string[] = ['Aguardando'];

/** Status que representam cancelamento (fora da ordem linear). */
export const CANCEL_STATUSES: string[] = ['Cancelado'];

function isPureExtra(tipoExtra?: string | null): boolean {
  return !!tipoExtra && tipoExtra !== 'cinto';
}

/**
 * Retorna true se mover de `current` para `next` representa um retrocesso
 * na linha de produção. Status desconhecidos ou 'Cancelado' nunca disparam.
 */
export function isStatusRegression(
  current: string | undefined | null,
  next: string,
  tipoExtra?: string | null,
): boolean {
  if (!current || !next) return false;
  if (current === next) return false;
  if (next === 'Cancelado' || current === 'Cancelado') return false;

  if (isPureExtra(tipoExtra)) {
    // Trio livre: nenhuma transição entre eles é regressão
    // Em aberto ↔ Produzindo: livre nos dois sentidos
    if (EXTRAS_FREE_PAIR.has(current) && EXTRAS_FREE_PAIR.has(next)) return false;
    // Avanço de Em aberto/Produzindo → Expedição: livre
    if (EXTRAS_FREE_PAIR.has(current) && next === 'Expedição') return false;
    const cIdx = EXTRAS_STATUS_ORDER.indexOf(current);
    const nIdx = EXTRAS_STATUS_ORDER.indexOf(next);
    if (cIdx === -1 || nIdx === -1) return false;
    return nIdx < cIdx;
  }

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
  tipoExtra?: string | null,
): JustificationKind | null {
  if (!current || !next) return null;
  if (current === next) return null;

  if (CANCEL_STATUSES.includes(next)) return 'cancel';
  if (PAUSE_STATUSES.includes(next)) return 'pause';
  // Sair de Cancelado para qualquer outra etapa = retrocesso (precisa justificar)
  if (CANCEL_STATUSES.includes(current)) return 'regression';
  // Sair de Aguardando NÃO precisa justificativa (é apenas reativar)
  if (isStatusRegression(current, next, tipoExtra)) return 'regression';
  return null;
}
