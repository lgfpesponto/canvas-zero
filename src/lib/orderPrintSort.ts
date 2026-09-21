import { getCouroSortKey } from '@/lib/pdfGenerators';

const norm = (v: any) => String(v ?? '').trim().toLowerCase();

const isVazio = (v: any) => {
  const s = norm(v);
  return !s || s === '-' || s === 'sem couro' || s === 'nao' || s === 'não';
};

/**
 * Cor equivalente para agrupamento: nescau / chocolate / marrom são a mesma
 * família e variam conforme o tipo de couro. Crazy Horse → Nescau,
 * Nobuck → Chocolate, todos os demais → Marrom.
 * Serve só para agrupar/ordenar; nenhum dado do pedido é alterado.
 */
export function corCouroEquivalente(tipoCouro?: string | null, cor?: string | null): string {
  const c = norm(cor);
  const t = norm(tipoCouro);
  const familiaMarrom = ['nescau', 'chocolate', 'marrom'];
  if (!familiaMarrom.includes(c)) return c;
  if (t.includes('crazy')) return 'nescau';
  if (t.includes('nobuck')) return 'chocolate';
  return 'marrom';
}

/** Couro/cor principais do pedido (cano → gáspea → taloneira → extra/cinto). */
export function getOrderCouroInfo(o: any): { tipo: string; cor: string } {
  const det = o?.extraDetalhes || o?.extra_detalhes || {};
  const pares: [any, any][] = [
    [o?.couroCano ?? o?.couro_cano, o?.corCouroCano ?? o?.cor_couro_cano],
    [o?.couroGaspea ?? o?.couro_gaspea, o?.corCouroGaspea ?? o?.cor_couro_gaspea],
    [o?.couroTaloneira ?? o?.couro_taloneira, o?.corCouroTaloneira ?? o?.cor_couro_taloneira],
    [det.tipoCouro, det.corCouro],
    [det.couro, det.cor],
  ];

  for (const [tipo, cor] of pares) {
    if (!isVazio(tipo)) return { tipo: String(tipo).trim(), cor: String(cor ?? '').trim() };
  }
  return { tipo: '', cor: '' };
}

/** Cintos vão sempre depois das botas/demais produtos. */
function isCinto(o: any): boolean {
  return norm(o?.tipoExtra ?? o?.tipo_extra) === 'cinto';
}

/**
 * Ordem de impressão/produção:
 * 0) cintos sempre por último, 1) tipo de couro (prioridade),
 * 2) cor do couro (equivalente), 3) modelo, 4) número do pedido.
 * Pedidos sem couro vão para o final de cada grupo.
 */
export function compareOrdersForPrint(a: any, b: any): number {
  const cintoA = isCinto(a) ? 1 : 0;
  const cintoB = isCinto(b) ? 1 : 0;
  if (cintoA !== cintoB) return cintoA - cintoB;

  const ia = getOrderCouroInfo(a);
  const ib = getOrderCouroInfo(b);
  const couroA = norm(ia.tipo);
  const couroB = norm(ib.tipo);

  const semA = couroA ? 0 : 1;
  const semB = couroB ? 0 : 1;
  if (semA !== semB) return semA - semB;


  if (couroA || couroB) {
    const prioA = getCouroSortKey(couroA);
    const prioB = getCouroSortKey(couroB);
    if (prioA !== prioB) return prioA - prioB;
    const tipoComp = couroA.localeCompare(couroB, 'pt-BR');
    if (tipoComp !== 0) return tipoComp;
    const corA = corCouroEquivalente(ia.tipo, ia.cor);
    const corB = corCouroEquivalente(ib.tipo, ib.cor);
    const corComp = corA.localeCompare(corB, 'pt-BR');
    if (corComp !== 0) return corComp;
  }

  const modeloA = norm(a?.modelo) || norm(a?.tipoExtra);
  const modeloB = norm(b?.modelo) || norm(b?.tipoExtra);
  const modeloComp = modeloA.localeCompare(modeloB, 'pt-BR');
  if (modeloComp !== 0) return modeloComp;

  const numA = parseInt(String(a?.numero ?? '').replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(String(b?.numero ?? '').replace(/\D/g, ''), 10) || 0;
  return numA - numB;
}

export function sortOrdersForPrint<T>(list: T[]): T[] {
  return list.slice().sort(compareOrdersForPrint);
}
