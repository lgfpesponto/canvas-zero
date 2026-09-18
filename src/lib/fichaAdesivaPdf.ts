import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { orderBarcodeValue, type Order } from '@/contexts/AuthContext';
import { getBolaGrandeQtd } from '@/lib/bolaGrande';
import { recordPrintHistory } from '@/lib/printHistory';

export interface FichaAdesivaResult {
  generated: number;
  ignored: number;
}

const clean = (value: unknown) => String(value ?? '').trim();
const lower = (value: unknown) => clean(value).toLowerCase();

function barcodeDataUrl(value: string): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 48,
      displayValue: false,
      margin: 1,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

function orderDate(order: Order): string {
  const raw = clean(order.dataCriacao);
  if (!raw) return '';
  const parts = raw.split('-');
  const date = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : raw;
  return `${date}${order.horaCriacao ? ` ${order.horaCriacao}` : ''}`;
}

function bootExtras(order: Order): string[] {
  const det = order.extraDetalhes || {};
  const values: string[] = [];
  if (order.trisce === 'Sim') values.push(`Tricê: ${order.triceDesc || 'sim'}`);
  if (order.tiras === 'Sim') values.push(`Tiras: ${order.tirasDesc || 'sim'}`);
  if (det.franja) {
    const detail = [det.franjaCouro, det.franjaCor].filter(Boolean).join(' — ');
    values.push(`Franja: ${detail || 'sim'}`);
  }
  if (det.corrente) values.push(`Corrente: ${det.correnteCor || 'sim'}`);
  if (order.costuraAtras === 'Sim') values.push('Costura atrás: sim');
  if (order.carimbo) values.push(`Carimbo: ${order.carimbo}${order.carimboDesc ? ` - ${order.carimboDesc}` : ''}`);
  return values;
}

function bootMetals(order: Order): string[] {
  const det = order.extraDetalhes || {};
  const values: string[] = [];
  const base = [order.metais, order.tipoMetal, order.corMetal].filter(Boolean).join(', ');
  if (base) values.push(base);
  if (order.strassQtd) values.push(`Strass x${order.strassQtd}`);
  const bolaGrandeQtd = getBolaGrandeQtd(order);
  if (bolaGrandeQtd) values.push(`Bola grande x${bolaGrandeQtd}`);
  if (order.cruzMetalQtd) values.push(`Cruz x${order.cruzMetalQtd}`);
  if (order.bridaoMetalQtd) values.push(`Bridão x${order.bridaoMetalQtd}`);
  if (det.cavaloMetal && Number(det.cavaloMetalQtd)) values.push(`Cavalo x${Number(det.cavaloMetalQtd)}`);
  return values;
}

function bootPesponto(order: Order): string[] {
  return [
    order.corLinha ? `Linha: ${order.corLinha}` : '',
    order.corBorrachinha ? `Borrachinha: ${order.corBorrachinha}` : '',
    order.corVivo ? `Vivo: ${order.corVivo}` : '',
  ].filter(Boolean);
}

function beltSize(order: Order): string {
  return clean(order.extraDetalhes?.tamanhoCinto || order.tamanho);
}

function wrapText(doc: jsPDF, value: string, width: number): string[] {
  return doc.splitTextToSize(value || '—', width) as string[];
}

function abbrevSolado(value: unknown): string {
  const text = clean(value);
  return text.toLowerCase() === 'couro reta' ? 'COURO' : text.toUpperCase();
}

function abbrevCorSola(value: unknown): string {
  const text = clean(value);
  return text.toLowerCase() === 'pintada de preto' ? 'P. PRETA' : text.toUpperCase();
}

function abbrevBico(value: unknown): string {
  return (clean(value) || 'quadrado').replace(/\bfino\b/gi, 'BF').toUpperCase();
}

