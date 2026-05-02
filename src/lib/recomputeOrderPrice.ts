/**
 * Cálculo CANÔNICO do subtotal de um pedido a partir do breakdown da composição.
 *
 * Espelha o que `OrderDetailPage` mostra no painel "Preço unit." e na "Composição do Pedido".
 * É a fonte única de verdade para:
 *  - exibição do subtotal/Total no detalhe do pedido
 *  - auto-correção do `order.preco` no banco quando diverge
 *  - varredura retroativa em massa (RecalcPrecosRunner)
 *
 * Sempre que um cálculo aqui mudar, listagens e PDFs herdam o valor automaticamente
 * porque eles leem `order.preco` (já normalizado pela varredura/auto-correção).
 */
import type { Order } from '@/contexts/AuthContext';
import {
  MODELOS, ACESSORIOS, COURO_PRECOS, SOLADO, COR_VIRA, CARIMBO, AREA_METAL, DESENVOLVIMENTO,
  SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO, PINTURA_PRECO,
  TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, STRASS_PRECO, CRUZ_METAL_PRECO,
  BRIDAO_METAL_PRECO, CAVALO_METAL_PRECO, FRANJA_PRECO, CORRENTE_PRECO,
  LASER_CANO_PRECO, LASER_GASPEA_PRECO, GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO,
  BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA,
  getCorSolaPrecoContextual,
} from './orderFieldsConfig';
import {
  BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO,
} from './extrasConfig';

export type FindFichaPrice = (nome: string, categoria: string) => number | undefined;
export type GetByCategoria = (categoria: string) => { label: string; preco: number }[];

const noFicha: FindFichaPrice = () => undefined;
const noCategoria: GetByCategoria = () => [];

/**
 * Calcula o subtotal real do pedido, na MESMA ordem e regras da composição exibida.
 * Para extras (tipoExtra preenchido), retorna o total do extra.
 * Para botas, retorna a soma do breakdown — para Bota Pronta Entrega use o `preco` direto.
 */
export function recomputeSubtotal(
  order: Order,
  findFichaPrice: FindFichaPrice = noFicha,
  getByCategoria: GetByCategoria = noCategoria,
): number {
  // Extras (cinto, kits, revitalizador, etc.) — calculados isoladamente.
  if (order.tipoExtra) {
    return computeExtraTotal(order);
  }

  const items: number[] = [];
  const push = (v: number | undefined | null) => { if (v && v > 0) items.push(v); };

  push(MODELOS.find(m => m.label === order.modelo)?.preco);
  if (order.sobMedida) items.push(SOB_MEDIDA_PRECO);
  if (order.acessorios) {
    order.acessorios.split(', ').filter(Boolean).forEach(a => {
      push(ACESSORIOS.find(x => x.label === a)?.preco);
    });
  }
  ([
    [order.couroCano, 'couro_cano'],
    [order.couroGaspea, 'couro_gaspea'],
    [order.couroTaloneira, 'couro_taloneira'],
  ] as [string | undefined, string][]).forEach(([t, cat]) => {
    if (!t) return;
    push(findFichaPrice(t, cat) ?? COURO_PRECOS[t] ?? 0);
  });
  push(DESENVOLVIMENTO.find(d => d.label === order.desenvolvimento)?.preco);

  const findDetailPrice = (b: string, cat: string, fallback: { label: string; preco: number }[]) =>
    findFichaPrice(b, cat) ?? getByCategoria(cat).find(x => x.label === b)?.preco ?? fallback.find(x => x.label === b)?.preco ?? 0;

  ([
    [order.bordadoCano, 'bordado_cano', BORDADOS_CANO],
    [order.bordadoGaspea, 'bordado_gaspea', BORDADOS_GASPEA],
    [order.bordadoTaloneira, 'bordado_taloneira', BORDADOS_TALONEIRA],
  ] as [string | undefined, string, { label: string; preco: number }[]][]).forEach(([bStr, cat, fallback]) => {
    if (!bStr) return;
    bStr.split(', ').filter(Boolean).forEach(b => push(findDetailPrice(b, cat, fallback)));
  });

  if (order.nomeBordadoDesc || order.personalizacaoNome) items.push(NOME_BORDADO_PRECO);
  if (order.laserCano) items.push(LASER_CANO_PRECO);
  if (order.corGlitterCano) items.push(GLITTER_CANO_PRECO);
  if (order.laserGaspea) items.push(LASER_GASPEA_PRECO);
  if (order.corGlitterGaspea) items.push(GLITTER_GASPEA_PRECO);
  if (order.pintura === 'Sim') items.push(PINTURA_PRECO);
  if (order.estampa === 'Sim') items.push(ESTAMPA_PRECO);
  push(AREA_METAL.find(a => a.label === order.metais)?.preco);
  if (order.strassQtd) items.push(order.strassQtd * STRASS_PRECO);
  if (order.cruzMetalQtd) items.push(order.cruzMetalQtd * CRUZ_METAL_PRECO);
  if (order.bridaoMetalQtd) items.push(order.bridaoMetalQtd * BRIDAO_METAL_PRECO);
  const det: any = order.extraDetalhes || {};
  if (det.cavaloMetal && det.cavaloMetalQtd) items.push(det.cavaloMetalQtd * CAVALO_METAL_PRECO);
  if (order.trisce === 'Sim') items.push(TRICE_PRECO);
  if (order.tiras === 'Sim') items.push(TIRAS_PRECO);
  if (det.franja) items.push(FRANJA_PRECO);
  if (det.corrente) items.push(CORRENTE_PRECO);
  push(SOLADO.find(s => s.label === order.solado)?.preco);
  // Cor da Sola CONTEXTUAL (PVC = R$0, Borracha + Marrom/Branco = R$20, etc.)
  push(getCorSolaPrecoContextual(order.modelo, order.solado, order.formatoBico, order.corSola));
  push(COR_VIRA.find(c => c.label === order.corVira)?.preco);
  if (order.costuraAtras === 'Sim') items.push(COSTURA_ATRAS_PRECO);
  push(CARIMBO.find(c => c.label === order.carimbo)?.preco);
  if (order.adicionalValor && order.adicionalValor > 0) items.push(Number(order.adicionalValor));

  return items.reduce((s, v) => s + v, 0);
}

