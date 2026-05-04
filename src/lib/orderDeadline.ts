/**
 * Cálculo dinâmico do prazo de produção dos pedidos.
 * - Lead times atualizados (2026-05): bota/cinto 20du; extras conforme tabela.
 * - Cutoff por tipo: ficha (bota/cinto) 06:00, extras 12:00.
 *   Pedidos criados após o cutoff perdem o dia da criação como D1.
 * - Carimbo a Fogo vinculado a bota por encomenda: prazo conta a partir
 *   do momento em que a bota vinculada entra em Revisão (ou Expedição).
 *   Enquanto a bota não chega lá, o pedido fica em estado "Aguardando bota".
 * - Bota Pronta Entrega com extras embutidos: 1du + maior prazo dos extras.
 */
import { businessDaysRemaining, businessDaysOverdue } from '@/contexts/AuthContext';
import { isBusinessDay } from '@/lib/holidays';

export const FINAL_STAGES = ['Baixa Site (Despachado)', 'Expedição', 'Entregue', 'Conferido', 'Cobrado', 'Pago', 'Cancelado'];

/** Etapas que liberam o início do prazo do carimbo vinculado a bota. */
const CARIMBO_BOOT_TRIGGER_STAGES = ['Revisão', 'Expedição', 'Baixa Site (Despachado)', 'Entregue', 'Conferido', 'Cobrado', 'Pago'];

/** Lead times por tipo (em dias úteis). */
const EXTRA_LEAD_TIMES: Record<string, number> = {
  tiras_laterais: 2,
  desmanchar: 7,
  gravata_country: 7,
  kit_canivete: 4,
  kit_faca: 4,
  carimbo_fogo: 5,
  revitalizador: 1,
  kit_revitalizador: 1,
  adicionar_metais: 7,
  chaveiro_carimbo: 5,
  bainha_cartao: 7,
  regata: 20,
  regata_pronta_entrega: 1,
  bota_pronta_entrega: 1,
  gravata_pronta_entrega: 1,
};

export function getExtraLeadTime(tipoExtra: string): number {
  return EXTRA_LEAD_TIMES[tipoExtra] ?? 1;
}

/** Lead time padrão por tipo de produto (dias úteis). */
export function getTotalBizDays(order: { tipoExtra?: string | null; extraDetalhes?: any }): number {
  if (order.tipoExtra === 'cinto') return 20;
  if (!order.tipoExtra) return 20; // bota (ficha)

  // Bota Pronta Entrega: 1du + maior prazo entre extras embutidos
  if (order.tipoExtra === 'bota_pronta_entrega') {
    const det = order.extraDetalhes || {};
    const botas: any[] = Array.isArray(det.botas) ? det.botas : [];
    let maxExtra = 0;
    for (const b of botas) {
      const extras: any[] = Array.isArray(b?.extras) ? b.extras : [];
      for (const ex of extras) {
        const lt = getExtraLeadTime(ex?.tipo || '');
        if (lt > maxExtra) maxExtra = lt;
      }
    }
    return 1 + maxExtra;
  }

  return getExtraLeadTime(order.tipoExtra);
}

/** Cutoff em horas pelo tipo. */
function getCutoffHour(order: { tipoExtra?: string | null }): number {
  // Ficha (bota/cinto)
  if (!order.tipoExtra || order.tipoExtra === 'cinto') return 6;
  return 12;
}

export type DeadlineTone = 'success' | 'danger' | 'normal' | 'muted';

export interface DeadlineInfo {
  daysLeft: number;
  daysOverdue: number;
  isFinal: boolean;
  isOverdue: boolean;
  /** Pedido sem prazo aplicável (ex.: vendedor "Estoque" ou aguardando dependência). */
  isNoDeadline: boolean;
  tone: DeadlineTone;
  /** Texto longo: "5d úteis", "+3d atrasado", "✓", "—", "Aguardando bota". */
  label: string;
  /** Texto compacto: "5d", "+3d", "✓", "—". */
  shortLabel: string;
}

