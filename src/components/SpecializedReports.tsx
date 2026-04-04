import { useState, useMemo } from 'react';
import { useAuth, Order, orderBarcodeValue, PRODUCTION_STATUSES } from '@/contexts/AuthContext';
import { FileText, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  MODELOS, ACESSORIOS, BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA, COURO_PRECOS, SOLADO, COR_SOLA, COR_VIRA,
  CARIMBO, AREA_METAL, DESENVOLVIMENTO,
  SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO, PINTURA_PRECO,
  TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, STRASS_PRECO, CRUZ_METAL_PRECO,
  BRIDAO_METAL_PRECO, LASER_CANO_PRECO, LASER_GASPEA_PRECO, GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO,
  getForma,
} from '@/lib/orderFieldsConfig';
import { BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO, EXTRA_DETAIL_LABELS } from '@/lib/extrasConfig';

const formatDateBR = (date: string) => {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function barcodeDataUrl(value: string, opts?: { width?: number; height?: number }): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, { format: 'CODE128', width: opts?.width ?? 2, height: opts?.height ?? 50, displayValue: false, margin: 2 });
    return canvas.toDataURL('image/png');
  } catch { return ''; }
}

type ReportType = 'escalacao' | 'forro' | 'palmilha' | 'forma' | 'pesponto' | 'metais' | 'bordados' | 'corte' | 'expedicao' | 'cobranca' | 'extras_cintos';

interface SpecializedReportsProps {
  reports: ReportType[];
  showTitle?: boolean;
}

const REPORT_LABELS: Record<ReportType, string> = {
  escalacao: 'Escalação',
  forro: 'Forro',
  palmilha: 'Palmilha',
  forma: 'Forma',
  pesponto: 'Pesponto',
  metais: 'Metais',
  bordados: 'Bordados',
  corte: 'Corte',
  expedicao: 'Expedição',
  cobranca: 'Cobrança',
  extras_cintos: 'Extras / Cintos',
};

const PESPONTO_STATUSES = ['Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05', 'Pespontando'];
const BORDADO_STATUSES = ['Bordado Dinei', 'Bordado Sandro', 'Bordado 7Estrivos'];

/** Products available for the extras_cintos grouping report */
const EXTRAS_CINTOS_PRODUCTS: { value: string; label: string }[] = [
  { value: 'cinto', label: 'Cinto' },
  { value: 'kit_faca', label: 'Kit Faca' },
  { value: 'kit_canivete', label: 'Kit Canivete' },
  { value: 'desmanchar', label: 'Desmanchar' },
  { value: 'tiras_laterais', label: 'Tiras Laterais' },
  { value: 'gravata_country', label: 'Gravata Country' },
  { value: 'carimbo_fogo', label: 'Carimbo a Fogo' },
  { value: 'revitalizador', label: 'Revitalizador' },
  { value: 'kit_revitalizador', label: 'Kit 2 Revitalizador' },
  { value: 'adicionar_metais', label: 'Adicionar Metais' },
  { value: 'chaveiro_carimbo', label: 'Chaveiro c/ Carimbo' },
  { value: 'bainha_cartao', label: 'Bainha de Cartão' },
  { value: 'regata', label: 'Regata' },
  { value: 'bota_pronta_entrega', label: 'Bota Pronta Entrega' },
];

/** Groupable fields per product type */
const PRODUCT_GROUPABLE_FIELDS: Record<string, { key: string; label: string }[]> = {
  cinto: [
    { key: 'tamanhoCinto', label: 'Tamanho' },
    { key: 'tipoCouro', label: 'Tipo de Couro' },
    { key: 'corCouro', label: 'Cor do Couro' },
    { key: 'bordadoP', label: 'Bordado P' },
    { key: 'nomeBordado', label: 'Nome Bordado' },
    { key: 'carimbo', label: 'Carimbo' },
  ],
  kit_faca: [
    { key: 'tipoCouro', label: 'Tipo de Couro' },
    { key: 'corCouro', label: 'Cor do Couro' },
    { key: 'vaiCanivete', label: 'Vai a Faca' },
  ],
  kit_canivete: [
    { key: 'tipoCouro', label: 'Tipo de Couro' },
    { key: 'corCouro', label: 'Cor do Couro' },
    { key: 'vaiCanivete', label: 'Vai o Canivete' },
  ],
  desmanchar: [
    { key: 'qualSola', label: 'Sola' },
    { key: 'trocaGaspea', label: 'Troca Gáspea' },
  ],
  tiras_laterais: [
    { key: 'corTiras', label: 'Cor das Tiras' },
  ],
  gravata_country: [
    { key: 'corTira', label: 'Cor da Tira' },
    { key: 'tipoMetal', label: 'Tipo de Metal' },
    { key: 'corBridao', label: 'Cor do Bridão' },
  ],
  carimbo_fogo: [
    { key: 'qtdCarimbos', label: 'Qtd. de Carimbos' },
    { key: 'ondeAplicado', label: 'Onde Aplicado' },
  ],
  revitalizador: [
    { key: 'tipoRevitalizador', label: 'Tipo' },
    { key: 'quantidade', label: 'Quantidade' },
  ],
  kit_revitalizador: [
    { key: 'tipoRevitalizador', label: 'Tipo' },
    { key: 'quantidade', label: 'Quantidade' },
  ],
  adicionar_metais: [
    { key: 'metaisSelecionados', label: 'Metais Selecionados' },
  ],
  regata: [
    { key: 'corRegata', label: 'Cor' },
    { key: 'descBordadoRegata', label: 'Bordado' },
  ],
  bota_pronta_entrega: [
    { key: 'descricaoProduto', label: 'Descrição do Produto' },
  ],
};

// ── Helper: compact block layout for production PDFs ──
interface BlockData {
  badgeLabel: string;
  description: string;
  sizes: { tamanho: string; quantidade: number }[];
}