function computeExtraTotal(order: Order): number {
  const det: any = order.extraDetalhes || {};
  let t = 0;
  switch (order.tipoExtra) {
    case 'cinto': {
      const sizeItem = BELT_SIZES.find((s: any) => det.tamanhoCinto?.startsWith(s.label));
      if (sizeItem) t += sizeItem.preco;
      if (det.bordadoP === 'Tem') t += BORDADO_P_PRECO;
      if (det.nomeBordado === 'Tem') t += NOME_BORDADO_CINTO_PRECO;
      if (det.carimbo) { const car = BELT_CARIMBO.find((c: any) => c.label === det.carimbo); if (car) t += car.preco; }
      break;
    }
    case 'tiras_laterais': t += 15; break;
    case 'desmanchar':
      t += 65;
      if (det.qualSola === 'Preta borracha') t += 25;
      else if (det.qualSola === 'De cor borracha') t += 40;
      else if (det.qualSola === 'De couro') t += 60;
      if (det.trocaGaspea === 'Sim') t += 35;
      break;
    case 'kit_canivete': t += 30; if (det.vaiCanivete === 'Sim') t += 30; break;
    case 'kit_faca': t += 35; if (det.vaiCanivete === 'Sim') t += 35; break;
    case 'carimbo_fogo': { const qty = parseInt(det.qtdCarimbos) || 1; t += qty >= 4 ? 40 : 20; break; }
    case 'revitalizador': { const qty = parseInt(det.quantidade) || 1; t += 10 * qty; break; }
    case 'kit_revitalizador': { const qty = parseInt(det.quantidade) || 1; t += 26 * qty; break; }
    case 'gravata_country': t += 30; break;
    case 'adicionar_metais': {
      const sel = (det.metaisSelecionados as string[]) || [];
      if (sel.includes('Bola grande')) { const qty = parseInt(det.qtdBolaGrande) || 1; t += 0.60 * qty; }
      if (sel.includes('Strass')) { const qty = parseInt(det.qtdStrass) || 1; t += 0.60 * qty; }
      break;
    }
    case 'chaveiro_carimbo': t += 50; break;
    case 'bainha_cartao': t += 15; break;
    case 'regata': t += 50; break;
    case 'bota_pronta_entrega': t += Number(order.preco) || 0; break;
  }
  return t;
}

/**
 * A partir do subtotal real, devolve o `preco` que deve ser gravado em `order.preco`
 * para que listagens/PDFs (que fazem `preco × quantidade` ou `preco` direto para extras)
 * resultem no mesmo total.
 */
export function targetPrecoFromSubtotal(order: Order, subtotal: number): number {
  if (order.tipoExtra === 'bota_pronta_entrega') return Number(order.preco) || 0; // mantido
  if (order.tipoExtra) return subtotal; // extras: preço unitário = total do extra (qtd=1)
  return subtotal / Math.max(1, order.quantidade || 1);
}
