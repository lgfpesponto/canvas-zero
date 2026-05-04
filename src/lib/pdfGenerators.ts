import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { orderBarcodeValue } from '@/contexts/AuthContext';
import { recordPrintHistory } from '@/lib/printHistory';
import { getOrderFinalValue } from '@/lib/order-logic';

/**
 * Stamps "Página X-Y" in the top-right corner of every page.
 * Must be called once, immediately before doc.save(...).
 * Adapts to any page size/orientation via getWidth().
 */
export function stampPageNumbers(doc: jsPDF) {
  const total = (doc as any).internal.pages.length - 1;
  if (total <= 0) return;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const prevSize = (doc as any).internal.getFontSize?.() ?? 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i}-${total}`, pageWidth - 6, 6, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(prevSize);
  }
}

const formatDateBR = (date: string, time?: string) => {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}${time ? ` — ${time}` : ''}`;
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const COURO_PRIORITY: Record<string, number> = {
  'crazy horse': 1,
  'látego': 2, 'latego': 2,
  'nobuck': 3,
  'fóssil': 4, 'fossil': 4,
  'floater': 5,
  'napa flay': 6,
};

export function getCouroSortKey(tipo: string): number {
  return COURO_PRIORITY[tipo.toLowerCase().trim()] ?? 99;
}

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