function drawBlockLayout(doc: jsPDF, y: number, mx: number, block: BlockData): number {
  const rowH = 7;
  const labelW = 18;
  const cellW = 11;
  const numCols = block.sizes.length;
  const tableW = labelW + numCols * cellW;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  // Row 1: Título (fundo escuro, texto branco, largura baseada no texto)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const titleText = `${block.badgeLabel}: ${block.description}`;
  const titleTextW = doc.getTextWidth(titleText) + 6; // 3mm padding each side
  const titleW = Math.max(titleTextW, tableW);
  doc.setFillColor(30, 30, 30);
  doc.rect(mx, y, titleW, rowH, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.text(titleText, mx + 3, y + 5);
  doc.setTextColor(0, 0, 0);
  y += rowH;

  // Row 2: TAM.
  doc.setFillColor(245, 245, 245);
  doc.rect(mx, y, labelW, rowH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('TAM.', mx + 2, y + 5);
  block.sizes.forEach((s, i) => {
    const cx = mx + labelW + i * cellW;
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, y, cellW, rowH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(s.tamanho, cx + cellW / 2, y + 5, { align: 'center' });
  });
  y += rowH;

  // Row 3: QTD.
  doc.setFillColor(245, 245, 245);
  doc.rect(mx, y, labelW, rowH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('QTD.', mx + 2, y + 5);
  block.sizes.forEach((s, i) => {
    const cx = mx + labelW + i * cellW;
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, y, cellW, rowH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(String(s.quantidade), cx + cellW / 2, y + 5, { align: 'center' });
  });
  y += rowH + 4;

  return y;
}

function estimateBlockHeight(block: BlockData): number {
  return 7 * 3 + 4; // título + tamanho + quantidade + gap
}

// ── Helper: draw a tabular header row ──
function drawTableHeader(doc: jsPDF, y: number, mx: number, cw: number, headers: { label: string; x: number }[]) {
  doc.setFillColor(232, 232, 232);
  doc.rect(mx, y, cw, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  headers.forEach(h => doc.text(h.label, h.x, y + 5.5));
  return y + 8;
}

// ── Helper: draw a data row with border ──
function drawTableRow(doc: jsPDF, y: number, mx: number, cw: number, colWidths: number[], rowH: number) {
  doc.setLineWidth(0.2);
  doc.rect(mx, y, cw, rowH);
  let x = mx;
  colWidths.forEach(w => {
    x += w;
    if (x < mx + cw) doc.line(x, y, x, y + rowH);
  });
}

// ── Helper: generate QR code data URL ──
async function qrDataUrl(text: string, size: number = 100): Promise<string> {
  if (!text) return '';
  try {
    return await QRCode.toDataURL(text, { width: size, margin: 1 });
  } catch { return ''; }
}

// ── Helper: build price composition items for an order ──
function buildCompositionItems(o: Order): [string, number][] {
  const priceItems: [string, number][] = [];

  if (o.tipoExtra === 'cinto' && o.extraDetalhes) {
    const det = o.extraDetalhes as any;
    priceItems.push(['Cinto', 0]);
    const sizeEntry = BELT_SIZES.find(s => s.label === det.tamanhoCinto);
    if (sizeEntry) priceItems.push([`Tamanho: ${sizeEntry.label}`, sizeEntry.preco]);
    if (det.bordadoP === 'Sim') priceItems.push(['Bordado P', BORDADO_P_PRECO]);
    if (det.nomeBordado === 'Sim') priceItems.push(['Nome Bordado', NOME_BORDADO_CINTO_PRECO]);
    const carimboEntry = BELT_CARIMBO.find(c => c.label === det.carimbo);
    if (carimboEntry) priceItems.push([det.carimbo, carimboEntry.preco]);
  } else if (o.tipoExtra && o.extraDetalhes) {
    const det = o.extraDetalhes as any;
    const extraLabel = o.modelo.replace('Extra — ', '');
    switch (o.tipoExtra) {
      case 'desmanchar': {
        priceItems.push(['Desmanchar (base)', 65]);
        if (det.qualSola === 'Preta borracha') priceItems.push(['Sola preta borracha', 25]);
        else if (det.qualSola === 'De cor borracha') priceItems.push(['Sola de cor borracha', 40]);
        else if (det.qualSola === 'De couro') priceItems.push(['Sola de couro', 60]);
        if (det.trocaGaspea === 'Sim') priceItems.push(['Troca Gáspea/Taloneira', 35]);
        break;
      }
      case 'kit_canivete': { priceItems.push(['Kit Canivete', 30]); if (det.vaiCanivete === 'Sim') priceItems.push(['Com canivete', 30]); break; }
      case 'kit_faca': { priceItems.push(['Kit Faca', 35]); if (det.vaiCanivete === 'Sim') priceItems.push(['Com faca', 35]); break; }
      case 'carimbo_fogo': { const qty = parseInt(det.qtdCarimbos) || 1; priceItems.push([`Carimbo a Fogo (${qty} un.)`, qty >= 4 ? 40 : 20]); break; }
      case 'revitalizador': { const qty = parseInt(det.quantidade) || 1; priceItems.push([`Revitalizador (${qty} un.)`, 10 * qty]); break; }
      case 'kit_revitalizador': { const qty = parseInt(det.quantidade) || 1; priceItems.push([`Kit 2 Revitalizador (${qty} un.)`, 26 * qty]); break; }
      case 'adicionar_metais': {
        const sel = det.metaisSelecionados || [];
        if (sel.includes('Bola grande')) priceItems.push(['Bola grande', 15]);
        if (sel.includes('Strass')) { const qtd = parseInt(det.qtdStrass) || 1; priceItems.push([`Strass (${qtd} un.)`, 0.60 * qtd]); }
        break;
      }
      case 'bota_pronta_entrega': { priceItems.push([det.descricaoProduto || 'Bota Pronta Entrega', parseFloat(det.valorManual) || o.preco]); break; }
      default: priceItems.push([extraLabel, o.preco]); break;
    }
  } else {
    const modeloP = MODELOS.find(m => m.label === o.modelo)?.preco;
    if (modeloP) priceItems.push(['Modelo: ' + o.modelo, modeloP]);
    if (o.sobMedida) priceItems.push(['Sob Medida', SOB_MEDIDA_PRECO]);
    if (o.acessorios) {
      o.acessorios.split(', ').filter(Boolean).forEach(a => {
        const p = ACESSORIOS.find(x => x.label === a)?.preco;
        if (p) priceItems.push([a, p]);
      });
    }
    [o.couroCano, o.couroGaspea, o.couroTaloneira].forEach(t => {
      if (t && COURO_PRECOS[t]) priceItems.push(['Couro: ' + t, COURO_PRECOS[t]]);
    });
    const desenvP = DESENVOLVIMENTO.find(d => d.label === o.desenvolvimento)?.preco;
    if (desenvP) priceItems.push(['Desenvolvimento: ' + o.desenvolvimento, desenvP]);
    const bordadoLists: [string | undefined, typeof BORDADOS_CANO][] = [
      [o.bordadoCano, BORDADOS_CANO],
      [o.bordadoGaspea, BORDADOS_GASPEA],
      [o.bordadoTaloneira, BORDADOS_TALONEIRA],
    ];
    bordadoLists.forEach(([bStr, list]) => {
      if (bStr) bStr.split(', ').filter(Boolean).forEach(b => {
        const p = list.find(x => x.label === b)?.preco;
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
    const corSolaP = COR_SOLA.find(c => c.label === o.corSola)?.preco;
    if (corSolaP) priceItems.push(['Cor Sola: ' + o.corSola, corSolaP]);
    const corViraP = (o.corVira && !['Bege', 'Neutra'].includes(o.corVira)) ? (COR_VIRA.find(c => c.label === o.corVira)?.preco || 0) : 0;
    if (corViraP) priceItems.push(['Cor Vira: ' + o.corVira, corViraP]);
    if (o.costuraAtras === 'Sim') priceItems.push(['Costura Atrás', COSTURA_ATRAS_PRECO]);
    const carimboP = CARIMBO.find(c => c.label === o.carimbo)?.preco;
    if (carimboP) priceItems.push([o.carimbo!, carimboP]);
    if (o.adicionalValor && o.adicionalValor > 0) priceItems.push(['Adicional: ' + (o.adicionalDesc || ''), o.adicionalValor]);
  }
  return priceItems;
}

const SpecializedReports = ({ reports, showTitle = true }: SpecializedReportsProps) => {
  const { allOrders, orders, isAdmin } = useAuth();
  const sourceOrders = isAdmin ? allOrders : orders;

  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [filterVendedor, setFilterVendedor] = useState('todos');
  const [filterProgresso, setFilterProgresso] = useState('todos');

  // Extras/Cintos report state
  const [filterTipoProduto, setFilterTipoProduto] = useState('');
  const [filterCampos, setFilterCampos] = useState<Set<string>>(new Set());

  const vendedores = useMemo(() => [...new Set(sourceOrders.map(o => o.vendedor))].sort(), [sourceOrders]);

  const resetFilters = () => {
    setFilterVendedor('todos');
    setFilterProgresso('todos');
    setFilterTipoProduto('');
    setFilterCampos(new Set());
  };

  const availableFields = useMemo(() => {
    return PRODUCT_GROUPABLE_FIELDS[filterTipoProduto] || [];
  }, [filterTipoProduto]);

  const toggleCampo = (key: string) => {
    setFilterCampos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Escalação: compact block layout ──
  const generateEscalacaoPDF = () => {
    const filtered = sourceOrders.filter(o =>
      (filterProgresso === 'todos' || o.status === filterProgresso) &&
      !o.tipoExtra && o.solado && o.solado !== '' && o.solado !== '-'
    );
    // Group by solado+formatoBico+corSola+corVira
    const groups: Record<string, { solado: string; formatoBico: string; corSola: string; corVira: string; sizes: Record<string, number> }> = {};
    filtered.forEach(o => {
      const key = `${o.solado}|${o.formatoBico}|${o.corSola || ''}|${o.corVira || ''}`;
      if (!groups[key]) groups[key] = { solado: o.solado, formatoBico: o.formatoBico, corSola: o.corSola || '', corVira: o.corVira || '', sizes: {} };
      groups[key].sizes[o.tamanho] = (groups[key].sizes[o.tamanho] || 0) + o.quantidade;
    });
    const blocks: BlockData[] = Object.values(groups).map(g => ({
      badgeLabel: 'SOLA',
      description: `${g.solado} bico ${g.formatoBico} cor ${g.corSola}${g.corVira && !['Bege', 'Neutra'].includes(g.corVira) ? ` vira ${g.corVira}` : ''}`,
      sizes: Object.entries(g.sizes).map(([t, q]) => ({ tamanho: t, quantidade: q })).sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
    })).sort((a, b) => a.description.localeCompare(b.description));

    const totalPares = blocks.reduce((s, b) => s + b.sizes.reduce((ss, sz) => ss + sz.quantidade, 0), 0);
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = filterProgresso === 'todos' ? 'Todos' : filterProgresso;

    const doc = new jsPDF();
    const mx = 14;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`ESCALAÇÃO — ${progressoLabel.toUpperCase()} — ${dataBR}`, mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de pares: ${totalPares} | ${blocks.length} combinações`, mx, 25);

    let y = 32;
    blocks.forEach(block => {
      const bh = estimateBlockHeight(block);
      if (y + bh > 275) { doc.addPage(); y = 18; }
      y = drawBlockLayout(doc, y, mx, block);
    });

    const dateFile = dataBR.replace(/\//g, '-');
    doc.save(`Escalação - ${progressoLabel} - ${dateFile}.pdf`);
  };

  // ── Forro: compact block layout ──
  const generateForroPDF = () => {
    const filtered = sourceOrders.filter(o =>
      (filterProgresso === 'todos' || o.status === filterProgresso) &&
      !o.tipoExtra && o.modelo && o.modelo !== '' && o.modelo !== '-'
    );
    const groups: Record<string, { modelo: string; forma: string; sizes: Record<string, number> }> = {};
    filtered.forEach(o => {
      const forma = getForma(o.modelo, o.formatoBico);
      const key = o.modelo;
      if (!groups[key]) groups[key] = { modelo: o.modelo, forma: '', sizes: {} };
      groups[key].sizes[o.tamanho] = (groups[key].sizes[o.tamanho] || 0) + o.quantidade;
    });
    const blocks: BlockData[] = Object.values(groups).map(g => ({
      badgeLabel: 'MODELO',
      description: g.modelo,
      sizes: Object.entries(g.sizes).map(([t, q]) => ({ tamanho: t, quantidade: q })).sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
    })).sort((a, b) => a.description.localeCompare(b.description));

    const totalPares = blocks.reduce((s, b) => s + b.sizes.reduce((ss, sz) => ss + sz.quantidade, 0), 0);
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = filterProgresso === 'todos' ? 'Todos' : filterProgresso;

    const doc = new jsPDF();
    const mx = 14;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`FORRO — ${progressoLabel.toUpperCase()} — ${dataBR}`, mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de pares: ${totalPares} | ${blocks.length} combinações`, mx, 25);

    let y = 32;
    blocks.forEach(block => {
      const bh = estimateBlockHeight(block);
      if (y + bh > 275) { doc.addPage(); y = 18; }
      y = drawBlockLayout(doc, y, mx, block);
    });

    const dateFile = dataBR.replace(/\//g, '-');
    doc.save(`Forro - ${progressoLabel} - ${dateFile}.pdf`);
  };

  // ── Palmilha: same layout as Forro ──
  const generatePalmilhaPDF = () => {
    const filtered = sourceOrders.filter(o =>
      (filterProgresso === 'todos' || o.status === filterProgresso) &&
      !o.tipoExtra && o.modelo && o.modelo !== '' && o.modelo !== '-'
    );
    const groups: Record<string, { modelo: string; forma: string; sizes: Record<string, number> }> = {};
    filtered.forEach(o => {
      const forma = getForma(o.modelo, o.formatoBico);
      const key = forma || 'sem-forma';
      if (!groups[key]) groups[key] = { modelo: '', forma, sizes: {} };
      groups[key].sizes[o.tamanho] = (groups[key].sizes[o.tamanho] || 0) + o.quantidade;
    });
    const blocks: BlockData[] = Object.values(groups).map(g => ({
      badgeLabel: 'FORMA',
      description: `Forma ${g.forma || '—'}`,
      sizes: Object.entries(g.sizes).map(([t, q]) => ({ tamanho: t, quantidade: q })).sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
    })).sort((a, b) => a.description.localeCompare(b.description));

    const totalPares = blocks.reduce((s, b) => s + b.sizes.reduce((ss, sz) => ss + sz.quantidade, 0), 0);
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = filterProgresso === 'todos' ? 'Todos' : filterProgresso;

    const doc = new jsPDF();
    const mx = 14;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PALMILHA — ${progressoLabel.toUpperCase()} — ${dataBR}`, mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de pares: ${totalPares} | ${blocks.length} combinações`, mx, 25);

    let y = 32;
    blocks.forEach(block => {
      const bh = estimateBlockHeight(block);
      if (y + bh > 275) { doc.addPage(); y = 18; }
      y = drawBlockLayout(doc, y, mx, block);
    });

    const dateFile = dataBR.replace(/\//g, '-');
    doc.save(`Palmilha - ${progressoLabel} - ${dateFile}.pdf`);
  };

  // ── Forma: same as Palmilha ──
  const generateFormaPDF = () => {
    const filtered = sourceOrders.filter(o =>
      (filterProgresso === 'todos' || o.status === filterProgresso) &&
      !o.tipoExtra && o.modelo && o.modelo !== '' && o.modelo !== '-'
    );
    const groups: Record<string, { modelo: string; forma: string; sizes: Record<string, number> }> = {};
    filtered.forEach(o => {
      const forma = getForma(o.modelo, o.formatoBico);
      const key = forma || 'sem-forma';
      if (!groups[key]) groups[key] = { modelo: '', forma, sizes: {} };
      groups[key].sizes[o.tamanho] = (groups[key].sizes[o.tamanho] || 0) + o.quantidade;
    });
    const blocks: BlockData[] = Object.values(groups).map(g => ({
      badgeLabel: 'FORMA',
      description: `Forma ${g.forma || '—'}`,
      sizes: Object.entries(g.sizes).map(([t, q]) => ({ tamanho: t, quantidade: q })).sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
    })).sort((a, b) => a.description.localeCompare(b.description));

    const totalPares = blocks.reduce((s, b) => s + b.sizes.reduce((ss, sz) => ss + sz.quantidade, 0), 0);
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = filterProgresso === 'todos' ? 'Todos' : filterProgresso;

    const doc = new jsPDF();
    const mx = 14;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`FORMA — ${progressoLabel.toUpperCase()} — ${dataBR}`, mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de pares: ${totalPares} | ${blocks.length} combinações`, mx, 25);

    let y = 32;
    blocks.forEach(block => {
      const bh = estimateBlockHeight(block);
      if (y + bh > 275) { doc.addPage(); y = 18; }
      y = drawBlockLayout(doc, y, mx, block);
    });

    const dateFile = dataBR.replace(/\//g, '-');
    doc.save(`Forma - ${progressoLabel} - ${dateFile}.pdf`);
  };

  // ── Pesponto: tabular report for costura sector ──
  const generateNewPespontoPDF = () => {
    const filtered = sourceOrders.filter(o =>
      (filterProgresso === 'todos' || o.status === filterProgresso) &&
      !o.tipoExtra
    );

    const doc = new jsPDF();
    const mx = 14;
    const cw = 182;
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = filterProgresso === 'todos' ? 'Todos' : filterProgresso;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PESPONTO — ${progressoLabel.toUpperCase()} — ${dataBR}`, mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${filtered.length} pedidos`, mx, 25);

    const cols = [25, 45, 85, 27];
    const cx = [mx, mx + cols[0], mx + cols[0] + cols[1], mx + cols[0] + cols[1] + cols[2]];

    let y = drawTableHeader(doc, 32, mx, cw, [
      { label: 'Nº PEDIDO', x: cx[0] + 2 },
      { label: 'CÓDIGO DE BARRAS', x: cx[1] + 2 },
      { label: 'INFORMAÇÕES DE SOLADO', x: cx[2] + 2 },
      { label: 'QTD', x: cx[3] + 2 },
    ]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    let totalQtd = 0;

    filtered.sort((a, b) => { const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0; const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0; if (numB !== numA) return numB - numA; return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime(); });

    for (const o of filtered) {
      const soladoParts: string[] = [];
      if (o.solado) soladoParts.push(o.solado);
      if (o.formatoBico) soladoParts.push(o.formatoBico);
      if (o.corSola) soladoParts.push(`cor ${o.corSola}`);
      if (o.corVira) soladoParts.push(`vira ${o.corVira}`);
      const forma = getForma(o.modelo, o.formatoBico);
      if (forma) soladoParts.push(`forma ${forma}`);
      const soladoText = soladoParts.join(' ') || '—';
      const lines = doc.splitTextToSize(soladoText, cols[2] - 4);
      const rowH = Math.max(14, lines.length * 3.5 + 6);

      if (y + rowH > 280) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, mx, cw, cols, rowH);

      doc.setFontSize(8);
      doc.text(o.numero, cx[0] + 2, y + 5);

      // Barcode
      const barcodeVal = orderBarcodeValue(o.numero, o.id);
      const barcodeImg = barcodeDataUrl(barcodeVal, { width: 1, height: 30 });
      if (barcodeImg) {
        try { doc.addImage(barcodeImg, 'PNG', cx[1] + 2, y + 1, 40, 10); } catch {}
      }

      doc.setFontSize(7);
      doc.text(lines, cx[2] + 2, y + 5);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(String(o.quantidade), cx[3] + 2, y + 5);
      doc.setFont('helvetica', 'normal');

      totalQtd += o.quantidade;
      y += rowH;
    }

    // Footer total
    if (y + 10 > 285) { doc.addPage(); y = 20; }
    doc.setFillColor(232, 232, 232);
    doc.rect(mx, y, cw, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', mx + 2, y + 7);
    doc.text(`${totalQtd} pares`, cx[3] + 2, y + 7);

    const dateFile = dataBR.replace(/\//g, '-');
    doc.save(`Pesponto - ${progressoLabel} - ${dateFile}.pdf`);
  };


  const generateMetaisPDF = async () => {
    const filtered = sourceOrders.filter(o => {
      if (filterProgresso !== 'todos' && o.status !== filterProgresso) return false;
      // Only include orders that have metal fields filled
      const hasMetals = (o.metais && o.metais !== '' && o.metais !== 'Não' && o.metais !== '-') || (o.tipoMetal && o.tipoMetal !== '' && o.tipoMetal !== '-') || (o.corMetal && o.corMetal !== '' && o.corMetal !== '-') || (o.strassQtd && o.strassQtd > 0) || (o.cruzMetalQtd && o.cruzMetalQtd > 0) || (o.bridaoMetalQtd && o.bridaoMetalQtd > 0);
      return !!hasMetals;
    });

    const doc = new jsPDF();
    const mx = 14;
    const cw = 182;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Metais — 7ESTRIVOS', mx, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, mx, 27);
    doc.text(`Filtro: ${filterProgresso === 'todos' ? 'Todos' : filterProgresso} | Total: ${filtered.length} pedidos`, mx, 32);

    const cols = [25, 120, 37];
    const cx = [mx, mx + cols[0], mx + cols[0] + cols[1]];

    let y = drawTableHeader(doc, 38, mx, cw, [
      { label: 'Nº PEDIDO', x: cx[0] + 2 },
      { label: 'DESCRIÇÃO DE METAIS', x: cx[1] + 2 },
      { label: 'QR CODE', x: cx[2] + 2 },
    ]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    filtered.sort((a, b) => { const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0; const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0; if (numB !== numA) return numB - numA; return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime(); });

    for (const o of filtered) {
      const metalParts: string[] = [];
      if (o.metais) metalParts.push(`Área: ${o.metais}`);
      if (o.tipoMetal) metalParts.push(`Tipo: ${o.tipoMetal}`);
      if (o.corMetal) metalParts.push(`Cor: ${o.corMetal}`);
      if (o.strassQtd && o.strassQtd > 0) metalParts.push(`Strass: ${o.strassQtd} un.`);
      if (o.cruzMetalQtd && o.cruzMetalQtd > 0) metalParts.push(`Cruz: ${o.cruzMetalQtd} un.`);
      if (o.bridaoMetalQtd && o.bridaoMetalQtd > 0) metalParts.push(`Bridão: ${o.bridaoMetalQtd} un.`);
      const metalText = metalParts.join(' | ');
      const lines = doc.splitTextToSize(metalText, cols[1] - 4);
      const rowH = Math.max(18, lines.length * 3.5 + 6);

      if (y + rowH > 280) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, mx, cw, cols, rowH);
      doc.setFontSize(8);
      doc.text(o.numero, cx[0] + 2, y + 5);
      doc.setFontSize(7);
      doc.text(lines, cx[1] + 2, y + 5);

      const fotoUrl = o.fotos?.[0];
      if (fotoUrl) {
        const qr = await qrDataUrl(fotoUrl);
        if (qr) try { doc.addImage(qr, 'PNG', cx[2] + 4, y + 1, 14, 14); } catch {}
      }
      y += rowH;
    }

    doc.save('relatorio-metais.pdf');
  };

  // ── Bordados: new layout with QR + Receita ──
  const generateBordadosPDF = async () => {
    const filtered = sourceOrders.filter(o => {
      if (filterProgresso !== 'todos' && o.status !== filterProgresso) return false;
      if (o.tipoExtra === 'cinto') {
        const det = (o.extraDetalhes as any) || {};
        return det.bordadoP === 'Tem' || det.bordadoP === 'Sim' || det.nomeBordado === 'Tem' || det.nomeBordado === 'Sim';
      }
      const hasBordado =
        (o.bordadoCano && o.bordadoCano !== '' && o.bordadoCano !== 'Não' && o.bordadoCano !== '-') ||
        (o.bordadoGaspea && o.bordadoGaspea !== '' && o.bordadoGaspea !== 'Não' && o.bordadoGaspea !== '-') ||
        (o.bordadoTaloneira && o.bordadoTaloneira !== '' && o.bordadoTaloneira !== 'Não' && o.bordadoTaloneira !== '-') ||
        (o.nomeBordadoDesc && o.nomeBordadoDesc !== '' && o.nomeBordadoDesc !== '-') ||
        (o.personalizacaoNome && o.personalizacaoNome !== '' && o.personalizacaoNome !== 'Não' && o.personalizacaoNome !== '-') ||
        (o.personalizacaoBordado && o.personalizacaoBordado !== '' && o.personalizacaoBordado !== 'Não' && o.personalizacaoBordado !== '-');
      return !!hasBordado;
    });

    const doc = new jsPDF();
    const mx = 14;
    const cw = 182;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Bordados — 7ESTRIVOS', mx, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, mx, 27);
    doc.text(`Filtro: ${filterProgresso === 'todos' ? 'Todos' : filterProgresso} | Total: ${filtered.length} pedidos`, mx, 32);

    const cols = [25, 90, 25, 42];
    const cx = [mx, mx + cols[0], mx + cols[0] + cols[1], mx + cols[0] + cols[1] + cols[2]];

    let y = drawTableHeader(doc, 38, mx, cw, [
      { label: 'Nº PEDIDO', x: cx[0] + 2 },
      { label: 'DESCRIÇÃO DO BORDADO', x: cx[1] + 2 },
      { label: 'QR CODE', x: cx[2] + 2 },
      { label: 'RECEITA', x: cx[3] + 2 },
    ]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);

    filtered.sort((a, b) => {
      const isBeltA = a.tipoExtra === 'cinto' ? 1 : 0;
      const isBeltB = b.tipoExtra === 'cinto' ? 1 : 0;
      if (isBeltA !== isBeltB) return isBeltA - isBeltB;

      if (!isBeltA) {
        const keyA = `${a.bordadoCano || ''}|${a.corBordadoCano || ''}|${a.bordadoGaspea || ''}|${a.corBordadoGaspea || ''}`;
        const keyB = `${b.bordadoCano || ''}|${b.corBordadoCano || ''}|${b.bordadoGaspea || ''}|${b.corBordadoGaspea || ''}`;
        const cmp = keyA.localeCompare(keyB);
        if (cmp !== 0) return cmp;
      } else {
        const detA = (a.extraDetalhes as any) || {};
        const detB = (b.extraDetalhes as any) || {};
        const keyA = `${detA.bordadoPDesc || ''}|${detA.bordadoPCor || ''}`;
        const keyB = `${detB.bordadoPDesc || ''}|${detB.bordadoPCor || ''}`;
        const cmp = keyA.localeCompare(keyB);
        if (cmp !== 0) return cmp;
      }

      const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    for (const o of filtered) {
      const parts: string[] = [];
      if (o.tipoExtra === 'cinto') {
        const det = (o.extraDetalhes as any) || {};
        parts.push('CINTO');
        if (det.bordadoP === 'Tem' || det.bordadoP === 'Sim') {
          parts.push(`Bordado P: ${det.bordadoPDesc || ''} ${det.bordadoPCor || ''}`);
        }
        if (det.nomeBordado === 'Tem' || det.nomeBordado === 'Sim') {
          parts.push(`Nome: ${det.nomeBordadoDesc || ''}${det.nomeBordadoCor ? ' cor: ' + det.nomeBordadoCor : ''}${det.nomeBordadoFonte ? ' fonte: ' + det.nomeBordadoFonte : ''}`);
        }
      } else {
        if (o.bordadoCano) {
          if (o.bordadoCano.includes('Bordado Variado')) {
            if (o.bordadoVariadoDescCano) parts.push(`Cano: ${o.bordadoVariadoDescCano}`);
            if (o.corBordadoCano) parts.push(`Cor Cano: ${o.corBordadoCano}`);
          } else {
            parts.push(`Cano: ${o.bordadoCano}`);
            if (o.corBordadoCano) parts.push(`Cor Cano: ${o.corBordadoCano}`);
          }
        }
        if (o.bordadoGaspea) {
          if (o.bordadoGaspea.includes('Bordado Variado')) {
            if (o.bordadoVariadoDescGaspea) parts.push(`Gáspea: ${o.bordadoVariadoDescGaspea}`);
            if (o.corBordadoGaspea) parts.push(`Cor Gáspea: ${o.corBordadoGaspea}`);
          } else {
            parts.push(`Gáspea: ${o.bordadoGaspea}`);
            if (o.corBordadoGaspea) parts.push(`Cor Gáspea: ${o.corBordadoGaspea}`);
          }
        }
        if (o.bordadoTaloneira) {
          if (o.bordadoTaloneira.includes('Bordado Variado')) {
            if (o.bordadoVariadoDescTaloneira) parts.push(`Taloneira: ${o.bordadoVariadoDescTaloneira}`);
            if (o.corBordadoTaloneira) parts.push(`Cor Talon.: ${o.corBordadoTaloneira}`);
          } else {
            parts.push(`Taloneira: ${o.bordadoTaloneira}`);
            if (o.corBordadoTaloneira) parts.push(`Cor Talon.: ${o.corBordadoTaloneira}`);
          }
        }
        if (o.nomeBordadoDesc || o.personalizacaoNome) parts.push(`Nome: ${o.nomeBordadoDesc || o.personalizacaoNome}`);
      }
      if (o.observacao) parts.push(`Obs: ${o.observacao}`);
      const descText = parts.join('\n');
      const lines = doc.splitTextToSize(descText, cols[1] - 4);
      const rowH = Math.max(20, lines.length * 3 + 6);

      if (y + rowH > 280) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, mx, cw, cols, rowH);
      doc.setFontSize(8);
      doc.text(o.numero, cx[0] + 2, y + 5);
      doc.setFontSize(6);
      doc.text(lines, cx[1] + 2, y + 4);

      const fotoUrl = o.fotos?.[0];
      if (fotoUrl) {
        const qr = await qrDataUrl(fotoUrl);
        if (qr) try { doc.addImage(qr, 'PNG', cx[2] + 3, y + 1, 14, 14); } catch {}
      }
      // Receita: blank field (already empty rect from drawTableRow)
      y += rowH;
    }

    doc.save('relatorio-bordados.pdf');
  };

  // ── Corte: tabular layout sorted by couro+cor ──
  const generateCortePDF = async () => {
    const filtered = sourceOrders.filter(o =>
      (filterProgresso === 'todos' || o.status === filterProgresso) &&
      (!o.tipoExtra || o.tipoExtra === 'cinto')
    );

    // Sort: boots first (by couro+cor), then belts grouped together, tiebreak by number
    filtered.sort((a, b) => {
      const isBeltA = a.tipoExtra === 'cinto' ? 1 : 0;
      const isBeltB = b.tipoExtra === 'cinto' ? 1 : 0;
      if (isBeltA !== isBeltB) return isBeltA - isBeltB;
      if (!isBeltA) {
        const keyA = `${a.couroCano || ''}|${a.corCouroCano || ''}`;
        const keyB = `${b.couroCano || ''}|${b.corCouroCano || ''}`;
        const cmp = keyA.localeCompare(keyB);
        if (cmp !== 0) return cmp;
      }
      const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = 210;
    const mx = 14;
    const cw = pw - mx * 2;
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = filterProgresso === 'todos' ? 'Todos' : filterProgresso;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Corte — 7ESTRIVOS', mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Filtro: ${progressoLabel} | Total: ${filtered.length} pedidos | ${dataBR}`, mx, 25);

    const cols = [25, 90, 25, 42];
    const cx = [mx, mx + cols[0], mx + cols[0] + cols[1], mx + cols[0] + cols[1] + cols[2]];

    let y = drawTableHeader(doc, 32, mx, cw, [
      { label: 'Nº PEDIDO', x: cx[0] + 2 },
      { label: 'DESCRIÇÃO DO CORTE', x: cx[1] + 2 },
      { label: 'QR CODE', x: cx[2] + 2 },
      { label: 'CHECK', x: cx[3] + 2 },
    ]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);

    for (const o of filtered) {
      const parts: string[] = [];
      if (o.tipoExtra === 'cinto') {
        const det = (o.extraDetalhes as any) || {};
        parts.push('CINTO');
        if (det.tamanhoCinto) parts.push(`Tamanho: ${det.tamanhoCinto}`);
        if (det.fivela) parts.push(`Fivela: ${det.fivela}${det.fivelaOutroDesc ? ' - ' + det.fivelaOutroDesc : ''}`);
        if (det.bordadoP === 'Sim') parts.push(`Bordado P: ${det.bordadoPDesc || ''} ${det.bordadoPCor || ''}`);
        if (det.nomeBordado === 'Sim') parts.push(`Nome: ${det.nomeBordadoDesc || ''}`);
        if (det.carimbo) parts.push(`Carimbo: ${det.carimbo} - ${det.carimboDesc || ''}`);
      } else {
        if (o.couroCano || o.corCouroCano) parts.push(`Cano: ${o.couroCano || ''} ${o.corCouroCano || ''}`);
        if (o.couroGaspea || o.corCouroGaspea) parts.push(`Gáspea: ${o.couroGaspea || ''} ${o.corCouroGaspea || ''}`);
        if (o.couroTaloneira || o.corCouroTaloneira) parts.push(`Talon.: ${o.couroTaloneira || ''} ${o.corCouroTaloneira || ''}`);
        const modeloLine = [o.modelo, o.tamanho, o.genero].filter(Boolean).join(' – ');
        if (modeloLine) parts.push(modeloLine);
        if (o.acessorios) parts.push(`Acessórios: ${o.acessorios}`);
        if (o.estampa === 'Sim') parts.push(`Estampa: ${o.estampaDesc || 'Sim'}`);
        if (o.adicionalDesc) parts.push(`Extras: ${o.adicionalDesc}`);
      }
      if (o.observacao) parts.push(`Obs: ${o.observacao}`);
      const descText = parts.join('\n');
      const lines = doc.splitTextToSize(descText, cols[1] - 4);
      const rowH = Math.max(20, lines.length * 3 + 6);

      if (y + rowH > 280) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, mx, cw, cols, rowH);
      doc.setFontSize(8);
      doc.text(o.numero, cx[0] + 2, y + 5);
      doc.setFontSize(6);
      doc.text(lines, cx[1] + 2, y + 4);

      const fotoUrl = o.fotos?.[0];
      if (fotoUrl) {
        const qr = await qrDataUrl(fotoUrl);
        if (qr) try { doc.addImage(qr, 'PNG', cx[2] + 3, y + 1, 14, 14); } catch {}
      }
      // CHECK: empty column for manual marking
      y += rowH;
    }

    doc.save('relatorio-corte.pdf');
  };

  // ── Expedição: tabular A4 layout with composition + data ──
  const generateExpedicaoPDF = () => {
    const filtered = sourceOrders.filter(o =>
      o.status.toLowerCase() === 'expedição' &&
      (filterVendedor === 'todos' || o.vendedor === filterVendedor)
    ).sort((a, b) => { const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0; const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0; if (numB !== numA) return numB - numA; return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime(); });

    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = 210;
    const mx = 14;
    const cw = pw - mx * 2;
    const geradoEm = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const vendedorLabel = filterVendedor === 'todos' ? 'Todos vendedores' : filterVendedor;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Expedição  [${geradoEm} — ${vendedorLabel}]`, mx, 20);

    const cols = [25, 22, 60, 15, 30, cw - 25 - 22 - 60 - 15 - 30];
    const cx = [mx, mx + cols[0], mx + cols[0] + cols[1], mx + cols[0] + cols[1] + cols[2], mx + cols[0] + cols[1] + cols[2] + cols[3], mx + cols[0] + cols[1] + cols[2] + cols[3] + cols[4]];

    let y = 30;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(232, 232, 232);
    doc.rect(mx, y, cw, 8, 'F');
    doc.text('Nº PEDIDO', cx[0] + 1, y + 5.5);
    doc.text('DATA', cx[1] + 1, y + 5.5);
    doc.text('COMPOSIÇÃO', cx[2] + 1, y + 5.5);
    doc.text('QTD', cx[3] + 1, y + 5.5);
    doc.text('PREÇO', cx[4] + 1, y + 5.5);
    doc.text('ASSINATURA', cx[5] + 1, y + 5.5);
    y += 8;

    let totalValor = 0;
    let totalQtd = 0;

    doc.setFont('helvetica', 'normal');
    filtered.forEach(o => {
      const compItems = buildCompositionItems(o);
      const compText = compItems.map(([name, val]) => `${name} ${formatCurrency(val)}`).join('\n');
      doc.setFontSize(5);
      const lines = doc.splitTextToSize(compText, cols[2] - 4);
      const rowH = Math.max(12, lines.length * 2.8 + 4);

      if (y + rowH > 280) { doc.addPage(); y = 20; }
      doc.setLineWidth(0.2);
      doc.rect(mx, y, cw, rowH);
      cols.reduce((x, w) => { doc.line(x + w, y, x + w, y + rowH); return x + w; }, mx);

      doc.setFontSize(8);
      doc.text(o.numero, cx[0] + 1, y + 5);
      doc.setFontSize(7);
      doc.text(formatDateBR(o.dataCriacao), cx[1] + 1, y + 5);

      doc.setFontSize(5);
      doc.text(lines, cx[2] + 1, y + 4);

      doc.setFontSize(8);
      doc.text(String(o.quantidade), cx[3] + 1, y + 5);
      const orderTotal = o.tipoExtra ? o.preco : compItems.reduce((s, [, v]) => s + v, 0);
      doc.text(formatCurrency(orderTotal * o.quantidade), cx[4] + 1, y + 5);
      doc.setLineWidth(0.3);
      doc.line(cx[5] + 4, y + rowH - 4, cx[5] + cols[5] - 4, y + rowH - 4);

      y += rowH;
      totalValor += orderTotal * o.quantidade;
      totalQtd += o.quantidade;
    });

    if (y + 10 > 285) { doc.addPage(); y = 20; }
    doc.setFillColor(232, 232, 232);
    doc.rect(mx, y, cw, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', cx[0] + 1, y + 7);
    doc.text(String(totalQtd), cx[3] + 1, y + 7);
    doc.text(formatCurrency(totalValor), cx[4] + 1, y + 7);

    const dateFile = geradoEm.replace(/\//g, '-');
    const valorFile = formatCurrency(totalValor).replace(/[^\d.,]/g, '').trim();
    doc.save(`Expedição - ${vendedorLabel} - ${dateFile} - R$ ${valorFile} - ${totalQtd} pares.pdf`);
  };

  // ── Cobrança: tabular A4 layout ──
  const generateCobrancaPDF = () => {
    const filtered = sourceOrders.filter(o =>
      o.status.toLowerCase() === 'entregue' &&
      (filterVendedor === 'todos' || o.vendedor === filterVendedor)
    ).sort((a, b) => { const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0; const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0; if (numB !== numA) return numB - numA; return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime(); });

    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = 210;
    const mx = 14;
    const cw = pw - mx * 2;
    const geradoEm = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const vendedorLabel = filterVendedor === 'todos' ? 'Todos vendedores' : filterVendedor;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Cobrança  [${geradoEm} — ${vendedorLabel}]`, mx, 20);

    const cols = [45, 22, 68, 15, 32];
    const cx = [mx, mx + cols[0], mx + cols[0] + cols[1], mx + cols[0] + cols[1] + cols[2], mx + cols[0] + cols[1] + cols[2] + cols[3]];
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
        priceItems.push(['Cinto', 0]);
        const sizeEntry = BELT_SIZES.find(s => s.label === det.tamanhoCinto);
        if (sizeEntry) priceItems.push([`Tamanho: ${sizeEntry.label}`, sizeEntry.preco]);
        if (det.bordadoP === 'Sim') priceItems.push(['Bordado P', BORDADO_P_PRECO]);
        if (det.nomeBordado === 'Sim') priceItems.push(['Nome Bordado', NOME_BORDADO_CINTO_PRECO]);
        const carimboEntry = BELT_CARIMBO.find(c => c.label === det.carimbo);
        if (carimboEntry) priceItems.push([det.carimbo, carimboEntry.preco]);
      } else if (o.tipoExtra && o.extraDetalhes) {
        const det = o.extraDetalhes as any;
        const extraLabel = o.modelo.replace('Extra — ', '');

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
            if (sel.includes('Bola grande')) priceItems.push(['Bola grande', 15]);
            if (sel.includes('Strass')) {
              const qtd = parseInt(det.qtdStrass) || 1;
              priceItems.push([`Strass (${qtd} un.)`, 0.60 * qtd]);
            }
            break;
          }
          case 'bota_pronta_entrega': {
            priceItems.push([det.descricaoProduto || 'Bota Pronta Entrega', parseFloat(det.valorManual) || o.preco]);
            break;
          }
          default:
            priceItems.push([extraLabel, o.preco]);
            break;
        }
      } else {
        const modeloP = MODELOS.find(m => m.label === o.modelo)?.preco;
        if (modeloP) priceItems.push(['Modelo: ' + o.modelo, modeloP]);
        if (o.sobMedida) priceItems.push(['Sob Medida', SOB_MEDIDA_PRECO]);
        if (o.acessorios) {
          o.acessorios.split(', ').filter(Boolean).forEach(a => {
            const p = ACESSORIOS.find(x => x.label === a)?.preco;
            if (p) priceItems.push([a, p]);
          });
        }
        [o.couroCano, o.couroGaspea, o.couroTaloneira].forEach(t => {
          if (t && COURO_PRECOS[t]) priceItems.push(['Couro: ' + t, COURO_PRECOS[t]]);
        });
        const desenvP = DESENVOLVIMENTO.find(d => d.label === o.desenvolvimento)?.preco;
        if (desenvP) priceItems.push(['Desenvolvimento: ' + o.desenvolvimento, desenvP]);
        // Bordados — use region-specific price lists
        const bordadoLists: [string | undefined, typeof BORDADOS_CANO][] = [
          [o.bordadoCano, BORDADOS_CANO],
          [o.bordadoGaspea, BORDADOS_GASPEA],
          [o.bordadoTaloneira, BORDADOS_TALONEIRA],
        ];
        bordadoLists.forEach(([bStr, list]) => {
          if (bStr) bStr.split(', ').filter(Boolean).forEach(b => {
            const p = list.find(x => x.label === b)?.preco;
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
        const corSolaP = COR_SOLA.find(c => c.label === o.corSola)?.preco;
        if (corSolaP) priceItems.push(['Cor Sola: ' + o.corSola, corSolaP]);
        const corViraP = (o.corVira && !['Bege', 'Neutra'].includes(o.corVira)) ? (COR_VIRA.find(c => c.label === o.corVira)?.preco || 0) : 0;
        if (corViraP) priceItems.push(['Cor Vira: ' + o.corVira, corViraP]);
        if (o.costuraAtras === 'Sim') priceItems.push(['Costura Atrás', COSTURA_ATRAS_PRECO]);
        const carimboP = CARIMBO.find(c => c.label === o.carimbo)?.preco;
        if (carimboP) priceItems.push([o.carimbo!, carimboP]);
        if (o.adicionalValor && o.adicionalValor > 0) priceItems.push(['Adicional: ' + (o.adicionalDesc || ''), o.adicionalValor]);
      }

      const orderTotal = o.tipoExtra ? o.preco : priceItems.reduce((s, [, v]) => s + v, 0);
      const compText = priceItems.map(([name, val]) => `${name} ${formatCurrency(val)}`).join('\n');

      doc.setFontSize(6);
      const lines = doc.splitTextToSize(compText, cols[2] - 4);
      const rowH = Math.max(14, lines.length * 3.5 + 6);

      if (y + rowH > 280) { doc.addPage(); y = 20; }

      doc.setLineWidth(0.2);
      doc.rect(mx, y, tableW, rowH);
      let colX = mx;
      for (let i = 0; i < cols.length - 1; i++) {
        colX += cols[i];
        doc.line(colX, y, colX, y + rowH);
      }

      doc.setFontSize(8);
      doc.text(o.numero, cx[0] + 1, y + 5);

      // Barcode below order number
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

      doc.setFontSize(8);
      doc.text(String(o.quantidade), cx[3] + 1, y + 5);
      doc.text(formatCurrency(orderTotal), cx[4] + 1, y + 5);

      y += rowH;
      totalValor += orderTotal;
      totalQtd += o.quantidade;
    });

    if (y + 10 > 285) { doc.addPage(); y = 20; }
    doc.setFillColor(232, 232, 232);
    doc.rect(mx, y, tableW, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', cx[0] + 1, y + 7);
    doc.text(String(totalQtd), cx[3] + 1, y + 7);
    doc.text(formatCurrency(totalValor), cx[4] + 1, y + 7);

    const dateFile = geradoEm.replace(/\//g, '-');
    const valorFile = formatCurrency(totalValor).replace(/[^\d.,]/g, '').trim();
    doc.save(`Cobrança - ${vendedorLabel} - ${dateFile} - R$ ${valorFile} - ${totalQtd} pares.pdf`);
  };

  // ── Extras / Cintos: grouping report ──
  const generateExtrasCintosPDF = () => {
    if (!filterTipoProduto) return;
    const selectedFields = Array.from(filterCampos);
    if (selectedFields.length === 0) return;

    // Filter orders by tipoExtra
    const filtered = sourceOrders.filter(o => o.tipoExtra === filterTipoProduto && o.extraDetalhes);

    // Group by combination of selected fields
    const groups: Record<string, { fields: Record<string, string>; quantidade: number }> = {};
    filtered.forEach(o => {
      const det = o.extraDetalhes as any;
      const fieldValues: Record<string, string> = {};
      selectedFields.forEach(key => {
        let val = det[key];
        if (Array.isArray(val)) val = val.join(', ');
        fieldValues[key] = val != null && val !== '' ? String(val) : '(vazio)';
      });
      const groupKey = selectedFields.map(k => fieldValues[k]).join('|||');
      if (!groups[groupKey]) groups[groupKey] = { fields: fieldValues, quantidade: 0 };
      groups[groupKey].quantidade += o.quantidade;
    });

    const rows = Object.values(groups).sort((a, b) => b.quantidade - a.quantidade);
    const productLabel = EXTRAS_CINTOS_PRODUCTS.find(p => p.value === filterTipoProduto)?.label || filterTipoProduto;

    const doc = new jsPDF();
    const mx = 14;
    const cw = 182;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Relatório: ${productLabel} — 7ESTRIVOS`, mx, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, mx, 27);
    doc.text(`Total de pedidos encontrados: ${filtered.length} | Combinações: ${rows.length}`, mx, 32);

    // Build columns dynamically: one per selected field + Qtd Total
    const fieldLabels = selectedFields.map(k => {
      const found = availableFields.find(f => f.key === k);
      return found ? found.label : (EXTRA_DETAIL_LABELS[k] || k);
    });
    const totalCols = fieldLabels.length + 1; // +1 for Qtd Total
    const qtdColW = 25;
    const fieldColW = Math.floor((cw - qtdColW) / fieldLabels.length);

    const headerItems = fieldLabels.map((label, i) => ({
      label: label.toUpperCase(),
      x: mx + i * fieldColW + 2,
    }));
    headerItems.push({ label: 'QTD TOTAL', x: mx + fieldLabels.length * fieldColW + 2 });

    const colWidths = fieldLabels.map(() => fieldColW);
    colWidths.push(qtdColW);

    let y = drawTableHeader(doc, 38, mx, cw, headerItems);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const rowH = 8;
    rows.forEach(r => {
      if (y + rowH > 280) { doc.addPage(); y = 20; }
      drawTableRow(doc, y, mx, cw, colWidths, rowH);
      selectedFields.forEach((key, i) => {
        const text = r.fields[key] || '';
        const truncated = text.length > 30 ? text.substring(0, 28) + '...' : text;
        doc.text(truncated, mx + i * fieldColW + 2, y + 5.5);
      });
      doc.setFont('helvetica', 'bold');
      doc.text(String(r.quantidade), mx + fieldLabels.length * fieldColW + 2, y + 5.5);
      doc.setFont('helvetica', 'normal');
      y += rowH;
    });

    // Footer total
    if (y + 10 > 285) { doc.addPage(); y = 20; }
    doc.setFillColor(232, 232, 232);
    doc.rect(mx, y, cw, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', mx + 2, y + 7);
    doc.text(String(rows.reduce((s, r) => s + r.quantidade, 0)), mx + fieldLabels.length * fieldColW + 2, y + 7);

    doc.save(`relatorio-${filterTipoProduto}.pdf`);
  };

  const generateReport = () => {
    if (!activeReport) return;
    switch (activeReport) {
      case 'escalacao': generateEscalacaoPDF(); break;
      case 'forro': generateForroPDF(); break;
      case 'palmilha': generatePalmilhaPDF(); break;
      case 'forma': generateFormaPDF(); break;
      case 'pesponto': generateNewPespontoPDF(); break;
      case 'metais': generateMetaisPDF(); break;
      case 'bordados': generateBordadosPDF(); break;
      case 'corte': generateCortePDF(); break;
      case 'expedicao': generateExpedicaoPDF(); break;
      case 'cobranca': generateCobrancaPDF(); break;
      case 'extras_cintos': generateExtrasCintosPDF(); break;
    }
  };

  const needsProgressFilter = activeReport === 'escalacao' || activeReport === 'forro' || activeReport === 'palmilha' || activeReport === 'forma' || activeReport === 'pesponto' || activeReport === 'metais' || activeReport === 'bordados' || activeReport === 'corte';
  const needsVendedorFilter = activeReport === 'expedicao' || activeReport === 'cobranca';
  const needsExtrasCintosFilter = activeReport === 'extras_cintos';

  const progressOptions = useMemo(() => {
    return PRODUCTION_STATUSES;
  }, [activeReport]);

  return (
    <div className="bg-card rounded-xl p-6 western-shadow">
      {showTitle && (
        <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
          <FileText className="text-primary" size={22} /> Relatórios Especializados
        </h2>
      )}

      {/* Report buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {reports.map(r => (
          <button
            key={r}
            onClick={() => { setActiveReport(activeReport === r ? null : r); resetFilters(); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
              activeReport === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10'
            }`}
          >
            {REPORT_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Filters when a report is selected */}
      {activeReport && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-semibold">{REPORT_LABELS[activeReport]}</p>

          {needsProgressFilter && (
            <div>
              <label className="block text-xs font-semibold mb-1">Progresso de Produção</label>
              <Select value={filterProgresso} onValueChange={setFilterProgresso}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {progressOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsVendedorFilter && (
            <div>
              <label className="block text-xs font-semibold mb-1">Vendedor</label>
              <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos vendedores</SelectItem>
                  {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsExtrasCintosFilter && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Produto</label>
                <Select value={filterTipoProduto} onValueChange={(v) => { setFilterTipoProduto(v); setFilterCampos(new Set()); }}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXTRAS_CINTOS_PRODUCTS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterTipoProduto && availableFields.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-2">Campos para agrupar</label>
                  <div className="flex flex-wrap gap-3">
                    {availableFields.map(f => (
                      <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={filterCampos.has(f.key)}
                          onCheckedChange={() => toggleCampo(f.key)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={needsExtrasCintosFilter && (!filterTipoProduto || filterCampos.size === 0)}
            className="orange-gradient text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> GERAR PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default SpecializedReports;