/** Gera uma ficha vertical de 100 × 150 mm, própria para impressora térmica. */
export async function generateFichaAdesivaPDF(
  orders: Order[],
  meta?: { userName?: string },
): Promise<FichaAdesivaResult> {
  const list = orders.filter(order => !order.tipoExtra || order.tipoExtra === 'cinto');
  const ignored = orders.length - list.length;
  if (list.length === 0) return { generated: 0, ignored };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
  const pageWidth = 100;
  const pageHeight = 150;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;

  for (let index = 0; index < list.length; index += 1) {
    const order = list[index];
    if (index > 0) doc.addPage([100, 150], 'portrait');

    const isBelt = order.tipoExtra === 'cinto';
    const detail = order.extraDetalhes || {};
    const code = clean(order.numero).replace(/^7E-/, '');
    const size = isBelt ? beltSize(order) : [order.tamanho, order.genero ? order.genero.slice(0, 3).toLowerCase() : ''].filter(Boolean).join(' ');
    const model = isBelt ? 'Cinto' : lower(order.modelo);

    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('7ESTRIVOS', margin, 10);

    const qrSize = 24;
    const qrX = pageWidth - margin - qrSize;
    let hasQr = false;
    const photo = order.fotos?.find(url => typeof url === 'string' && url.startsWith('http'));
    if (photo) {
      try {
        const qr = await QRCode.toDataURL(photo, { width: 280, margin: 1 });
        doc.addImage(qr, 'PNG', qrX, 4, qrSize, qrSize);
        hasQr = true;
      } catch {
        hasQr = false;
      }
    }

    const leftHeaderWidth = hasQr ? qrX - margin - 2 : contentWidth;
    const drawHeaderField = (label: string, value: string, y: number, width = leftHeaderWidth): number => {
      doc.setFontSize(8.3);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      const labelWidth = doc.getTextWidth(label) + 1.3;
      doc.setFont('helvetica', 'normal');
      const lines = wrapText(doc, value || '—', Math.max(8, width - labelWidth));
      doc.text(lines, margin + labelWidth, y);
      return y + Math.max(1, lines.length) * 3.4;
    };

    let headerY = 15;
    headerY = drawHeaderField('Código:', code, headerY);
    headerY = drawHeaderField('Vendedor:', clean(order.vendedor), headerY);
    headerY = drawHeaderField('Data:', orderDate(order), headerY);
    headerY = drawHeaderField('Cliente:', clean(order.cliente) || '—', headerY);

    const infoTop = Math.max(headerY + 0.8, hasQr ? 31 : headerY + 0.8);
    const infoGap = 4;
    const infoColWidth = (contentWidth - infoGap) / 2;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Tamanho:', margin, infoTop);
    doc.setFont('helvetica', 'normal');
    const sizeLabelWidth = doc.getTextWidth('Tamanho:') + 1.3;
    const sizeLines = wrapText(doc, size || '—', infoColWidth - sizeLabelWidth);
    doc.text(sizeLines, margin + sizeLabelWidth, infoTop);

    const modelX = margin + infoColWidth + infoGap;
    doc.setFont('helvetica', 'bold');
    doc.text('Modelo:', modelX, infoTop);
    const modelLabelWidth = doc.getTextWidth('Modelo:') + 1.3;
    doc.setFont('helvetica', 'normal');
    const modelLines = wrapText(doc, model || '—', infoColWidth - modelLabelWidth);
    doc.text(modelLines, modelX + modelLabelWidth, infoTop);

    const headerBottom = infoTop + Math.max(sizeLines.length, modelLines.length) * 3.4 + 1.5;
    doc.line(margin, headerBottom, pageWidth - margin, headerBottom);

    if (hasQr) {
      doc.setFontSize(5.8);
      doc.setFont('helvetica', 'italic');
      doc.text('Foto', qrX + qrSize / 2, 30, { align: 'center' });
    }

    type Section = { title: string; values: string[] };
    const sections: Section[] = [];
    if (order.observacao) sections.push({ title: 'OBSERVAÇÃO', values: [clean(order.observacao)] });
    if (!isBelt) {
      const pesponto = bootPesponto(order);
      const metals = bootMetals(order);
      const extras = bootExtras(order);
      if (pesponto.length) sections.push({ title: 'PESPONTO', values: pesponto });
      if (order.acessorios) sections.push({ title: 'ACESSÓRIOS', values: [clean(order.acessorios)] });
      if (metals.length) sections.push({ title: 'METAIS', values: metals });
      if (extras.length) sections.push({ title: 'EXTRAS', values: extras });
    } else {
      const beltAccessories = [
        detail.fivela ? `Fivela: ${detail.fivela}${detail.fivelaOutroDesc ? ` ${detail.fivelaOutroDesc}` : ''}` : '',
        detail.bordadoP === 'Tem' ? `Bordado: ${detail.bordadoPDesc || 'sim'}` : '',
        detail.nomeBordado === 'Tem' ? `Nome: ${detail.nomeBordadoDesc || 'sim'}` : '',
        detail.carimbo ? `Carimbo: ${detail.carimbo}${detail.carimboDesc ? ` ${detail.carimboDesc}` : ''}` : '',
      ].filter(Boolean);
      if (beltAccessories.length) sections.push({ title: 'ACESSÓRIOS', values: beltAccessories });
    }

    const stubTop = 116;
    const bodyTop = headerBottom + 3;
    const bodyBottom = stubTop - 2;
    let bodyFontSize = 8;
    let lineHeight = 3.45;
    const sectionTitleHeight = 6.2;
    const sectionGap = 1.5;

    const layoutSections = (fontSize: number, lh: number) => {
      doc.setFontSize(fontSize);
      return sections.map(section => ({
        ...section,
        lines: section.values.flatMap(value => wrapText(doc, value, contentWidth - 3)),
      }));
    };

    let laidOut = layoutSections(bodyFontSize, lineHeight);
    const contentHeight = () => laidOut.reduce((sum, section) => sum + sectionTitleHeight + section.lines.length * lineHeight + sectionGap, 0);
    while (contentHeight() > bodyBottom - bodyTop && bodyFontSize > 5.5) {
      bodyFontSize -= 0.25;
      lineHeight = Math.max(2.65, bodyFontSize * 0.43);
      laidOut = layoutSections(bodyFontSize, lineHeight);
    }

    let y = bodyTop;
    for (const section of laidOut) {
      doc.setLineWidth(0.22);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y + 3.1);
      y += sectionTitleHeight;
      doc.setFontSize(bodyFontSize);
      doc.setFont('helvetica', 'normal');
      if (section.lines.length) doc.text(section.lines, margin + 1, y);
      y += section.lines.length * lineHeight + sectionGap;
    }

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, stubTop, pageWidth - margin, stubTop);
    doc.setLineDashPattern([], 0);

    const barcode = barcodeDataUrl(orderBarcodeValue(order.numero, order.id));
    if (barcode) {
      try {
        doc.addImage(barcode, 'PNG', margin, stubTop + 3, 46, 14);
      } catch {
        // Mantém a ficha legível mesmo se o navegador não conseguir gerar a imagem.
      }
    }

    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'bold');
    doc.text(code, margin + 23, stubTop + 20.5, { align: 'center' });

    const stubX = 53;
    const stubWidth = pageWidth - margin - stubX;
    const isRustica = order.solado === 'Rústica';
    const vira = !isRustica && ['rosa', 'preto'].includes(lower(order.corVira)) ? ` VIRA ${clean(order.corVira).toUpperCase()}` : '';
    const soleValues = isBelt
      ? [[size || '—', 'CINTO'].join(' ')]
      : [
          [size || '—', abbrevSolado(order.solado || 'borracha'), isRustica ? '' : abbrevCorSola(order.corSola)].filter(Boolean).join(' '),
          `${abbrevBico(order.formatoBico)}${vira}`,
          order.forma ? `FORMA: ${order.forma}` : '',
        ].filter(Boolean);

    let stubFontSize = 7.8;
    let stubLineHeight = 3.5;
    let soleLines: string[] = [];
    const fitStub = () => {
      doc.setFontSize(stubFontSize);
      soleLines = soleValues.flatMap(line => wrapText(doc, line.toUpperCase(), stubWidth));
    };
    fitStub();
    while (soleLines.length * stubLineHeight > 23 && stubFontSize > 6) {
      stubFontSize -= 0.25;
      stubLineHeight = Math.max(2.8, stubFontSize * 0.45);
      fitStub();
    }
    doc.setFontSize(stubFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(soleLines, stubX, stubTop + 5);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${index + 1}/${list.length}`, pageWidth - margin, pageHeight - 2.5, { align: 'right' });
  }

  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  void recordPrintHistory(list.map(order => order.id), 'Ficha de Produção Adesiva', meta?.userName || '');
  doc.save(`Fichas Adesivas - ${date} - ${time}.pdf`);
  return { generated: list.length, ignored };
}
