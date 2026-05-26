/**
 * Helper compartilhado para gerar o PDF de Cobrança a partir de uma lista de
 * pedidos. Usado pelo fluxo normal (`SpecializedReports.generateCobrancaPDF`)
 * e pelo fluxo de "Regerar com preços atuais" no Histórico de PDFs.
 *
 * O layout é idêntico em ambos os caminhos. A bolinha verde/vermelha + a
 * justificativa na coluna Composição são preservadas, pois usam as mesmas
 * regras de `desconto` e `alteracoes[].afetouValor`.
 */
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { type Order, orderBarcodeValue } from '@/contexts/AuthContext';
import { getOrderFinalValue, getOrderBaseValue } from '@/lib/order-logic';
import {
  MODELOS, ACESSORIOS, BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA,
  COURO_PRECOS, SOLADO, COR_VIRA, CARIMBO, AREA_METAL, DESENVOLVIMENTO,
  SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO, PINTURA_PRECO,
  TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, STRASS_PRECO,
  CRUZ_METAL_PRECO, BRIDAO_METAL_PRECO, LASER_CANO_PRECO, LASER_GASPEA_PRECO,
  GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO, getCorSolaPrecoContextual,
} from '@/lib/orderFieldsConfig';
import {
  BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO,
} from '@/lib/extrasConfig';
import { stampPageNumbers } from '@/lib/pdfGenerators';
import { priceWithFallback } from '@/lib/priceCache';

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateBR = (date: string) => {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
};

function barcodeDataUrl(value: string, opts?: { width?: number; height?: number }): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128', width: opts?.width ?? 2, height: opts?.height ?? 50,
      displayValue: false, margin: 2,
    });
    return canvas.toDataURL('image/png');
  } catch { return ''; }
}

export interface BuildCobrancaOpts {
  vendedorLabel: string;
  statusLabel: string;
  geradoEm: string; // dd/mm/yyyy
  tituloPrefixo?: string; // ex.: 'Cobrança' (default) ou 'Cobrança (preços atuais)'
}

export interface BuildCobrancaResult {
  doc: jsPDF;
  totalValor: number;
  totalQtd: number;
}