function parseCreatedDateRaw(order: { dataCriacao?: string; horaCriacao?: string }): Date {
  const d = order.dataCriacao || '';
  const t = order.horaCriacao || '00:00';
  const iso = `${d}T${t.length === 5 ? t : '00:00'}:00`;
  const parsed = new Date(iso);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function nextBusinessDayStart(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (!isBusinessDay(d));
  return d;
}

/**
 * Aplica regras de cutoff e dependências (carimbo vinculado a bota) para
 * determinar a data efetiva de início do prazo. Pode retornar null quando
 * o pedido depende de algo que ainda não aconteceu (carimbo aguardando bota).
 */
function getEffectiveStartDate(
  order: { status?: string; tipoExtra?: string | null; dataCriacao?: string; horaCriacao?: string; extraDetalhes?: any },
  linkedBoot?: { status?: string; historico?: any[] } | null,
): { start: Date | null; aguardandoBota?: boolean } {
  // Regra especial: Carimbo a Fogo vinculado a bota encomendada
  const det = order.extraDetalhes || {};
  if (order.tipoExtra === 'carimbo_fogo' && det.vinculadoBota === true) {
    if (!linkedBoot) {
      return { start: null, aguardandoBota: true };
    }
    // procura a primeira entrada do histórico que disparou o gatilho
    const hist: any[] = Array.isArray(linkedBoot.historico) ? linkedBoot.historico : [];
    let trigger: { data: string; hora: string } | null = null;
    for (const h of hist) {
      if (h && CARIMBO_BOOT_TRIGGER_STAGES.includes(h.local)) {
        trigger = { data: h.data || '', hora: h.hora || '00:00' };
        break;
      }
    }
    if (!trigger && CARIMBO_BOOT_TRIGGER_STAGES.includes(linkedBoot.status || '')) {
      // sem histórico, mas status atual já é gatilho — usa agora
      trigger = { data: new Date().toISOString().slice(0, 10), hora: '00:00' };
    }
    if (!trigger) {
      return { start: null, aguardandoBota: true };
    }
    const iso = `${trigger.data}T${trigger.hora.length === 5 ? trigger.hora : '00:00'}:00`;
    let start = new Date(iso);
    if (isNaN(start.getTime())) start = new Date();
    // aplica cutoff de extras (12h) sobre a data do gatilho
    if (start.getHours() >= 12 || !isBusinessDay(start)) {
      start = nextBusinessDayStart(start);
    }
    return { start };
  }

  // Cutoff padrão pelo tipo
  const raw = parseCreatedDateRaw(order);
  const cutoff = getCutoffHour(order);
  if (raw.getHours() >= cutoff || !isBusinessDay(raw)) {
    return { start: nextBusinessDayStart(raw) };
  }
  return { start: raw };
}

export function getOrderDeadlineInfo(
  order: {
    status?: string;
    tipoExtra?: string | null;
    dataCriacao?: string;
    horaCriacao?: string;
    vendedor?: string;
    extraDetalhes?: any;
  },
  linkedBoot?: { status?: string; historico?: any[] } | null,
): DeadlineInfo {
  const isNoDeadline = (order.vendedor || '').trim().toLowerCase() === 'estoque';
  if (isNoDeadline) {
    return {
      daysLeft: 0, daysOverdue: 0, isFinal: false, isOverdue: false,
      isNoDeadline: true, tone: 'muted', label: '—', shortLabel: '—',
    };
  }

  const isFinal = FINAL_STAGES.includes(order.status || '');
  if (isFinal) {
    return {
      daysLeft: 0, daysOverdue: 0, isFinal: true, isOverdue: false,
      isNoDeadline: false, tone: 'success', label: '✓', shortLabel: '✓',
    };
  }

  const { start, aguardandoBota } = getEffectiveStartDate(order, linkedBoot);
  if (!start) {
    // Carimbo aguardando bota — neutro
    return {
      daysLeft: 0, daysOverdue: 0, isFinal: false, isOverdue: false,
      isNoDeadline: true, tone: 'muted',
      label: aguardandoBota ? 'Aguardando bota' : '—',
      shortLabel: aguardandoBota ? '⏳' : '—',
    };
  }

  const total = getTotalBizDays(order);
  const daysLeft = businessDaysRemaining(start, total);
  const daysOverdue = businessDaysOverdue(start, total);
  const isOverdue = daysOverdue > 0;

  let label: string;
  let shortLabel: string;
  let tone: DeadlineTone;

  if (isOverdue) {
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
 * Regra do painel "Pedidos em Alerta": pedidos atrasados que ainda não estão em etapa final.
 */
export function isAlertOrder(order: {
  status?: string;
  tipoExtra?: string | null;
  dataCriacao?: string;
  horaCriacao?: string;
  vendedor?: string;
  historico?: any[];
  extraDetalhes?: any;
}, linkedBoot?: { status?: string; historico?: any[] } | null): boolean {
  const info = getOrderDeadlineInfo(order, linkedBoot);
  if (info.isNoDeadline) return false;
  if (info.isFinal) return false;
  return info.isOverdue;
}
