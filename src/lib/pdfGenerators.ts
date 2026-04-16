import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { orderBarcodeValue } from '@/contexts/AuthContext';

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

export function generateReportPDF(ordersToExport: any[]) {
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
    doc.text(`Valor: ${formatCurrency(o.preco * o.quantidade)} | Qtd: ${o.quantidade}`, 14, y + 10);
    y += 18;
  });

  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de Pedidos: ${list.length}`, 14, y + 5);
  doc.text(`Valor Total: ${formatCurrency(list.reduce((s, o) => s + o.preco * o.quantidade, 0))}`, 14, y + 12);
  doc.save('relatorio-pedidos.pdf');
}

export async function generateProductionSheetPDF(ordersToExport: any[]) {
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

    const courosFields: CatField[] = [];
    if (order.couroCano) courosFields.push({ label: 'Cano:', value: `${order.couroCano.toLowerCase()}${order.corCouroCano ? ' ' + order.corCouroCano.toLowerCase() : ''}` });
    if (order.couroGaspea) courosFields.push({ label: 'Gáspea:', value: `${order.couroGaspea.toLowerCase()}${order.corCouroGaspea ? ' ' + order.corCouroGaspea.toLowerCase() : ''}` });
    if (order.couroTaloneira) courosFields.push({ label: 'Taloneira:', value: `${order.couroTaloneira.toLowerCase()}${order.corCouroTaloneira ? ' ' + order.corCouroTaloneira.toLowerCase() : ''}` });
    if (courosFields.length) categories.push({ title: 'COUROS', fields: courosFields });

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

    const laserFields: CatField[] = [];
    if (order.laserCano) laserFields.push({ label: 'Cano:', value: `${order.laserCano.toLowerCase()}${order.corGlitterCano ? ' ' + order.corGlitterCano.toLowerCase() : ''}` });
    if (order.laserGaspea) laserFields.push({ label: 'Gáspea:', value: `${order.laserGaspea.toLowerCase()}${order.corGlitterGaspea ? ' ' + order.corGlitterGaspea.toLowerCase() : ''}` });
    if (order.laserTaloneira) laserFields.push({ label: 'Taloneira:', value: `${(order.laserTaloneira || '').toLowerCase()}${order.corGlitterTaloneira ? ' ' + order.corGlitterTaloneira.toLowerCase() : ''}` });
    if (laserFields.length) categories.push({ title: 'LASER', fields: laserFields });

    const pespontoFields: CatField[] = [];
    if (order.corLinha) pespontoFields.push({ label: 'Linha:', value: order.corLinha.toLowerCase() });
    if (order.corBorrachinha) pespontoFields.push({ label: 'Borrachinha:', value: order.corBorrachinha.toLowerCase() });
    if (order.corVivo) pespontoFields.push({ label: 'Vivo:', value: order.corVivo.toLowerCase() });
    if (pespontoFields.length) categories.push({ title: 'PESPONTO', fields: pespontoFields });

    const soladoFields: CatField[] = [];
    const solaType = `${order.solado || 'Borracha'} ${order.formatoBico || 'quadrada'}`.toLowerCase();
    soladoFields.push({ label: 'Tipo:', value: solaType });
    if (order.corSola) soladoFields.push({ label: 'Cor:', value: order.corSola.toLowerCase() });
    if (order.corVira && !['Bege', 'Neutra'].includes(order.corVira)) soladoFields.push({ label: 'Vira:', value: order.corVira.toLowerCase() });
    categories.push({ title: 'SOLADOS', fields: soladoFields });

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

    const acessorioFields: CatField[] = [];
    if (order.acessorios) acessorioFields.push({ label: '', value: order.acessorios });
    if (acessorioFields.length) categories.push({ title: 'ACESSÓRIOS', fields: acessorioFields });

    const extrasFields: CatField[] = [];
    if (order.trisce === 'Sim' && order.triceDesc) extrasFields.push({ label: 'Tricê:', value: order.triceDesc.toLowerCase() });
    if (order.tiras === 'Sim' && order.tirasDesc) extrasFields.push({ label: 'Tiras:', value: order.tirasDesc.toLowerCase() });
    if (det.franja) extrasFields.push({ label: 'Franja:', value: [det.franjaCouro, det.franjaCor].filter(Boolean).join(' — ').toLowerCase() || 'sim' });
    if (det.corrente) extrasFields.push({ label: 'Corrente:', value: det.correnteCor?.toLowerCase() || 'sim' });
    if (order.costuraAtras === 'Sim') extrasFields.push({ label: 'Costura atrás:', value: 'sim' });
    if (order.estampa === 'Sim') extrasFields.push({ label: 'Estampa:', value: order.estampaDesc || 'sim' });
    if (order.pintura === 'Sim') extrasFields.push({ label: 'Pintura:', value: order.pinturaDesc || 'sim' });
    if (order.carimbo) extrasFields.push({ label: 'Carimbo:', value: `${order.carimbo}${order.carimboDesc ? ' - ' + order.carimboDesc : ''}` });
    if (order.adicionalDesc) extrasFields.push({ label: 'Adicional:', value: `${order.adicionalDesc} R$${order.adicionalValor || 0}` });
    if (extrasFields.length) categories.push({ title: 'EXTRAS', fields: extrasFields });

    if (order.desenvolvimento) {
      categories.push({ title: 'DESENVOLVIMENTO', fields: [{ label: '', value: order.desenvolvimento }] });
    }

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

    // ─── STUBS ───
    const stubTop = ph - 34;
    doc.setLineWidth(0.3);
    (doc as any).setLineDash([1, 1]);
    doc.line(m, stubTop - 2, pw - m, stubTop - 2);
    (doc as any).setLineDash([]);

    const stubAreaW = pw - m * 2;
    const stubW = stubAreaW / 3;
    const bcVal = orderBarcodeValue(order.numero, order.id);
    const bcUrl = barcodeDataUrl(bcVal, { width: 2, height: 40 });

    let stubX = m;
    doc.setLineWidth(0.3);
    doc.line(stubX + stubW, stubTop, stubX + stubW, ph - m);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BORDADO / LASER', stubX + stubW / 2, stubTop + 4, { align: 'center' });
    if (bcUrl) { try { doc.addImage(bcUrl, 'PNG', stubX + 6, stubTop + 6, stubW - 12, 14); } catch {} }
    doc.setFontSize(10);
    doc.text(orderNumClean, stubX + stubW / 2, stubTop + 24, { align: 'center' });

    stubX += stubW;
    doc.line(stubX + stubW, stubTop, stubX + stubW, ph - m);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PESPONTO', stubX + stubW / 2, stubTop + 4, { align: 'center' });
    if (bcUrl) { try { doc.addImage(bcUrl, 'PNG', stubX + 6, stubTop + 6, stubW - 12, 14); } catch {} }
    doc.setFontSize(10);
    doc.text(orderNumClean, stubX + stubW / 2, stubTop + 24, { align: 'center' });

    stubX += stubW;
    const line1Parts = [
      order.tamanho,
      (order.solado || 'borracha').toLowerCase(),
      order.corSola ? order.corSola.toLowerCase() : '',
    ].filter(Boolean).join(' ');
    const formaVal = (order as any).forma || '';
    const stub3Line1 = formaVal ? `${line1Parts} | forma: ${formaVal}` : line1Parts;
    const bicoText = (order.formatoBico || 'quadrado').toLowerCase().replace(/\bfino\b/gi, 'BF');
    const viraText = (order.corVira && !['Bege', 'Neutra'].includes(order.corVira)) ? ` vira ${order.corVira.toLowerCase()}` : '';
    const stub3Line2 = `${bicoText}${viraText}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(stub3Line1.toUpperCase(), stubX + stubW / 2, stubTop + 6, { align: 'center' });
    doc.setFontSize(8);
    doc.text(stub3Line2.toUpperCase(), stubX + stubW / 2, stubTop + 12, { align: 'center' });
    if (bcUrl) { try { doc.addImage(bcUrl, 'PNG', stubX + 6, stubTop + 13, stubW - 12, 10); } catch {} }
    doc.setFontSize(9);
    doc.text(orderNumClean, stubX + stubW / 2, stubTop + 27, { align: 'center' });
  }

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  doc.save(`Fichas de Produção - ${dd}-${mm}-${yyyy} - ${hh}h${min}.pdf`);
}

export function generateCommissionPDF(orders: { id: string; numero: string; dataCriacao: string }[], monthLabel: string) {
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
  doc.save(`Comissão - Rancho Chique - ${monthStr}-${yearStr}.pdf`);
}
