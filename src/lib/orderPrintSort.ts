import { getCouroSortKey } from '@/lib/pdfGenerators';

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

/**
 * Ordem de impressão/produção:
 * 1) tipo de couro (prioridade), 2) cor do couro, 3) modelo, 4) número do pedido.
 * Pedidos sem couro (ex.: cintos/extras) vão para o final.
 */
export function compareOrdersForPrint(a: any, b: any): number {
  const couroA = norm(a?.couroCano);
  const couroB = norm(b?.couroCano);

  const semA = couroA ? 0 : 1;
  const semB = couroB ? 0 : 1;
  if (semA !== semB) return semA - semB;

  if (couroA || couroB) {
    const prioA = getCouroSortKey(couroA);
    const prioB = getCouroSortKey(couroB);
    if (prioA !== prioB) return prioA - prioB;
    const tipoComp = couroA.localeCompare(couroB, 'pt-BR');
    if (tipoComp !== 0) return tipoComp;
    const corComp = norm(a?.corCouroCano).localeCompare(norm(b?.corCouroCano), 'pt-BR');
    if (corComp !== 0) return corComp;
  }

  const modeloComp = norm(a?.modelo).localeCompare(norm(b?.modelo), 'pt-BR');
  if (modeloComp !== 0) return modeloComp;

  const numA = parseInt(String(a?.numero ?? '').replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(String(b?.numero ?? '').replace(/\D/g, ''), 10) || 0;
  return numA - numB;
}

export function sortOrdersForPrint<T>(list: T[]): T[] {
  return list.slice().sort(compareOrdersForPrint);
}