export function generateReportPDF(ordersToExport: any[], meta?: { userName: string }) {
  const doc = new jsPDF();
  const list = ordersToExport.slice().sort((a, b) => {
    const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
    if (numB !== numA) return numB - numA;
    return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
  });
  doc.setFontSize(18);
  doc.text('Relatório de Pedidos — 7ESTRIVOS', 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, 14, 28);

  let y = 38;
  list.forEach((o, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${o.numero}`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vendedor: ${o.vendedor} | Data: ${formatDateBR(o.dataCriacao, o.horaCriacao)} | Status: ${o.status}`, 14, y + 5);
    // Valor exibido = valor final do pedido (já com desconto, se houver).
    doc.text(`Valor: ${formatCurrency(getOrderFinalValue(o))} | Qtd: ${o.quantidade}`, 14, y + 10);
    y += 18;
  });

  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de Pedidos: ${list.length}`, 14, y + 5);
  doc.text(`Valor Total: ${formatCurrency(list.reduce((s, o) => s + getOrderFinalValue(o), 0))}`, 14, y + 12);
  stampPageNumbers(doc);
  void recordPrintHistory(list.map(o => o.id), 'Relatório de Pedidos', meta?.userName || '');
  doc.save('relatorio-pedidos.pdf');
}

export async function generateProductionSheetPDF(ordersToExport: any[], meta?: { userName: string }) {
  const list = ordersToExport.slice().sort((a, b) => {
    const prioA = getCouroSortKey(a.couroCano || '');
    const prioB = getCouroSortKey(b.couroCano || '');
    if (prioA !== prioB) return prioA - prioB;
    const tipoComp = (a.couroCano || '').localeCompare(b.couroCano || '');
    if (tipoComp !== 0) return tipoComp;
    const corComp = (a.corCouroCano || '').localeCompare(b.corCouroCano || '');
    if (corComp !== 0) return corComp;
    const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [148.5, 210] });
  const pw = 210;
  const ph = 148.5;
  const m = 6;

  for (let idx = 0; idx < list.length; idx++) {
    const order = list[idx];
    if (idx > 0) doc.addPage();

    const orderNumClean = order.numero.replace('7E-', '');

    // ─── HEADER ───
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('7ESTRIVOS', m + 2, m + 8);

    const qrSize = 30;
    const qrX = pw - qrSize - m - 2;
    const qrY = m + 2;
    let hasQR = false;
    if (order.fotos && order.fotos.length > 0 && order.fotos[0].startsWith('http')) {
      try {
        const qrDataUrl = await QRCode.toDataURL(order.fotos[0], { width: 300, margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        hasQR = true;
      } catch { /* skip */ }
    }

    const hx = m + 2;
    const hx2 = 105;
    let hy = m + 16;
    const hGap = 6;

    const printHeaderField = (label: string, value: string, x: number, y: number) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(label, x, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, x + doc.getTextWidth(label), y);
    };

    printHeaderField('Código:    ', orderNumClean, hx, hy);
    printHeaderField('Vendedor:  ', order.vendedor, hx, hy + hGap);
    const dateStr = `${order.dataCriacao.slice(8, 10)}/${order.dataCriacao.slice(5, 7)} ${order.horaCriacao}`;
    printHeaderField('Data:      ', dateStr, hx, hy + hGap * 2);

    // ─── BELT-SPECIFIC LAYOUT ───
    if (order.tipoExtra === 'cinto') {
      const rhMaxW = qrX - hx2 - 4;
      let rhY = hy;
      printHeaderField('Produto:   ', 'CINTO', hx2, rhY);
      rhY += hGap;
      const det = order.extraDetalhes || {};
      if (det.tamanhoCinto) {
        printHeaderField('Tamanho:   ', String(det.tamanhoCinto), hx2, rhY);
        rhY += hGap;
      }
      if (hasQR) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('Escaneie para ver a foto ->', hx2, rhY);
      }

      const headerBottom = m + 37;
      doc.setLineWidth(0.4);
      doc.line(m, headerBottom, pw - m, headerBottom);

      const descTop = headerBottom + 5;
      const fs = 11;
      const fieldGap = 5.5;
      const catGap = 3;
      const descBottom = (ph - 34) - 4;

      type CatField = { label: string; value: string };
      type Category = { title: string; fields: CatField[] };
      const categories: Category[] = [];

      const couroFields: CatField[] = [];
      if (det.tipoCouro) couroFields.push({ label: 'Tipo:', value: String(det.tipoCouro).toLowerCase() });
      if (det.corCouro) couroFields.push({ label: 'Cor:', value: String(det.corCouro).toLowerCase() });
      if (couroFields.length) categories.push({ title: 'COURO', fields: couroFields });

      const fivelaFields: CatField[] = [];
      if (det.fivela) {
        const fivelaText = det.fivela === 'Outro' && det.fivelaOutroDesc ? `outro — ${det.fivelaOutroDesc}` : det.fivela.toLowerCase();
        fivelaFields.push({ label: 'Tipo:', value: fivelaText });
      }
      if (fivelaFields.length) categories.push({ title: 'FIVELA', fields: fivelaFields });

      const bordFields: CatField[] = [];
      if (det.bordadoP === 'Tem') bordFields.push({ label: 'Bordado P:', value: `${det.bordadoPDesc || ''}${det.bordadoPCor ? ' ' + det.bordadoPCor : ''}`.toLowerCase() });
      if (det.nomeBordado === 'Tem') bordFields.push({ label: 'Nome:', value: `${det.nomeBordadoDesc || ''}${det.nomeBordadoCor ? ' cor: ' + det.nomeBordadoCor : ''}${det.nomeBordadoFonte ? ' fonte: ' + det.nomeBordadoFonte : ''}`.toLowerCase() });
      if (bordFields.length) categories.push({ title: 'BORDADOS', fields: bordFields });

      const carFields: CatField[] = [];
      if (det.carimbo) carFields.push({ label: 'Carimbo:', value: `${det.carimbo}${det.carimboDesc ? ' - ' + det.carimboDesc : ''}` });
      if (det.ondeAplicado) carFields.push({ label: 'Onde:', value: String(det.ondeAplicado) });
      if (carFields.length) categories.push({ title: 'CARIMBO', fields: carFields });

      if (order.observacao) categories.push({ title: 'OBS', fields: [{ label: '', value: order.observacao }] });

      const colWidth = (pw - m * 2 - 4);
      const startX = m + 3;
      let cy = descTop;
      let truncated = false;
      categories.forEach(cat => {
        if (cy > descBottom) { truncated = true; return; }
        doc.setFillColor(232, 232, 232);
        doc.rect(startX - 1, cy - 3.5, colWidth, 5, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(cat.title, startX, cy);
        cy += fieldGap;
        cat.fields.forEach(f => {
          if (cy > descBottom) { truncated = true; return; }
          doc.setFontSize(fs);
          if (f.label) {
            doc.setFont('helvetica', 'bold');
            doc.text(f.label, startX, cy);
            const lw = doc.getTextWidth(f.label) + 3;
            doc.setFont('helvetica', 'normal');
            const valLines = doc.splitTextToSize(f.value, colWidth - lw - 3);
            valLines.forEach((line: string, li: number) => {
              if (cy + li * (fieldGap * 0.8) <= descBottom) doc.text(line, startX + lw, cy + li * (fieldGap * 0.8));
              else truncated = true;
            });
            cy += Math.max(valLines.length, 1) * (fieldGap * 0.8);
          } else {
            doc.setFont('helvetica', 'normal');
            const valLines = doc.splitTextToSize(f.value, colWidth - 3);
            valLines.forEach((line: string, li: number) => {
              if (cy + li * (fieldGap * 0.8) <= descBottom) doc.text(line, startX, cy + li * (fieldGap * 0.8));
              else truncated = true;
            });
            cy += Math.max(valLines.length, 1) * (fieldGap * 0.8);
          }
        });
        cy += catGap;
      });
      if (truncated) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 0, 0);
        doc.text('...conteúdo excedido', startX, descBottom + 3);
        doc.setTextColor(0, 0, 0);
      }

      const stubTop = ph - 34;
      doc.setLineWidth(0.3);
      (doc as any).setLineDash([1, 1]);
      doc.line(m, stubTop - 2, pw - m, stubTop - 2);
      (doc as any).setLineDash([]);

      const stubAreaW = pw - m * 2;
      const stubW = stubAreaW / 3;
      const bcVal = orderBarcodeValue(order.numero, order.id);
      const bcUrl = barcodeDataUrl(bcVal, { width: 2, height: 40 });

      const beltStubs = ['BORDADO', 'PESPONTO', 'EXPEDIÇÃO'];
      beltStubs.forEach((stubName, si) => {
        const stubX = m + si * stubW;
        if (si > 0) {
          doc.setLineWidth(0.3);
          doc.line(stubX, stubTop, stubX, ph - m);
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(stubName, stubX + stubW / 2, stubTop + 4, { align: 'center' });
        if (bcUrl) { try { doc.addImage(bcUrl, 'PNG', stubX + 6, stubTop + 6, stubW - 12, 14); } catch {} }
        doc.setFontSize(10);
        doc.text(orderNumClean, stubX + stubW / 2, stubTop + 24, { align: 'center' });
      });

      continue;
    }

    // ─── BOOT LAYOUT ───
    const rhMaxW = qrX - hx2 - 4;
    let rhY = hy;

    let tamText = `${order.tamanho || ''}${order.genero ? ' ' + order.genero.substring(0, 3).toLowerCase() + '.' : ''}`;
    if (order.sobMedida) {
      tamText += ` | sob medida${order.sobMedidaDesc ? ': ' + order.sobMedidaDesc : ''}`;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const tamLabel = 'Tamanho:  ';
    doc.text(tamLabel, hx2, rhY);
    doc.setFont('helvetica', 'normal');
    const tamLabelW = doc.getTextWidth(tamLabel);
    const tamLines = doc.splitTextToSize(tamText, rhMaxW - tamLabelW);
    tamLines.forEach((line: string, li: number) => {
      doc.text(line, hx2 + tamLabelW, rhY + li * 4);
    });
    rhY += Math.max(tamLines.length, 1) * 4 + 2;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const modLabel = 'Modelo:   ';
    doc.text(modLabel, hx2, rhY);
    doc.setFont('helvetica', 'normal');
    const modLabelW = doc.getTextWidth(modLabel);
    const modeloText = (order.modelo || '').toLowerCase();
    const modLines = doc.splitTextToSize(modeloText, rhMaxW - modLabelW);
    modLines.forEach((line: string, li: number) => {
      doc.text(line, hx2 + modLabelW, rhY + li * 4);
    });
    rhY += Math.max(modLines.length, 1) * 4 + 2;

    if (hasQR) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Escaneie para ver a foto ->', hx2, rhY);
    }

    const headerBottom = m + 37;
    doc.setLineWidth(0.4);
    doc.line(m, headerBottom, pw - m, headerBottom);

    const descTop = headerBottom + 5;
    const fs = 11;
    const fieldGap = 5.5;
    const catGap = 3;
    const descBottom = (ph - 34) - 4;

    type CatField = { label: string; value: string };
    type Category = { title: string; fields: CatField[] };
    const categories: Category[] = [];

    // IDENTIFICAÇÃO (campos do topo do faça seu pedido que não cabem no header)
    const identFields: CatField[] = [];
    if (order.sobMedida && order.sobMedidaDesc) identFields.push({ label: 'Sob medida:', value: order.sobMedidaDesc.toLowerCase() });
    if (order.desenvolvimento) identFields.push({ label: 'Desenv.:', value: order.desenvolvimento.toLowerCase() });
    if (order.cliente) identFields.push({ label: 'Cliente:', value: order.cliente.toLowerCase() });
    if (identFields.length) categories.push({ title: 'IDENTIFICAÇÃO', fields: identFields });

    // COUROS
    const courosFields: CatField[] = [];
    if (order.couroCano) courosFields.push({ label: 'Cano:', value: `${order.couroCano.toLowerCase()}${order.corCouroCano ? ' ' + order.corCouroCano.toLowerCase() : ''}` });
    if (order.couroGaspea) courosFields.push({ label: 'Gáspea:', value: `${order.couroGaspea.toLowerCase()}${order.corCouroGaspea ? ' ' + order.corCouroGaspea.toLowerCase() : ''}` });
    if (order.couroTaloneira) courosFields.push({ label: 'Taloneira:', value: `${order.couroTaloneira.toLowerCase()}${order.corCouroTaloneira ? ' ' + order.corCouroTaloneira.toLowerCase() : ''}` });
    if (courosFields.length) categories.push({ title: 'COUROS', fields: courosFields });

    // PESPONTO
    const pespontoFields: CatField[] = [];
    if (order.corLinha) pespontoFields.push({ label: 'Linha:', value: order.corLinha.toLowerCase() });
    if (order.corBorrachinha) pespontoFields.push({ label: 'Borrachinha:', value: order.corBorrachinha.toLowerCase() });
    if (order.corVivo) pespontoFields.push({ label: 'Vivo:', value: order.corVivo.toLowerCase() });
    if (pespontoFields.length) categories.push({ title: 'PESPONTO', fields: pespontoFields });

    // SOLADOS
    const soladoFields: CatField[] = [];
    const solaType = `${order.solado || 'Borracha'} ${order.formatoBico || 'quadrada'}`.toLowerCase();
    soladoFields.push({ label: 'Tipo:', value: solaType });
    if (order.corSola) soladoFields.push({ label: 'Cor:', value: order.corSola.toLowerCase() });
    if (order.corVira && !['Bege', 'Neutra'].includes(order.corVira)) soladoFields.push({ label: 'Vira:', value: order.corVira.toLowerCase() });
    categories.push({ title: 'SOLADOS', fields: soladoFields });

    // BORDADOS
    const bordadoFields: CatField[] = [];
    const replaceBordadoVariado = (text: string, desc?: string) => {
      if (!text) return text;
      return text.split(', ').map(b => {
        if (b.includes('Bordado Variado') && desc) return desc;
        return b;
      }).join(', ');
    };
    const bordCanoText = replaceBordadoVariado(order.bordadoCano, order.bordadoVariadoDescCano);
    const bordGaspeaText = replaceBordadoVariado(order.bordadoGaspea, order.bordadoVariadoDescGaspea);
    const bordTaloneiraText = replaceBordadoVariado(order.bordadoTaloneira, order.bordadoVariadoDescTaloneira);
    if (bordCanoText) bordadoFields.push({ label: 'Cano:', value: `${bordCanoText.toLowerCase()}${order.corBordadoCano ? ' ' + order.corBordadoCano.toLowerCase() : ''}` });
    if (bordGaspeaText) bordadoFields.push({ label: 'Gáspea:', value: `${bordGaspeaText.toLowerCase()}${order.corBordadoGaspea ? ' ' + order.corBordadoGaspea.toLowerCase() : ''}` });
    if (bordTaloneiraText) bordadoFields.push({ label: 'Taloneira:', value: `${bordTaloneiraText.toLowerCase()}${order.corBordadoTaloneira ? ' ' + order.corBordadoTaloneira.toLowerCase() : ''}` });
    if (order.nomeBordadoDesc || order.personalizacaoNome) bordadoFields.push({ label: 'Nome:', value: (order.nomeBordadoDesc || order.personalizacaoNome || '').toLowerCase() });
    if (bordadoFields.length) categories.push({ title: 'BORDADOS', fields: bordadoFields });

    // LASER E RECORTES
    const laserFields: CatField[] = [];
    if (order.laserCano) laserFields.push({ label: 'Cano:', value: `${order.laserCano.toLowerCase()}${order.corGlitterCano ? ' ' + order.corGlitterCano.toLowerCase() : ''}` });
    if (order.laserGaspea) laserFields.push({ label: 'Gáspea:', value: `${order.laserGaspea.toLowerCase()}${order.corGlitterGaspea ? ' ' + order.corGlitterGaspea.toLowerCase() : ''}` });
    if (order.laserTaloneira) laserFields.push({ label: 'Taloneira:', value: `${(order.laserTaloneira || '').toLowerCase()}${order.corGlitterTaloneira ? ' ' + order.corGlitterTaloneira.toLowerCase() : ''}` });
    if (order.recorteCano) laserFields.push({ label: 'Recorte cano:', value: `${order.recorteCano.toLowerCase()}${order.corRecorteCano ? ' ' + order.corRecorteCano.toLowerCase() : ''}` });
    if (order.recorteGaspea) laserFields.push({ label: 'Recorte gáspea:', value: `${order.recorteGaspea.toLowerCase()}${order.corRecorteGaspea ? ' ' + order.corRecorteGaspea.toLowerCase() : ''}` });
    if (order.recorteTaloneira) laserFields.push({ label: 'Recorte taloneira:', value: `${order.recorteTaloneira.toLowerCase()}${order.corRecorteTaloneira ? ' ' + order.corRecorteTaloneira.toLowerCase() : ''}` });
    if (order.pintura === 'Sim') laserFields.push({ label: 'Pintura:', value: order.pinturaDesc || 'sim' });
    if (laserFields.length) categories.push({ title: 'LASER E RECORTES', fields: laserFields });

    // ESTAMPA (bloco próprio)
    if (order.estampa === 'Sim') {
      categories.push({ title: 'ESTAMPA', fields: [{ label: '', value: order.estampaDesc || 'sim' }] });
    }

    // METAIS
    const metaisFields: CatField[] = [];
    const det: any = order.extraDetalhes || {};
    const cavaloMetalQtd = det.cavaloMetal ? (Number(det.cavaloMetalQtd) || 0) : 0;
    const hasMetalData = !!(order.metais || order.tipoMetal || order.corMetal ||
      order.strassQtd || order.cruzMetalQtd || order.bridaoMetalQtd || cavaloMetalQtd);
    if (hasMetalData) {
      if (order.metais) {
        const metalParts = [order.metais.toLowerCase()];
        if (order.tipoMetal) metalParts.push(order.tipoMetal.toLowerCase());
        if (order.corMetal) metalParts.push(order.corMetal.toLowerCase());
        metaisFields.push({ label: 'Metais:', value: metalParts.join(', ') });
      }
      const metalExtras: string[] = [];
      if (order.strassQtd) metalExtras.push(`strass x${order.strassQtd}`);
      if (order.cruzMetalQtd) metalExtras.push(`cruz x${order.cruzMetalQtd}`);
      if (order.bridaoMetalQtd) metalExtras.push(`bridão x${order.bridaoMetalQtd}`);
      if (cavaloMetalQtd) metalExtras.push(`cavalo x${cavaloMetalQtd}`);
      if (metalExtras.length) metaisFields.push({ label: '', value: metalExtras.join(', ') });
      categories.push({ title: 'METAIS', fields: metaisFields });
    }

    // EXTRAS (acessórios + tricê + tiras + franja + corrente + costura atrás + carimbo)
    const extrasFields: CatField[] = [];
    if (order.acessorios) extrasFields.push({ label: 'Acessórios:', value: order.acessorios });
    if (order.trisce === 'Sim' && order.triceDesc) extrasFields.push({ label: 'Tricê:', value: order.triceDesc.toLowerCase() });
    if (order.tiras === 'Sim' && order.tirasDesc) extrasFields.push({ label: 'Tiras:', value: order.tirasDesc.toLowerCase() });
    if (det.franja) extrasFields.push({ label: 'Franja:', value: [det.franjaCouro, det.franjaCor].filter(Boolean).join(' — ').toLowerCase() || 'sim' });
    if (det.corrente) extrasFields.push({ label: 'Corrente:', value: det.correnteCor?.toLowerCase() || 'sim' });
    if (order.costuraAtras === 'Sim') extrasFields.push({ label: 'Costura atrás:', value: 'sim' });
    if (order.carimbo) extrasFields.push({ label: 'Carimbo:', value: `${order.carimbo}${order.carimboDesc ? ' - ' + order.carimboDesc : ''}` });
    if (extrasFields.length) categories.push({ title: 'EXTRAS', fields: extrasFields });

    // ADICIONAL (bloco próprio)
    if (order.adicionalDesc || order.adicionalValor) {
      categories.push({ title: 'ADICIONAL', fields: [{ label: '', value: `${order.adicionalDesc || ''}${order.adicionalValor ? ' R$' + order.adicionalValor : ''}`.trim() }] });
    }

    // OBS
    if (order.observacao) {
      categories.push({ title: 'OBS', fields: [{ label: '', value: order.observacao }] });
    }

    const colWidth = (pw - m * 2 - 8) / 3;
    const col1X = m + 3;
    const col2X = col1X + colWidth + 2;
    const col3X = col2X + colWidth + 2;

    const estimateCatHeight = (cat: Category): number => {
      let h = fieldGap;
      cat.fields.forEach(f => {
        const labelW = f.label ? doc.getTextWidth(f.label) + 3 : 0;
        doc.setFontSize(fs);
        const valLines = doc.splitTextToSize(f.value, colWidth - labelW - 5);
        h += Math.max(valLines.length, 1) * (fieldGap * 0.8);
      });
      h += catGap;
      return h;
    };

    const catHeights = categories.map(c => estimateCatHeight(c));
    const totalContentHeight = catHeights.reduce((s, h) => s + h, 0);
    const availableHeight = (descBottom - descTop) * 3; // 3 columns
    // Reduce font if content is dense
    const useFontSize = totalContentHeight > availableHeight * 0.95 ? 9 : fs;
    const useFieldGap = totalContentHeight > availableHeight * 0.95 ? 4.5 : fieldGap;

    const colHeights = [0, 0, 0];
    const colCats: number[][] = [[], [], []];
    catHeights.forEach((h, i) => {
      const minCol = colHeights.indexOf(Math.min(...colHeights));
      colCats[minCol].push(i);
      colHeights[minCol] += h;
    });

    const renderCats = (catIndices: number[], startX: number) => {
      let cy = descTop;
      let truncated = false;
      catIndices.forEach(ci => {
        const cat = categories[ci];
        if (cy > descBottom) { truncated = true; return; }
        doc.setFillColor(232, 232, 232);
        doc.rect(startX - 1, cy - 3.5, colWidth, 5, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(cat.title, startX, cy);
        cy += useFieldGap;
        cat.fields.forEach(f => {
          if (cy > descBottom) { truncated = true; return; }
          doc.setFontSize(useFontSize);
          if (f.label) {
            doc.setFont('helvetica', 'bold');
            doc.text(f.label, startX, cy);
            const lw = doc.getTextWidth(f.label) + 3;
            doc.setFont('helvetica', 'normal');
            const valLines = doc.splitTextToSize(f.value, colWidth - lw - 3);
            valLines.forEach((line: string, li: number) => {
              if (cy + li * (useFieldGap * 0.8) <= descBottom) {
                doc.text(line, startX + lw, cy + li * (useFieldGap * 0.8));
              } else { truncated = true; }
            });
            cy += Math.max(valLines.length, 1) * (useFieldGap * 0.8);
          } else {
            doc.setFont('helvetica', 'normal');
            const valLines = doc.splitTextToSize(f.value, colWidth - 3);
            valLines.forEach((line: string, li: number) => {
              if (cy + li * (useFieldGap * 0.8) <= descBottom) {
                doc.text(line, startX, cy + li * (useFieldGap * 0.8));
              } else { truncated = true; }
            });
            cy += Math.max(valLines.length, 1) * (useFieldGap * 0.8);
          }
        });
        cy += catGap;
      });
      if (truncated) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 0, 0);
        doc.text('...conteúdo excedido', startX, descBottom + 3);
        doc.setTextColor(0, 0, 0);
      }
    };

    renderCats(colCats[0], col1X);
    renderCats(colCats[1], col2X);
    renderCats(colCats[2], col3X);

    // ─── STUB ÚNICO (montagem/sola + código de barras) ───
    const stubTop = ph - 34;
    doc.setLineWidth(0.3);
    (doc as any).setLineDash([1, 1]);
    doc.line(m, stubTop - 2, pw - m, stubTop - 2);
    (doc as any).setLineDash([]);

    const stubAreaW = pw - m * 2;
    const halfW = stubAreaW / 2;
    const bcVal = orderBarcodeValue(order.numero, order.id);
    const bcUrl = barcodeDataUrl(bcVal, { width: 2, height: 40 });

    // Divisória central entre os dois lados
    doc.setLineWidth(0.3);
    doc.line(m + halfW, stubTop, m + halfW, ph - m);

    // ─── LADO ESQUERDO: código de barras + número do pedido ───
    const leftCx = m + halfW / 2;
    if (bcUrl) {
      try { doc.addImage(bcUrl, 'PNG', m + 8, stubTop + 5, halfW - 16, 16); } catch {}
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(orderNumClean, leftCx, stubTop + 28, { align: 'center' });

    // ─── LADO DIREITO: informações de SOLA / MONTAGEM ───
    const rightX = m + halfW;
    const rightCx = rightX + halfW / 2;
    const line1Parts = [
      order.tamanho,
      (order.solado || 'borracha').toLowerCase(),
      order.corSola ? order.corSola.toLowerCase() : '',
    ].filter(Boolean).join(' ');
    const formaVal = (order as any).forma || '';
    const stubLine1 = formaVal ? `${line1Parts} | forma: ${formaVal}` : line1Parts;
    const bicoText = (order.formatoBico || 'quadrado').toLowerCase().replace(/\bfino\b/gi, 'BF');
    const viraText = (order.corVira && !['Bege', 'Neutra'].includes(order.corVira)) ? ` vira ${order.corVira.toLowerCase()}` : '';
    const stubLine2 = `${bicoText}${viraText}`;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nº pedido: ${orderNumClean}`, rightCx, stubTop + 5, { align: 'center', maxWidth: halfW - 4 });
    doc.setFontSize(10);
    doc.text(stubLine1.toUpperCase(), rightCx, stubTop + 14, { align: 'center', maxWidth: halfW - 4 });
    doc.setFontSize(9);
    doc.text(stubLine2.toUpperCase(), rightCx, stubTop + 22, { align: 'center', maxWidth: halfW - 4 });
  }

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  stampPageNumbers(doc);
  void recordPrintHistory(ordersToExport.map((o: any) => o.id), 'Ficha de Produção', meta?.userName || '');
  doc.save(`Fichas de Produção - ${dd}-${mm}-${yyyy} - ${hh}h${min}.pdf`);
}

