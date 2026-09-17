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

function bootAccessories(order: Order): string {
  const det = order.extraDetalhes || {};
  const values: string[] = [];
  if (order.acessorios) values.push(order.acessorios);
  if (order.trisce === 'Sim') values.push(`Tricê${order.triceDesc ? `: ${order.triceDesc}` : ''}`);
  if (order.tiras === 'Sim') values.push(`Tiras${order.tirasDesc ? `: ${order.tirasDesc}` : ''}`);
  if (det.franja) {
    const detail = [det.franjaCouro, det.franjaCor].filter(Boolean).join(' ');
    values.push(`Franja${detail ? `: ${detail}` : ''}`);
  }
  if (det.corrente) values.push(`Corrente${det.correnteCor ? `: ${det.correnteCor}` : ''}`);
  if (order.costuraAtras === 'Sim') values.push('Costura atrás');
  return values.join(' | ');
}

function bootMetals(order: Order): string {
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
  return values.join(' | ');
}

function bootPesponto(order: Order): string {
  return [
    order.corLinha ? `Linha: ${order.corLinha}` : '',
    order.corBorrachinha ? `Borrachinha: ${order.corBorrachinha}` : '',
    order.corVivo ? `Vivo: ${order.corVivo}` : '',
  ].filter(Boolean).join(' | ');
}

function beltSize(order: Order): string {
  return clean(order.extraDetalhes?.tamanhoCinto || order.tamanho);
}

function fitText(doc: jsPDF, value: string, width: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(value, width) as string[];
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1].replace(/\s+$/, '');
  while (last && doc.getTextWidth(`${last}…`) > width) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last}…`;
  return kept;
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
    doc.setLineWidth(0.35);
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

    const headerWidth = hasQr ? qrX - margin - 2 : contentWidth;
    const drawHeaderLine = (label: string, value: string, y: number) => {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      const labelWidth = doc.getTextWidth(label) + 1.5;
      doc.setFont('helvetica', 'normal');
      const fitted = fitText(doc, value || '—', headerWidth - labelWidth, 1)[0];
      doc.text(fitted, margin + labelWidth, y);
    };

    drawHeaderLine('Código:', code, 15);
    drawHeaderLine('Vendedor:', clean(order.vendedor), 19.5);
    drawHeaderLine('Data:', orderDate(order), 24);
    if (hasQr) {
      doc.setFontSize(5.8);
      doc.setFont('helvetica', 'italic');
      doc.text('Foto', qrX + qrSize / 2, 30, { align: 'center' });
    }

    doc.line(margin, 32, pageWidth - margin, 32);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Tamanho:', margin, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(size || '—', 21, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('Modelo:', 48, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(fitText(doc, model || '—', 31, 1)[0], 62, 38);

    type Section = { title: string; value: string; maxLines: number };
    const sections: Section[] = [];
    if (order.cliente) sections.push({ title: 'CLIENTE', value: clean(order.cliente), maxLines: 1 });
    if (order.observacao) sections.push({ title: 'OBSERVAÇÃO', value: clean(order.observacao), maxLines: 3 });
    if (!isBelt) {
      const pesponto = bootPesponto(order);
      const accessories = bootAccessories(order);
      const metals = bootMetals(order);
      if (pesponto) sections.push({ title: 'PESPONTO', value: pesponto, maxLines: 2 });
      if (accessories) sections.push({ title: 'ACESSÓRIOS', value: accessories, maxLines: 2 });
      if (metals) sections.push({ title: 'METAIS', value: metals, maxLines: 2 });
    } else {
      const beltAccessories = [
        detail.fivela ? `Fivela: ${detail.fivela}${detail.fivelaOutroDesc ? ` ${detail.fivelaOutroDesc}` : ''}` : '',
        detail.bordadoP === 'Tem' ? `Bordado: ${detail.bordadoPDesc || 'sim'}` : '',
        detail.nomeBordado === 'Tem' ? `Nome: ${detail.nomeBordadoDesc || 'sim'}` : '',
        detail.carimbo ? `Carimbo: ${detail.carimbo}${detail.carimboDesc ? ` ${detail.carimboDesc}` : ''}` : '',
      ].filter(Boolean).join(' | ');
      if (beltAccessories) sections.push({ title: 'ACESSÓRIOS', value: beltAccessories, maxLines: 3 });
    }

    let y = 42;
    const bodyBottom = 112;
    for (const section of sections) {
      if (y + 7 > bodyBottom) break;
      doc.setFillColor(232, 232, 232);
      doc.rect(margin, y, contentWidth, 5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin + 1.5, y + 3.6);
      y += 7;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const availableLines = Math.max(1, Math.min(section.maxLines, Math.floor((bodyBottom - y) / 3.5)));
      const lines = fitText(doc, section.value, contentWidth - 3, availableLines);
      doc.text(lines, margin + 1.5, y);
      y += lines.length * 3.5 + 1;
    }

    const stubTop = 114;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, stubTop, pageWidth - margin, stubTop);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CANHOTO MONTAGEM', margin, stubTop + 5);
    doc.setFontSize(10);
    doc.text(code, pageWidth - margin, stubTop + 5, { align: 'right' });

    const barcode = barcodeDataUrl(orderBarcodeValue(order.numero, order.id));
    if (barcode) {
      try {
        doc.addImage(barcode, 'PNG', margin, stubTop + 8, 46, 14);
      } catch {
        // Mantém a ficha legível mesmo se o navegador não conseguir gerar a imagem.
      }
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`CÓDIGO: ${code}`, margin, stubTop + 25);

    const stubX = 53;
    const stubWidth = pageWidth - margin - stubX;
    const soleLines = isBelt
      ? [`TAM: ${size || '—'}`, 'PRODUTO: CINTO']
      : [
          `TAM: ${size || '—'}`,
          `SOLA: ${[order.solado, order.corSola].filter(Boolean).join(' ') || '—'}`,
          `BICO: ${clean(order.formatoBico) || '—'}`,
          order.corVira && !['Bege', 'Neutra'].includes(order.corVira) ? `VIRA: ${order.corVira}` : '',
          order.forma ? `FORMA: ${order.forma}` : '',
        ].filter(Boolean);
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'bold');
    const fittedSoleLines = soleLines.flatMap(line => fitText(doc, line.toUpperCase(), stubWidth, 1));
    doc.text(fittedSoleLines.slice(0, 5), stubX, stubTop + 10);

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