export function buildCobrancaPdfDoc(orders: Order[], opts: BuildCobrancaOpts): BuildCobrancaResult {
  // Ordenação igual ao Portal: data_criacao desc, hora_criacao desc, numero desc
  const filtered = [...orders].sort((a, b) => {
    const dA = (a.dataCriacao || ''), dB = (b.dataCriacao || '');
    if (dA !== dB) return dA < dB ? 1 : -1;
    const hA = (a.horaCriacao || ''), hB = (b.horaCriacao || '');
    if (hA !== hB) return hA < hB ? 1 : -1;
    const numA = parseInt((a.numero || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.numero || '').replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });

  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 210;
  const mx = 14;
  const cw = pw - mx * 2;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titulo = opts.tituloPrefixo || 'Cobrança';
  doc.text(`${titulo}  [${opts.geradoEm} — ${opts.vendedorLabel} — ${opts.statusLabel}]`, mx, 20);

  const cols = [45, 22, 68, 15, 32];
  const cx = [
    mx,
    mx + cols[0],
    mx + cols[0] + cols[1],
    mx + cols[0] + cols[1] + cols[2],
    mx + cols[0] + cols[1] + cols[2] + cols[3],
  ];
  const tableW = cols.reduce((a, b) => a + b, 0);

  let y = 30;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(232, 232, 232);
  doc.rect(mx, y, tableW, 8, 'F');
  doc.text('Nº PEDIDO', cx[0] + 1, y + 5.5);
  doc.text('DATA', cx[1] + 1, y + 5.5);
  doc.text('COMPOSIÇÃO', cx[2] + 1, y + 5.5);
  doc.text('QTD', cx[3] + 1, y + 5.5);
  doc.text('PREÇO', cx[4] + 1, y + 5.5);
  y += 8;

  let totalValor = 0;
  let totalQtd = 0;

  doc.setFont('helvetica', 'normal');
  filtered.forEach(o => {
    const priceItems: [string, number][] = [];

    if (o.tipoExtra === 'cinto' && o.extraDetalhes) {
      const det = o.extraDetalhes as any;
      const tamRaw: string = det.tamanhoCinto || '';
      const sizeEntry = BELT_SIZES.find(s => tamRaw.startsWith(s.label));
      if (sizeEntry) priceItems.push([`Tamanho: ${sizeEntry.label}`, sizeEntry.preco]);
      if (det.bordadoP === 'Tem' || det.bordadoP === 'Sim') priceItems.push(['Bordado P', BORDADO_P_PRECO]);
      if (det.nomeBordado === 'Tem' || det.nomeBordado === 'Sim') priceItems.push(['Nome Bordado', NOME_BORDADO_CINTO_PRECO]);
      const carimboEntry = BELT_CARIMBO.find(c => c.label === det.carimbo);
      if (carimboEntry) priceItems.push([det.carimbo, carimboEntry.preco]);
    } else if (o.tipoExtra && o.extraDetalhes) {
      const det = o.extraDetalhes as any;
      const extraLabel = (o.modelo || '').replace('Extra — ', '');

      switch (o.tipoExtra) {
        case 'desmanchar': {
          priceItems.push(['Desmanchar (base)', 65]);
          if (det.qualSola === 'Preta borracha') priceItems.push(['Sola preta borracha', 25]);
          else if (det.qualSola === 'De cor borracha') priceItems.push(['Sola de cor borracha', 40]);
          else if (det.qualSola === 'De couro') priceItems.push(['Sola de couro', 60]);
          if (det.trocaGaspea === 'Sim') priceItems.push(['Troca Gáspea/Taloneira', 35]);
          break;
        }
        case 'kit_canivete': {
          priceItems.push(['Kit Canivete', 30]);
          if (det.vaiCanivete === 'Sim') priceItems.push(['Com canivete', 30]);
          break;
        }
        case 'kit_faca': {
          priceItems.push(['Kit Faca', 35]);
          if (det.vaiCanivete === 'Sim') priceItems.push(['Com faca', 35]);
          break;
        }
        case 'carimbo_fogo': {
          const qty = parseInt(det.qtdCarimbos) || 1;
          priceItems.push([`Carimbo a Fogo (${qty} un.)`, qty >= 4 ? 40 : 20]);
          break;
        }
        case 'revitalizador': {
          const qty = parseInt(det.quantidade) || 1;
          priceItems.push([`Revitalizador (${qty} un.)`, 10 * qty]);
          break;
        }
        case 'kit_revitalizador': {
          const qty = parseInt(det.quantidade) || 1;
          priceItems.push([`Kit 2 Revitalizador (${qty} un.)`, 26 * qty]);
          break;
        }
        case 'adicionar_metais': {
          const sel = det.metaisSelecionados || [];
          if (sel.includes('Bola grande')) {
            const qtd = parseInt(det.qtdBolaGrande) || 1;
            priceItems.push([`Bola grande (${qtd} un.)`, 0.60 * qtd]);
          }
          if (sel.includes('Strass')) {
            const qtd = parseInt(det.qtdStrass) || 1;
            priceItems.push([`Strass (${qtd} un.)`, 0.60 * qtd]);
          }
          break;
        }
        case 'bota_pronta_entrega': {
          if (Array.isArray(det.botas) && det.botas.length > 0) {
            det.botas.forEach((b: any, i: number) => {
              priceItems.push([b.descricaoProduto || `Bota ${i + 1}`, parseFloat(b.valorManual) || 0]);
              if (Array.isArray(b.extras)) {
                b.extras.forEach((ex: any) => {
                  const LABELS: Record<string, string> = {
                    tiras_laterais: 'Tiras Laterais', carimbo_fogo: 'Carimbo a Fogo',
                    kit_faca: 'Kit Faca', kit_canivete: 'Kit Canivete',
                    adicionar_metais: 'Adicionar Metais',
                  };
                  let detail = '';
                  if (ex.tipo === 'adicionar_metais' && Array.isArray(ex.dados?.metaisSelecionados)) {
                    const parts: string[] = [];
                    if (ex.dados.metaisSelecionados.includes('Bola grande')) parts.push(`Bola grande x${ex.dados.qtdBolaGrande || 1}`);
                    if (ex.dados.metaisSelecionados.includes('Strass')) parts.push(`Strass x${ex.dados.qtdStrass || 1}`);
                    detail = parts.length ? ` (${parts.join(', ')})` : '';
                  } else if (ex.tipo === 'carimbo_fogo') {
                    detail = ` (${ex.dados?.qtdCarimbos || 1} carimbos)`;
                  } else if (ex.tipo === 'tiras_laterais' && ex.dados?.corTiras) {
                    detail = ` (${ex.dados.corTiras})`;
                  }
                  priceItems.push([`  > ${LABELS[ex.tipo] || ex.tipo}${detail}`, ex.preco || 0]);
                });
              }
            });
          } else {
            priceItems.push([det.descricaoProduto || 'Bota Pronta Entrega', parseFloat(det.valorManual) || o.preco]);
          }
          break;
        }
        default:
          priceItems.push([extraLabel, o.preco]);
          break;
      }
    } else {
      if (o.modelo) {
        const modeloP = priceWithFallback(['modelos', 'tamanho-genero-modelo'], o.modelo, MODELOS.find(m => m.label === o.modelo)?.preco);
        priceItems.push(['Modelo: ' + o.modelo, modeloP]);
      }
      if (o.sobMedida) priceItems.push(['Sob Medida', SOB_MEDIDA_PRECO]);
      if (o.acessorios) {
        o.acessorios.split(', ').filter(Boolean).forEach(a => {
          const p = ACESSORIOS.find(x => x.label === a)?.preco;
          if (p) priceItems.push([a, p]);
        });
      }
      ([
        [o.couroCano, 'couro_cano'],
        [o.couroGaspea, 'couro_gaspea'],
        [o.couroTaloneira, 'couro_taloneira'],
      ] as [string | undefined, string][]).forEach(([t, cat]) => {
        if (!t) return;
        const fb = COURO_PRECOS[t];
        const p = priceWithFallback([cat], t, fb);
        if (p > 0) priceItems.push(['Couro: ' + t, p]);
      });
      const desenvP = DESENVOLVIMENTO.find(d => d.label === o.desenvolvimento)?.preco;
      if (desenvP) priceItems.push(['Desenvolvimento: ' + o.desenvolvimento, desenvP]);
      const bordadoLists: [string | undefined, typeof BORDADOS_CANO, string[]][] = [
        [o.bordadoCano, BORDADOS_CANO, ['bordados-cano', 'bordado_cano', 'bordados-visual']],
        [o.bordadoGaspea, BORDADOS_GASPEA, ['bordados-gaspea', 'bordado_gaspea', 'bordados-visual']],
        [o.bordadoTaloneira, BORDADOS_TALONEIRA, ['bordados-taloneira', 'bordado_taloneira', 'bordados-visual']],
      ];
      bordadoLists.forEach(([bStr, list, cats]) => {
        if (bStr) bStr.split(', ').filter(Boolean).forEach(b => {
          const fallback = list.find(x => x.label === b)?.preco;
          const p = priceWithFallback(cats, b, fallback);
          if (p) priceItems.push([b.includes('Bordado Variado') ? (b + ' (variado)') : b, p]);
        });
      });
      if (o.nomeBordadoDesc || o.personalizacaoNome) priceItems.push(['Nome Bordado', NOME_BORDADO_PRECO]);
      if (o.laserCano) priceItems.push(['Laser Cano', LASER_CANO_PRECO]);
      if (o.corGlitterCano) priceItems.push(['Glitter/Tecido Cano', GLITTER_CANO_PRECO]);
      if (o.laserGaspea) priceItems.push(['Laser Gáspea', LASER_GASPEA_PRECO]);
      if (o.corGlitterGaspea) priceItems.push(['Glitter/Tecido Gáspea', GLITTER_GASPEA_PRECO]);
      if (o.pintura === 'Sim') priceItems.push(['Pintura', PINTURA_PRECO]);
      if (o.estampa === 'Sim') priceItems.push(['Estampa', ESTAMPA_PRECO]);
      const areaP = AREA_METAL.find(a => a.label === o.metais)?.preco;
      if (areaP) priceItems.push(['Área Metal: ' + o.metais, areaP]);
      if (o.strassQtd) priceItems.push([`Strass (${o.strassQtd} un.)`, o.strassQtd * STRASS_PRECO]);
      if (o.cruzMetalQtd) priceItems.push([`Cruz metal (${o.cruzMetalQtd} un.)`, o.cruzMetalQtd * CRUZ_METAL_PRECO]);
      if (o.bridaoMetalQtd) priceItems.push([`Bridão metal (${o.bridaoMetalQtd} un.)`, o.bridaoMetalQtd * BRIDAO_METAL_PRECO]);
      if (o.trisce === 'Sim') priceItems.push(['Tricê', TRICE_PRECO]);
      if (o.tiras === 'Sim') priceItems.push(['Tiras', TIRAS_PRECO]);
      const soladoP = SOLADO.find(s => s.label === o.solado)?.preco;
      if (soladoP) priceItems.push(['Solado: ' + o.solado, soladoP]);
      const corSolaP = getCorSolaPrecoContextual(o.modelo, o.solado, o.formatoBico, o.corSola);
      if (corSolaP) priceItems.push(['Cor Sola: ' + o.corSola, corSolaP]);
      const corViraP = COR_VIRA.find(c => c.label === o.corVira)?.preco || 0;
      if (corViraP > 0) priceItems.push(['Cor Vira: ' + o.corVira, corViraP]);
      if (o.costuraAtras === 'Sim') priceItems.push(['Costura Atrás', COSTURA_ATRAS_PRECO]);
      const carimboP = CARIMBO.find(c => c.label === o.carimbo)?.preco;
      if (carimboP) priceItems.push([o.carimbo!, carimboP]);
      if (o.adicionalValor && o.adicionalValor > 0) priceItems.push(['Adicional: ' + (o.adicionalDesc || ''), o.adicionalValor]);
    }

    const isBotaPE_cob = o.tipoExtra === 'bota_pronta_entrega';
    const subtotalCalc = priceItems.reduce((s, [, v]) => s + (Number(v) || 0), 0);
    const orderTotal = getOrderFinalValue(o);
    const baseDb = getOrderBaseValue(o);
    const tabelaDivergente = (!o.tipoExtra || o.tipoExtra === 'cinto')
      && subtotalCalc > 0
      && Math.abs(subtotalCalc - baseDb) > 0.01;
    if (o.desconto && o.desconto !== 0) {
      const isAcr = o.desconto < 0;
      const label = isAcr ? 'Acréscimo' : 'Desconto';
      priceItems.push([label, Math.abs(o.desconto)]);
    }
    const ultimaJust = [...(o.alteracoes || [])]
      .reverse()
      .find((a: any) => a.afetouValor && a.justificativa);
    const justifTextoLimpo = ultimaJust
      ? (ultimaJust as any).justificativa
          .replace(/^\s*(Acréscimo|Desconto)\s+aplicado:\s*R\$\s*[\d.,]+\s*[—\-–]\s*/i, '')
          .trim()
      : '';
    const justifLines: string[] = ultimaJust
      ? [`Justificativa (${(ultimaJust as any).data} por ${(ultimaJust as any).usuario || '—'}): ${justifTextoLimpo}`]
      : [];
    const divergLines: string[] = tabelaDivergente
      ? [`(valor gravado no pedido — soma da tabela atual: ${formatCurrency(subtotalCalc)})`]
      : [];
    const compText = [
      ...priceItems.map(([name, val]) => `${name} ${formatCurrency(val)}`),
      ...divergLines,
      ...justifLines,
    ]
      .join('\n')
      .replace(/→/g, '->').replace(/←/g, '<-')
      .replace(/—|–/g, '-');

    doc.setFontSize(6);
    const lines = doc.splitTextToSize(compText, cols[2] - 6);
    const minRowH = (o.desconto && o.desconto !== 0) ? 20 : 14;
    const rowH = Math.max(minRowH, lines.length * 3.5 + 6);

    if (y + rowH > 280) { doc.addPage(); y = 20; }

    doc.setLineWidth(0.2);
    doc.rect(mx, y, tableW, rowH);
    let colX = mx;
    for (let i = 0; i < cols.length - 1; i++) {
      colX += cols[i];
      doc.line(colX, y, colX, y + rowH);
    }

    doc.setFontSize(8);
    const numLinesCob = doc.splitTextToSize(o.numero, cols[0] - 4);
    numLinesCob.forEach((line: string, li: number) => {
      doc.text(line, cx[0] + 1, y + 5 + li * 3);
    });

    try {
      const bcVal = orderBarcodeValue(o.numero, o.id);
      const bcUrl = barcodeDataUrl(bcVal);
      const bcW = cols[0] - 4;
      const bcH = 7;
      doc.addImage(bcUrl, 'PNG', cx[0] + 2, y + 6, bcW, bcH);
    } catch (_) {}

    doc.setFontSize(7);
    doc.text(formatDateBR(o.dataCriacao), cx[1] + 1, y + 5);

    doc.setFontSize(6);
    doc.text(lines, cx[2] + 1, y + 4);

    if (o.desconto && o.desconto !== 0) {
      const isAcrescimo = o.desconto < 0;
      if (isAcrescimo) doc.setFillColor(22, 163, 74); else doc.setFillColor(220, 38, 38);
      const cxBall = cx[0] + cols[0] / 2;
      const cyBall = y + 17;
      doc.circle(cxBall, cyBall, 2.0, 'F');
      doc.setFillColor(0, 0, 0);
    }

    doc.setFontSize(8);
    const detCob = (o.extraDetalhes || {}) as any;
    const realQtdCob = isBotaPE_cob && Array.isArray(detCob.botas) ? detCob.botas.length : o.quantidade;
    doc.text(String(realQtdCob), cx[3] + 1, y + 5);
    doc.text(formatCurrency(orderTotal), cx[4] + 1, y + 5);

    y += rowH;
    totalValor += orderTotal;
    totalQtd += realQtdCob;
  });

  if (y + 10 > 285) { doc.addPage(); y = 20; }
  doc.setFillColor(232, 232, 232);
  doc.rect(mx, y, tableW, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', cx[0] + 1, y + 7);
  doc.text(String(totalQtd), cx[3] + 1, y + 7);
  doc.text(formatCurrency(totalValor), cx[4] + 1, y + 7);

  stampPageNumbers(doc);

  return { doc, totalValor, totalQtd };
}

export function buildCobrancaFileName(opts: {
  vendedorLabel: string;
  geradoEm: string; // dd/mm/yyyy
  totalValor: number;
  totalQtd: number;
  sufixo?: string; // ex.: '(preços atuais)'
}): string {
  const dateFile = opts.geradoEm.replace(/\//g, '-');
  const valorFile = formatCurrency(opts.totalValor).replace(/[^\d.,]/g, '').trim();
  const sufixo = opts.sufixo ? ` ${opts.sufixo}` : '';
  return `Cobrança - ${opts.vendedorLabel} - ${dateFile} - R$ ${valorFile} - ${opts.totalQtd} pares${sufixo}.pdf`;
}