export function generateCommissionPDF(orders: { id: string; numero: string; dataCriacao: string }[], monthLabel: string, meta?: { userName: string }) {
  const doc = new jsPDF();
  const COMMISSION_PER_SALE = 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Relatório de Comissão — Rancho Chique / Site`, 14, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${monthLabel}`, 14, 28);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, 14, 34);

  // Table header
  let y = 46;
  const colX = { seq: 14, numero: 34, barcode: 75, data: 155 };
  const rowH = 18;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(12, y - 5, 186, 8, 'F');
  doc.text('Qtd', colX.seq, y);
  doc.text('Nº do Pedido', colX.numero, y);
  doc.text('Código de Barras', colX.barcode, y);
  doc.text('Data do Pedido', colX.data, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  orders.forEach((o, i) => {
    if (y > 260) { doc.addPage(); y = 20; }
    const seq = String(i + 1);
    const dataFormatted = formatDateBR(o.dataCriacao);
    const textY = y + 5;
    doc.text(seq, colX.seq, textY);
    const numWidth = colX.barcode - colX.numero - 2;
    const numLinesComm = doc.splitTextToSize(o.numero, numWidth);
    numLinesComm.forEach((line: string, li: number) => {
      doc.text(line, colX.numero, textY + li * 4);
    });
    doc.text(dataFormatted, colX.data, textY);

    try {
      const bcVal = orderBarcodeValue(o.numero, o.id);
      const bcUrl = barcodeDataUrl(bcVal, { width: 1, height: 25 });
      doc.addImage(bcUrl, 'PNG', colX.barcode, y - 2, 55, 14);
    } catch { /* skip barcode on error */ }

    y += rowH;
  });

  // Footer totals
  if (y > 250) { doc.addPage(); y = 20; }
  y += 6;
  doc.setDrawColor(180);
  doc.line(12, y - 4, 198, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de pedidos: ${orders.length}`, 14, y + 2);
  doc.text(`Comissão por pedido: R$ 10,00`, 14, y + 9);
  const total = orders.length * COMMISSION_PER_SALE;
  doc.text(`Valor total da comissão: ${formatCurrency(total)}`, 14, y + 16);

  const [yearStr, monthStr] = monthLabel.includes(' ') ? [monthLabel.split(' ')[1], monthLabel.split(' ')[0]] : ['', ''];
  stampPageNumbers(doc);
  void recordPrintHistory(orders.map(o => o.id), 'Comissão', meta?.userName || '');
  doc.save(`Comissão - Rancho Chique - ${monthStr}-${yearStr}.pdf`);
}

/* ─────────── Resumo Baixa Bordado 7Estrivos ─────────── */
export async function generateBordadoBaixaResumoPDF(orders: any[], dataDe: string, dataAte: string, userName: string, usuariosFiltro?: string[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const FONT = 'helvetica';
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const filtroUsuariosSet = usuariosFiltro && usuariosFiltro.length > 0 ? new Set(usuariosFiltro.map(u => u.trim())) : null;
  const filtroLabel = filtroUsuariosSet ? ` • Filtrado por: ${[...filtroUsuariosSet].join(', ')}` : '';
  const periodoBase = dataDe === dataAte ? formatDateBR(dataDe) : `${formatDateBR(dataDe)} a ${formatDateBR(dataAte)}`;
  const periodoLabel = `${periodoBase}${filtroLabel}`;
  const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  const isDiaUtil = (yyyyMmDd: string) => {
    if (!yyyyMmDd || yyyyMmDd.length < 10) return false;
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return dow >= 1 && dow <= 5;
  };
  const diaSemana = (yyyyMmDd: string) => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return ['dom','seg','ter','qua','qui','sex','sáb'][new Date(y, m - 1, d).getDay()];
  };
  const barcodeOf = (id: string) => (id || '').replace(/-/g, '').slice(-12).toUpperCase();
  const comissaoFor = (o: any): { tipo: 'Bota' | 'Cinto' | null; valor: number } => {
    if (!o.tipo_extra) return { tipo: 'Bota', valor: 1.0 };
    if (o.tipo_extra === 'cinto') return { tipo: 'Cinto', valor: 0.5 };
    return { tipo: null, valor: 0 };
  };

  type Linha = {
    numero: string;
    barcode: string;
    tipo: 'Bota' | 'Cinto';
    comissao: number;
    dataEntrada: string;
    dataBaixa: string;
  };

  const ETAPAS_ANTES_BAIXA = new Set([
    'Em aberto','Impresso','Aguardando','Aguardando Couro','Corte',
    'Sem bordado','Bordado Dinei','Bordado Sandro','Bordado 7Estrivos',
    'Entrada Bordado 7Estrivos',
  ]);

  const linhas: Linha[] = [];
  for (const o of orders) {
    const c = comissaoFor(o);
    if (!c.tipo) continue;
    const hist = Array.isArray(o.historico) ? o.historico : [];
    const sorted = [...hist]
      .filter((h: any) => h && typeof h.data === 'string')
      .sort((a: any, b: any) => {
        const ka = `${a.data} ${a.hora || '00:00'}`;
        const kb = `${b.data} ${b.hora || '00:00'}`;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
    // Baixa válida = "Baixa Bordado 7Estrivos" sem regressão posterior
    const baixasValidas = sorted.filter((h: any, idx: number) => {
      if (h?.local !== 'Baixa Bordado 7Estrivos') return false;
      if (h.data < dataDe || h.data > dataAte || !isDiaUtil(h.data)) return false;
      if (filtroUsuariosSet) {
        const u = typeof h?.usuario === 'string' ? h.usuario.trim() : '';
        if (!filtroUsuariosSet.has(u)) return false;
      }
      for (let i = idx + 1; i < sorted.length; i++) {
        if (ETAPAS_ANTES_BAIXA.has(sorted[i]?.local)) return false;
      }
      return true;
    });
    if (baixasValidas.length === 0) continue;
    const baixa = baixasValidas[baixasValidas.length - 1];
    const entradaEntry = sorted.find((h: any) => h?.local === 'Entrada Bordado 7Estrivos');
    linhas.push({
      numero: String(o.numero || ''),
      barcode: barcodeOf(String(o.id || '')),
      tipo: c.tipo,
      comissao: c.valor,
      dataEntrada: entradaEntry?.data || '',
      dataBaixa: String(baixa.data || ''),
    });
  }

  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) {
    if (!grupos.has(l.dataBaixa)) grupos.set(l.dataBaixa, []);
    grupos.get(l.dataBaixa)!.push(l);
  }
  const datasOrdenadas = [...grupos.keys()].sort();

  const totBotas = linhas.filter(l => l.tipo === 'Bota');
  const totCintos = linhas.filter(l => l.tipo === 'Cinto');
  const valBotas = totBotas.reduce((s, l) => s + l.comissao, 0);
  const valCintos = totCintos.reduce((s, l) => s + l.comissao, 0);
  const valTotal = valBotas + valCintos;

  const drawHeader = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(13);
    doc.text('Resumo Comissão Bordado 7Estrivos', margin, 10);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.text(periodoLabel, pageW - margin, 10, { align: 'right' });
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, 14, pageW - margin, 14);
  };
  drawHeader();

  let y = 24;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.text(`Total geral: ${linhas.length} ${linhas.length === 1 ? 'item' : 'itens'} • ${fmtBRL(valTotal)}`, margin, y);
  doc.text(`Gerado por: ${userName}`, pageW - margin, y, { align: 'right' });
  y += 7;

  if (linhas.length === 0) {
    doc.setFontSize(11);
    doc.text('Nenhuma baixa elegível no período (apenas seg–sex contam comissão).', margin, y + 8);
    stampPageNumbers(doc);
    const baseSuffix = dataDe === dataAte ? dataDe : `${dataDe}_a_${dataAte}`;
    const userSuffix = filtroUsuariosSet ? `_${[...filtroUsuariosSet].join('-').replace(/\s+/g, '-')}` : '';
    doc.save(`Comissao-Bordado-${baseSuffix}${userSuffix}.pdf`);
    return;
  }

  // Layout colunas — barras embaixo do número
  const colQtd = margin + 2;
  const colNum = margin + 12;
  const colTipo = margin + 78;
  const colCom = margin + 100;
  const colEntrada = pageW - margin - 2;
  const barcodeW = 55;
  const barcodeH = 9;
  const rowH = 18; // espaço para número + barras

  const drawTableHeader = () => {
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.text('Qtd', colQtd, y + 5);
    doc.text('Nº Pedido / Código', colNum, y + 5);
    doc.text('Tipo', colTipo, y + 5);
    doc.text('Comissão', colCom, y + 5);
    doc.text('Entrada bordado', colEntrada, y + 5, { align: 'right' });
    y += 8;
    doc.setFont(FONT, 'normal');
  };

  const ensureSpace = (need: number) => {
    if (y + need > pageH - 14) {
      doc.addPage();
      drawHeader();
      y = 24;
      drawTableHeader();
    }
  };

  for (const data of datasOrdenadas) {
    const itens = grupos.get(data)!;
    ensureSpace(14);
    doc.setFillColor(254, 243, 199);
    doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(120, 53, 15);
    doc.text(`Baixa: ${formatDateBR(data)} (${diaSemana(data)})`, margin + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 8;
    drawTableHeader();

    let qtdDia = 0;
    let valDia = 0;
    let seq = 0;
    for (const l of itens) {
      ensureSpace(rowH + 2);
      seq++;
      const midY = y + rowH / 2 + 1;
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.text(String(seq), colQtd, midY);
      // Número (negrito) + barras CODE128 abaixo
      doc.setFont(FONT, 'bold');
      doc.setFontSize(10);
      doc.text(l.numero, colNum, y + 4);
      const bcVal = l.numero || l.barcode;
      try {
        const bcUrl = barcodeDataUrl(bcVal, { width: 3, height: 80 });
        doc.addImage(bcUrl, 'PNG', colNum, y + 5.5, barcodeW, barcodeH);
      } catch { /* skip */ }
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.text(l.tipo, colTipo, midY);
      doc.text(fmtBRL(l.comissao), colCom, midY);
      doc.text(l.dataEntrada ? formatDateBR(l.dataEntrada) : '—', colEntrada, midY, { align: 'right' });
      y += rowH;
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y, pageW - margin, y);
      qtdDia++;
      valDia += l.comissao;
    }
    ensureSpace(8);
    doc.setFillColor(248, 248, 248);
    doc.rect(margin, y, pageW - 2 * margin, 6, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.text(`Subtotal ${formatDateBR(data)}: ${qtdDia} ${qtdDia === 1 ? 'item' : 'itens'} • ${fmtBRL(valDia)}`, pageW - margin - 2, y + 4, { align: 'right' });
    y += 10;
  }

  ensureSpace(40);
  y += 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.text('Totais', margin, y);
  y += 6;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  doc.text(`Botas: ${totBotas.length} ${totBotas.length === 1 ? 'par' : 'pares'} • ${fmtBRL(valBotas)}`, margin, y);
  y += 5.5;
  doc.text(`Cintos: ${totCintos.length} ${totCintos.length === 1 ? 'unidade' : 'unidades'} • ${fmtBRL(valCintos)}`, margin, y);
  y += 6;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.text(`TOTAL GERAL: ${linhas.length} ${linhas.length === 1 ? 'item' : 'itens'} • ${fmtBRL(valTotal)}`, margin, y);
  y += 8;

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  const datasFmt = datasOrdenadas.map(d => `${formatDateBR(d)} (${diaSemana(d)})`).join(' • ');
  const datasLines = doc.splitTextToSize(`Datas de baixa: ${datasFmt}`, pageW - 2 * margin);
  for (const line of datasLines) {
    ensureSpace(5);
    doc.text(line, margin, y);
    y += 4.5;
  }
  doc.setTextColor(0, 0, 0);

  stampPageNumbers(doc);
  const fileSuffix = dataDe === dataAte ? dataDe : `${dataDe}_a_${dataAte}`;
  doc.save(`Comissao-Bordado-${fileSuffix}.pdf`);
}
