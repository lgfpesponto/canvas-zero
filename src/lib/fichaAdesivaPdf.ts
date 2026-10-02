import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { orderBarcodeValue, type Order } from '@/contexts/AuthContext';
import { getBolaGrandeQtd } from '@/lib/bolaGrande';
import { recordPrintHistory } from '@/lib/printHistory';
import { sortOrdersForPrint } from '@/lib/orderPrintSort';

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

/** Etiqueta adesiva 60 × 40 mm: nº do pedido, código de barras e modelo, com marca d'água 7ESTRIVOS. */
export async function generateFichaAdesivaPDF(
  orders: Order[],
  meta?: { userName?: string },
): Promise<FichaAdesivaResult> {
  const list = sortOrdersForPrint(orders.filter(order => !order.tipoExtra || order.tipoExtra === 'cinto'));
  const ignored = orders.length - list.length;
  if (list.length === 0) return { generated: 0, ignored };

  const W = 60;
  const H = 40;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });

  for (let index = 0; index < list.length; index += 1) {
    const order = list[index];
    if (index > 0) doc.addPage([W, H], 'landscape');
    const isBelt = order.tipoExtra === 'cinto';
    const code = clean(order.numero).replace(/^7E-/, '');
    const model = isBelt ? 'CINTO' : (clean(order.modelo).toUpperCase() || '—');

    // Marca d'água discreta ao fundo
    doc.setTextColor(225, 225, 225);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('7ESTRIVOS', W / 2, H / 2 + 3, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    // Nº do pedido no topo
    let size = 14;
    doc.setFontSize(size);
    while (doc.getTextWidth(code) > W - 4 && size > 7) { size -= 0.5; doc.setFontSize(size); }
    doc.text(code, W / 2, 6.5, { align: 'center' });

    // Código de barras no centro
    const barcode = barcodeDataUrl(orderBarcodeValue(order.numero, order.id));
    if (barcode) {
      try { doc.addImage(barcode, 'PNG', 3, 8.5, W - 6, 16); } catch { /* segue sem imagem */ }
    }

    // Modelo embaixo
    let ms = 11;
    doc.setFontSize(ms);
    let lines = wrapText(doc, model, W - 4);
    while (lines.length > 2 && ms > 6) { ms -= 0.5; doc.setFontSize(ms); lines = wrapText(doc, model, W - 4); }
    doc.text(lines.slice(0, 2), W / 2, lines.length > 1 ? 29.5 : 31, { align: 'center', lineHeightFactor: 1.05 });

    doc.setFontSize(5);
    doc.setTextColor(120, 120, 120);
    doc.text('7ESTRIVOS', 2, H - 1.5);
    doc.text(`${index + 1}/${list.length}`, W - 2, H - 1.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  void recordPrintHistory(list.map(order => order.id), 'Etiqueta Adesiva 60x40', meta?.userName || '');
  doc.save(`Etiquetas 60x40 - ${date} - ${time}.pdf`);
  return { generated: list.length, ignored };
}
