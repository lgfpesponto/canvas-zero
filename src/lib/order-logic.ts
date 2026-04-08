/** Centralized order logic: statuses, filters, helpers */
import { EXTRA_PRODUCTS } from '@/lib/extrasConfig';
import type { AppRole } from '@/contexts/AuthContext';

/* ───── Production statuses ───── */

export const PRODUCTION_STATUSES = [
  "Em aberto", "Aguardando", "Emprestado", "Corte", "Sem bordado",
  "Bordado Dinei", "Bordado Sandro", "Bordado 7Estrivos",
  "Pesponto 01", "Pesponto 02", "Pesponto 03", "Pesponto 04", "Pesponto 05",
  "Pespontando", "Montagem", "Revisão", "Expedição",
  "Baixa Estoque", "Baixa Site (Despachado)",
  "Entregue", "Cobrado", "Pago"
];

export const PRODUCTION_STATUSES_USER = [
  "Em aberto", "Aguardando", "Emprestado", "Corte", "Sem bordado",
  "Bordado Dinei", "Bordado Sandro", "Bordado 7Estrivos",
  "Pesponto 01", "Pesponto 02", "Pesponto 03", "Pesponto 04", "Pesponto 05",
  "Pespontando", "Montagem", "Revisão", "Expedição",
  "Entregue", "Cobrado", "Pago"
];

export const EXTRAS_STATUSES = [
  "Em aberto", "Produzindo", "Expedição", "Entregue", "Cobrado", "Pago"
];

export const BELT_STATUSES = [
  "Em aberto", "Corte", "Bordado", "Pesponto",
  "Expedição", "Entregue", "Cobrado", "Pago"
];

/** Statuses that mean "in production" (for dashboard counters) */
export const PRODUCTION_STATUSES_IN_PROD = [
  'Aguardando', 'Corte', 'Sem bordado',
  'Bordado Dinei', 'Bordado Sandro', 'Bordado 7Estrivos',
  'Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05',
  'Pespontando', 'Montagem', 'Revisão', 'Expedição',
];

/** Roles allowed to change order statuses */
export const ADMIN_STATUS_ROLES: AppRole[] = ['admin_master', 'admin_producao'];

/* ───── Product options for production filter ───── */

export const PROD_PRODUCT_OPTIONS = [
  { value: 'bota', label: 'Bota' },
  ...EXTRA_PRODUCTS.map(p => ({ value: p.id, label: p.nome })),
  { value: 'cinto', label: 'Cinto' },
];

/* ───── Helpers ───── */

export const EXCLUDED_PREFIXES = ['TROCA', 'REFAZENDO', 'ERRO', 'INFLUENCER'];

export function isExcludedOrder(numero: string): boolean {
  return EXCLUDED_PREFIXES.some(p => numero.toUpperCase().startsWith(p));
}

export function getProductType(o: { tipoExtra?: string | null }): string {
  if (!o.tipoExtra) return 'bota';
  return o.tipoExtra;
}

export function matchVendedorFilter(
  o: { vendedor: string; cliente?: string },
  filter: string
): boolean {
  if (filter === 'todos') return true;
  if (o.vendedor === filter) return true;
  if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() === filter) return true;
  return false;
}

export function matchVendedorFilterSet(
  o: { vendedor: string; cliente?: string },
  filterSet: Set<string>
): boolean {
  if (filterSet.size === 0) return true;
  if (filterSet.has(o.vendedor)) return true;
  if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() && filterSet.has(o.cliente.trim())) return true;
  return false;
}

export function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Build the vendedores list from orders (including sub-clients of Juliana) */
export function buildVendedoresList(orders: { vendedor: string; cliente?: string }[]): string[] {
  const names = new Set(orders.map(o => o.vendedor));
  orders.forEach(o => {
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
      names.add(o.cliente.trim());
    }
  });
  return [...names].sort();
}
