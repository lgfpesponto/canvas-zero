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
  const date = parts.length === 3 ? `${parts[2]}/${parts[1]}` : raw;
  return `${date}${order.horaCriacao ? ` ${order.horaCriacao}` : ''}`;
}

/** Exibe apenas o primeiro nome; exceção: Maria Gabriela → Gabriela. */
function shortVendorName(value: unknown): string {
  const name = clean(value);
  if (!name) return '—';
  const lowerName = name.toLowerCase();
  if (lowerName.startsWith('maria gabriela')) return 'Gabriela';
  return name.split(/\s+/)[0];
}

/** Cliente só aparece para Stefany, Site (Rancho Chique) e Juliana. */
function canShowCliente(vendedor: unknown): boolean {
  const name = clean(vendedor).toLowerCase();
  return name.includes('stefany') || name.includes('juliana') || name === 'site' || name.includes('rancho chique');
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

    const qrSize = 19;
    let qrDataUrl = '';
    const photo = order.fotos?.find(url => typeof url === 'string' && url.startsWith('http'));
    if (photo) {
      try {
        qrDataUrl = await QRCode.toDataURL(photo, { width: 280, margin: 1 });
      } catch {
        qrDataUrl = '';
      }
    }

    const headerGap = 5;
    const headerColWidth = (contentWidth - headerGap) / 2;
    const headerRightX = margin + headerColWidth + headerGap;
    const headerFontSize = 10.8;
    const headerLineHeight = 4.7;
    const headerRowGap = 1;
    const measureHeaderField = (label: string, value: string) => {
      doc.setFontSize(headerFontSize);
      doc.setFont('helvetica', 'bold');
      const labelWidth = doc.getTextWidth(label) + 1.1;
      return { labelWidth, lines: wrapText(doc, value, Math.max(8, headerColWidth - labelWidth)) };
    };

    // Colunas independentes: quando o cliente não aparece, "Modelo" sobe — sem linha vazia.
    const col1Fields = [
      { label: 'Código:', value: code },
      { label: 'Data:', value: orderDate(order) || '—' },
      { label: 'Tamanho:', value: size || '—' },
    ];
    const col2Fields = [
      { label: 'Vendedor:', value: shortVendorName(order.vendedor) },
      ...(canShowCliente(order.vendedor) ? [{ label: 'Cliente:', value: clean(order.cliente) || '—' }] : []),
      { label: 'Modelo:', value: model || '—' },
    ];

    const drawHeaderColumn = (fields: Array<{ label: string; value: string }>, x: number) => {
      let y = 8;
      for (const field of fields) {
        const measured = measureHeaderField(field.label, field.value);
        doc.setFontSize(headerFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(field.label, x, y);
        doc.text(measured.lines, x + measured.labelWidth, y);
        y += measured.lines.length * headerLineHeight + headerRowGap;
      }
      return y - headerRowGap;
    };

    const headerBottom = Math.max(
      drawHeaderColumn(col1Fields, margin),
      drawHeaderColumn(col2Fields, headerRightX),
    ) + 0.5;
    doc.line(margin, headerBottom, pageWidth - margin, headerBottom);

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

    const stubTop = 120;
    const qrY = stubTop - qrSize - 2;
    const bodyTop = headerBottom;
    const bodyBottom = stubTop - 2;
    const bodyGap = 5;
    const bodyColWidth = (contentWidth - bodyGap) / 2;
    const bodyRightX = margin + bodyColWidth + bodyGap;
    let bodyFontSize = headerFontSize;
    let lineHeight = 4.6;
    const titleFontSize = headerFontSize;
    const sectionTitleHeight = 6.8;
    const sectionGap = 2;

    type LaidOutSection = Section & { lines: string[]; height: number };
    const layoutSections = (fontSize: number, lh: number): LaidOutSection[] => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      return sections.map(section => {
        const lines = section.values.flatMap(value => wrapText(doc, value, bodyColWidth - 2));
        return { ...section, lines, height: sectionTitleHeight + lines.length * lh + sectionGap };
      });
    };

    const placeSections = (items: LaidOutSection[]) => {
      const placements: Array<LaidOutSection & { column: number; y: number }> = [];
      const limits = [bodyBottom, qrDataUrl ? qrY - 1 : bodyBottom];
      let column = 0;
      let y = bodyTop;
      for (const section of items) {
        if (y + section.height > limits[column] && column === 0) {
          column = 1;
          y = bodyTop;
        }
        if (y + section.height > limits[column]) return null;
        placements.push({ ...section, column, y });
        y += section.height;
      }
      return placements;
    };

    let laidOut = layoutSections(bodyFontSize, lineHeight);
    let placements = placeSections(laidOut);
    while (!placements && bodyFontSize > 6) {
      bodyFontSize -= 0.25;
      lineHeight = Math.max(3, bodyFontSize * 0.43);
      laidOut = layoutSections(bodyFontSize, lineHeight);
      placements = placeSections(laidOut);
    }

    for (const section of placements || []) {
      const x = section.column === 0 ? margin : bodyRightX;
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, x, section.y + 3.3);
      doc.setFontSize(bodyFontSize);
      doc.setFont('helvetica', 'bold');
      if (section.lines.length) {
        doc.text(section.lines, x + 1, section.y + sectionTitleHeight + 0.8, {
          lineHeightFactor: lineHeight / (bodyFontSize * 0.352778),
        });
      }
    }

    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - qrSize, qrY, qrSize, qrSize);
      } catch {
        // Mantém a ficha legível mesmo se o navegador não conseguir inserir a imagem.
      }
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

    let stubFontSize = 8.8;
    let stubLineHeight = 3.9;
    let soleLines: string[] = [];
    const fitStub = () => {
      doc.setFontSize(stubFontSize);
      doc.setFont('helvetica', 'bold');
      soleLines = soleValues.flatMap(line => wrapText(doc, line.toUpperCase(), stubWidth));
    };
    fitStub();
    while (soleLines.length * stubLineHeight > 18.5 && stubFontSize > 7) {
      stubFontSize -= 0.25;
      stubLineHeight = Math.max(3.1, stubFontSize * 0.44);
      fitStub();
    }
    doc.setFontSize(stubFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(soleLines, stubX, stubTop + 5, {
      lineHeightFactor: stubLineHeight / (stubFontSize * 0.352778),
    });

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text('7ESTRIVOS', margin, pageHeight - 2.5);
    doc.text(`${index + 1}/${list.length}`, pageWidth - margin, pageHeight - 2.5, { align: 'right' });
  }

  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  void recordPrintHistory(list.map(order => order.id), 'Ficha de Produção Adesiva', meta?.userName || '');
  doc.save(`Fichas Adesivas - ${date} - ${time}.pdf`);
  return { generated: list.length, ignored };
}
