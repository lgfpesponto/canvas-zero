/**
 * Mapa de transições válidas entre etapas de produção (botas).
 *
 * Regras:
 * - "Aguardando" e "Cancelado" podem ser alcançados a partir de qualquer etapa.
 * - Quando saindo de "Aguardando" ou "Cancelado", qualquer destino é permitido
 *   (a justificativa para retrocesso é tratada por statusRegression.ts).
 * - "Baixa Estoque" só é destino válido para o pseudo-vendedor "Estoque".
 * - "Baixa Site (Despachado)" só é destino válido para vendedor de comissão.
 */

export const PESPONTOS = [
  'Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05',
  'Pesponto Ailton', 'Pespontando',
];

const BAIXA_CORTE_NEXT = [
  'Entrada Laser Dinei', 'Entrada Laser Ferreni', 'Estampa', 'Sem bordado',
  'Bordado Sandro', 'Entrada Bordado 7Estrivos',
];

const FLOW: Record<string, string[]> = {
  'Em aberto': ['Impresso'],
  'Impresso': ['Corte'],
  'Corte': ['Baixa Corte', 'Aguardando Couro'],
  'Aguardando Couro': ['Corte'],
  'Baixa Corte': BAIXA_CORTE_NEXT,
  'Entrada Laser Dinei': ['Baixa Laser Dinei'],
  'Baixa Laser Dinei': PESPONTOS,
  'Entrada Laser Ferreni': ['Baixa Laser Ferreni'],
  'Baixa Laser Ferreni': PESPONTOS,
  'Estampa': ['Entrada Bordado 7Estrivos', 'Bordado Sandro', ...PESPONTOS],
  'Sem bordado': PESPONTOS,
  'Bordado Sandro': PESPONTOS,
  'Entrada Bordado 7Estrivos': ['Baixa Bordado 7Estrivos'],
  'Baixa Bordado 7Estrivos': PESPONTOS,
  'Pesponto 01': ['Montagem'],
  'Pesponto 02': ['Montagem'],
  'Pesponto 03': ['Montagem'],
  'Pesponto 04': ['Montagem'],
  'Pesponto 05': ['Montagem'],
  'Pesponto Ailton': ['Montagem'],
  'Pespontando': ['Montagem'],
  'Montagem': ['Revisão', 'Expedição', 'Baixa Site (Despachado)', 'Baixa Estoque'],
  'Revisão': ['Expedição'],
  'Expedição': ['Entregue', 'Baixa Site (Despachado)', 'Baixa Estoque'],
  'Baixa Estoque': ['Entregue'],
  'Baixa Site (Despachado)': ['Entregue'],
  'Entregue': ['Conferido'],
  'Conferido': ['Cobrado'],
  'Cobrado': ['Pago'],
  'Pago': [],
  'Emprestado': ['Corte', 'Em aberto'],
};

export const ALWAYS_AVAILABLE = ['Aguardando', 'Cancelado'];

/** Status a partir dos quais qualquer destino é permitido (sem checagem de fluxo). */
const FREE_FROM = new Set(['Aguardando', 'Cancelado']);

/**
 * Fluxo dos extras (qualquer `tipoExtra` diferente de 'cinto').
 * - Em aberto / Produzindo / Expedição = trio livre (qualquer ordem entre eles).
 * - A partir de Expedição → Entregue → Conferido → Cobrado → Pago em sequência estrita.
 */
const EXTRAS_FLOW: Record<string, string[]> = {
  'Em aberto': ['Produzindo', 'Expedição'],
  'Produzindo': ['Em aberto', 'Expedição'],
  'Expedição': ['Entregue'],
  'Entregue': ['Conferido'],
  'Conferido': ['Cobrado'],
  'Cobrado': ['Pago'],
  'Pago': [],
};

export interface TransitionContext {
  /** Vendedor do pedido — usado para Baixa Estoque/Site. */
  vendedor?: string;
  /** Role do usuário que está tentando — usado para futuras restrições. */
  role?: string;
  /** Tipo de produto extra (`'cinto'`, `'bota_pronta_entrega'`, etc.). Vazio/undefined = bota normal. */
  tipoExtra?: string | null;
}

function isPureExtra(ctx?: TransitionContext): boolean {
  return !!ctx?.tipoExtra && ctx.tipoExtra !== 'cinto';
}

function pickFlow(ctx?: TransitionContext): Record<string, string[]> {
  return isPureExtra(ctx) ? EXTRAS_FLOW : FLOW;
}

function applyContextFilter(targets: string[], ctx?: TransitionContext): string[] {
  if (!ctx) return targets;
  return targets.filter(t => {
    if (t === 'Baixa Estoque') return ctx.vendedor === 'Estoque';
    if (t === 'Baixa Site (Despachado)') return ctx.vendedor !== 'Estoque';
    return true;
  });
}

/**
 * Lista todos os destinos válidos a partir de `current`.
 *
 * Inclui:
 * - Avanços diretos definidos no fluxo aplicável
 * - Quaisquer outras etapas do mesmo fluxo (retrocessos / laterais) — a
 *   justificativa para retrocesso é tratada por `statusRegression.ts` /
 *   modal no consumer (ex.: ReportsPage)
 * - Aguardando / Cancelado (sempre disponíveis)
 *
 * Restrições de contexto (`Baixa Estoque` / `Baixa Site`) continuam aplicadas.
 */
export function getAllowedNextStatuses(current: string | null | undefined, ctx?: TransitionContext): string[] {
  if (!current) return [];
  const flow = pickFlow(ctx);
  const allFlowKeys = Object.keys(flow);
  const merged = Array.from(new Set([...allFlowKeys, ...ALWAYS_AVAILABLE]));
  return applyContextFilter(merged, ctx);
}

/**
 * Verifica se ir de current → next é permitido.
 *
 * Permite qualquer etapa do mesmo fluxo (avanços e retrocessos).
 * Retrocessos disparam o modal de justificativa via `requiresJustification`
 * antes de chegar aqui — esta função apenas garante que o destino faz parte
 * do fluxo aplicável e respeita as restrições de contexto.
 */
export function isTransitionAllowed(
  current: string | null | undefined,
  next: string,
  ctx?: TransitionContext,
): boolean {
  if (!current || !next) return false;
  if (current === next) return true;
  if (ALWAYS_AVAILABLE.includes(next)) return true;
  const flow = pickFlow(ctx);
  if (!Object.prototype.hasOwnProperty.call(flow, next)) return false;
  return applyContextFilter([next], ctx).length > 0;
}

export const TRANSITION_BLOCKED_MESSAGE =
  'Progresso indisponível para esse pedido, siga a ordem de produção';
