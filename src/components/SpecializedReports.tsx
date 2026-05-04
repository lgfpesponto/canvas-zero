import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth, Order, orderBarcodeValue, PRODUCTION_STATUSES, EXTRAS_STATUSES } from '@/contexts/AuthContext';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { FileText, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { getOrderFinalValue, getOrderBaseValue } from '@/lib/order-logic';
import {
  MODELOS, ACESSORIOS, BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA, COURO_PRECOS, SOLADO, COR_SOLA, COR_VIRA,
  CARIMBO, AREA_METAL, DESENVOLVIMENTO,
  SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO, PINTURA_PRECO,
  TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, STRASS_PRECO, CRUZ_METAL_PRECO,
  BRIDAO_METAL_PRECO, LASER_CANO_PRECO, LASER_GASPEA_PRECO, GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO,
  getForma, getCorSolaPrecoContextual,
} from '@/lib/orderFieldsConfig';
import { BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO, EXTRA_DETAIL_LABELS } from '@/lib/extrasConfig';
import { getCouroSortKey, stampPageNumbers, generateBordadoBaixaResumoPDF } from '@/lib/pdfGenerators';
import { recordPrintHistory } from '@/lib/printHistory';
import { ensurePriceCache, priceWithFallback } from '@/lib/priceCache';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';

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

type ReportType = 'escalacao' | 'forro' | 'palmilha' | 'forma' | 'pesponto' | 'metais' | 'bordados' | 'corte' | 'expedicao' | 'cobranca' | 'extras_cintos' | 'comissao_bordado';

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
  comissao_bordado: 'Comissão Bordado',
};

const PESPONTO_STATUSES = ['Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05', 'Pesponto Ailton', 'Pespontando'];
const BORDADO_STATUSES = ['Bordado Dinei', 'Bordado Sandro', 'Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos'];

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
  bainha_cartao: [
    { key: 'tipoCouro', label: 'Tipo de Couro' },
    { key: 'corCouro', label: 'Cor do Couro' },
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
        if (sel.includes('Bola grande')) { const qtd = parseInt(det.qtdBolaGrande) || 1; priceItems.push([`Bola grande (${qtd} un.)`, 0.60 * qtd]); }
        if (sel.includes('Strass')) { const qtd = parseInt(det.qtdStrass) || 1; priceItems.push([`Strass (${qtd} un.)`, 0.60 * qtd]); }
        break;
      }
      case 'bota_pronta_entrega': {
        if (Array.isArray(det.botas) && det.botas.length > 0) {
          det.botas.forEach((b: any, i: number) => {
            priceItems.push([b.descricaoProduto || `Bota ${i + 1}`, parseFloat(b.valorManual) || 0]);
            if (Array.isArray(b.extras)) {
              b.extras.forEach((ex: any) => {
                const LABELS: Record<string, string> = { tiras_laterais: 'Tiras Laterais', carimbo_fogo: 'Carimbo a Fogo', kit_faca: 'Kit Faca', kit_canivete: 'Kit Canivete', adicionar_metais: 'Adicionar Metais' };
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
      default: priceItems.push([extraLabel, o.preco]); break;
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
  return priceItems;
}

const SpecializedReports = ({ reports, showTitle = true }: SpecializedReportsProps) => {
  const { isAdmin, user } = useAuth();
  const userName = user?.nomeCompleto || '';
  // Fetch all orders from DB (no limit)
  const { orders: sourceOrders, loading: ordersLoading } = useOrdersQuery({ enabled: true });

  // Pré-carrega o cache de preços (variações cadastradas no admin) para que o
  // breakdown dos PDFs use os preços REAIS do banco — e não as constantes hardcoded.
  useEffect(() => { ensurePriceCache(); }, []);

  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [filterVendedor, setFilterVendedor] = useState('todos');
  const [filterProgresso, setFilterProgresso] = useState<Set<string>>(new Set());
  // Filtro de período por data de criação — usado apenas no relatório de Corte
  const [filterDataDe, setFilterDataDe] = useState('');
  const [filterDataAte, setFilterDataAte] = useState('');

  // Compara strings YYYY-MM-DD lexicograficamente (válido por ser ISO).
  const dataMatches = (dataCriacao: string) => {
    if (!filterDataDe && !filterDataAte) return true;
    if (filterDataDe && dataCriacao < filterDataDe) return false;
    if (filterDataAte && dataCriacao > filterDataAte) return false;
    return true;
  };

  // Helpers para o filtro multi-seleção de "Progresso de Produção".
  // Vazio = "Todos" (mantém o comportamento histórico).
  const progressoMatches = (status: string) => filterProgresso.size === 0 || filterProgresso.has(status);
  const progressoLabelText = () => {
    if (filterProgresso.size === 0) return 'Todos';
    return [...filterProgresso].join(' / ');
  };
  const progressoFileLabel = () => {
    if (filterProgresso.size === 0) return 'Todos';
    if (filterProgresso.size === 1) return [...filterProgresso][0];
    return `${filterProgresso.size} status`;
  };

  // Extras/Cintos report state
  const [filterTipoProduto, setFilterTipoProduto] = useState('');
  const [filterCampos, setFilterCampos] = useState<Set<string>>(new Set());

  // Comissão Bordado: filtro por quem deu baixa
  const [filterBordadoUsuarios, setFilterBordadoUsuarios] = useState<Set<string>>(new Set());
  const [bordadoUsuariosOptions, setBordadoUsuariosOptions] = useState<string[]>([]);

  const vendedores = useMemo(() => [...new Set(sourceOrders.map(o => o.vendedor))].sort(), [sourceOrders]);

  // Carrega usuários distintos que já deram baixa de bordado (para o multiselect)
  useEffect(() => {
    if (activeReport !== 'comissao_bordado') return;
    if (bordadoUsuariosOptions.length > 0) return;
    (async () => {
      const fallback = ['Mariana ADM', 'Debora', 'Neto'];
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('historico')
          .limit(2000);
        if (error) throw error;
        const set = new Set<string>();
        for (const row of (data || [])) {
          const hist = Array.isArray((row as any).historico) ? (row as any).historico : [];
          for (const h of hist) {
            if (h?.local === 'Baixa Bordado 7Estrivos' && typeof h?.usuario === 'string' && h.usuario.trim()) {
              set.add(h.usuario.trim());
            }
          }
        }
        if (set.size === 0) fallback.forEach(u => set.add(u));
        setBordadoUsuariosOptions([...set].sort());
      } catch {
        setBordadoUsuariosOptions(fallback);
      }
    })();
  }, [activeReport, bordadoUsuariosOptions.length]);

  const resetFilters = () => {
    setFilterVendedor('todos');
    setFilterProgresso(new Set());
    setFilterTipoProduto('');
    setFilterCampos(new Set());
    setFilterDataDe('');
    setFilterDataAte('');
    setFilterBordadoUsuarios(new Set());
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
      progressoMatches(o.status) &&
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
    const progressoLabel = progressoLabelText();
    const progressoFile = progressoFileLabel();

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
    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Escalação', userName);
    doc.save(`Escalação - ${progressoFile} - ${dateFile}.pdf`);
  };

  // ── Forro: compact block layout ──
  const generateForroPDF = () => {
    const filtered = sourceOrders.filter(o =>
      progressoMatches(o.status) &&
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

    // Cintos section
    const cintoOrders = sourceOrders.filter(o =>
      progressoMatches(o.status) &&
      o.tipoExtra === 'cinto'
    );
    const cintoSizes: Record<string, number> = {};
    cintoOrders.forEach(o => {
      const det = (o.extraDetalhes || {}) as Record<string, any>;
      const tam = det.tamanhoCinto || 'N/D';
      cintoSizes[tam] = (cintoSizes[tam] || 0) + o.quantidade;
    });

    // Build cinto block using same format as boot blocks
    let cintoBlock: BlockData | null = null;
    if (Object.keys(cintoSizes).length > 0) {
      cintoBlock = {
        badgeLabel: 'CINTOS',
        description: 'Cintos',
        sizes: Object.entries(cintoSizes)
          .map(([t, q]) => ({ tamanho: t, quantidade: q }))
          .sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
      };
    }

    const totalPares = blocks.reduce((s, b) => s + b.sizes.reduce((ss, sz) => ss + sz.quantidade, 0), 0)
      + (cintoBlock ? cintoBlock.sizes.reduce((s, sz) => s + sz.quantidade, 0) : 0);
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = progressoLabelText();
    const progressoFile = progressoFileLabel();

    const doc = new jsPDF();
    const mx = 14;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`FORRO — ${progressoLabel.toUpperCase()} — ${dataBR}`, mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de pares: ${totalPares} | ${blocks.length + (cintoBlock ? 1 : 0)} combinações`, mx, 25);

    let y = 32;
    blocks.forEach(block => {
      const bh = estimateBlockHeight(block);
      if (y + bh > 275) { doc.addPage(); y = 18; }
      y = drawBlockLayout(doc, y, mx, block);
    });

    // Draw cintos block using same layout as boots
    if (cintoBlock) {
      const bh = estimateBlockHeight(cintoBlock);
      if (y + bh > 275) { doc.addPage(); y = 18; }
      y = drawBlockLayout(doc, y, mx, cintoBlock);
    }

    const dateFile = dataBR.replace(/\//g, '-');
    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Forro', userName);
    doc.save(`Forro - ${progressoFile} - ${dateFile}.pdf`);
  };

  // ── Palmilha: same layout as Forro ──
  const generatePalmilhaPDF = () => {
    const filtered = sourceOrders.filter(o =>
      progressoMatches(o.status) &&
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
    const progressoLabel = progressoLabelText();
    const progressoFile = progressoFileLabel();

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
    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Palmilha', userName);
    doc.save(`Palmilha - ${progressoFile} - ${dateFile}.pdf`);
  };

  // ── Forma: same as Palmilha ──
  const generateFormaPDF = () => {
    const filtered = sourceOrders.filter(o =>
      progressoMatches(o.status) &&
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
    const progressoLabel = progressoLabelText();
    const progressoFile = progressoFileLabel();

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
    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Forma', userName);
    doc.save(`Forma - ${progressoFile} - ${dateFile}.pdf`);
  };

  // ── Pesponto: tabular report for costura sector ──
  const generateNewPespontoPDF = () => {
    const filtered = sourceOrders.filter(o =>
      progressoMatches(o.status) &&
      !o.tipoExtra
    );

    const doc = new jsPDF();
    const mx = 14;
    const cw = 182;
    const dataBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const progressoLabel = progressoLabelText();
    const progressoFile = progressoFileLabel();

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
      const numLinesPesp = doc.splitTextToSize(o.numero, cols[0] - 4);
      numLinesPesp.forEach((line: string, li: number) => {
        doc.text(line, cx[0] + 2, y + 5 + li * 3);
      });

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
    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Pesponto', userName);
    doc.save(`Pesponto - ${progressoFile} - ${dateFile}.pdf`);
  };


  const generateMetaisPDF = async () => {
    const filtered = sourceOrders.filter(o => {
      if (!progressoMatches(o.status)) return false;
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
    doc.text(`Filtro: ${progressoLabelText()} | Total: ${filtered.length} pedidos`, mx, 32);

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
      const numLinesMet = doc.splitTextToSize(o.numero, cols[0] - 4);
      numLinesMet.forEach((line: string, li: number) => {
        doc.text(line, cx[0] + 2, y + 5 + li * 3);
      });
      doc.setFontSize(7);
      doc.text(lines, cx[1] + 2, y + 5);

      const fotoUrl = o.fotos?.[0];
      if (fotoUrl) {
        const qr = await qrDataUrl(fotoUrl);
        if (qr) try { doc.addImage(qr, 'PNG', cx[2] + 4, y + 1, 14, 14); } catch {}
      }
      y += rowH;
    }

    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Metais', userName);
    doc.save('relatorio-metais.pdf');
  };

  // ── Bordados: new layout with QR + Receita ──
  const generateBordadosPDF = async () => {
    const filtered = sourceOrders.filter(o => {
      if (!progressoMatches(o.status)) return false;
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
    doc.text(`Filtro: ${progressoLabelText()} | Total: ${filtered.length} pedidos`, mx, 32);

    const cols = [42, 110, 18, 12];
    const cx = [
      mx,
      mx + cols[0],
      mx + cols[0] + cols[1],
      mx + cols[0] + cols[1] + cols[2],
    ];

    let y = drawTableHeader(doc, 38, mx, cw, [
      { label: 'Nº PEDIDO', x: cx[0] + 2 },
      { label: 'DESCRIÇÃO DO BORDADO', x: cx[1] + 2 },
      { label: 'QR CODE', x: cx[2] + 2 },
      { label: 'CHECK', x: cx[3] + 1 },
    ]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);

    filtered.sort((a, b) => {
      const isBeltA = a.tipoExtra === 'cinto' ? 1 : 0;
      const isBeltB = b.tipoExtra === 'cinto' ? 1 : 0;
      if (isBeltA !== isBeltB) return isBeltA - isBeltB;

      if (!isBeltA) {
        // Primary: couro priority + cor
        const prioA = getCouroSortKey(a.couroCano || '');
        const prioB = getCouroSortKey(b.couroCano || '');
        if (prioA !== prioB) return prioA - prioB;
        const tipoComp = (a.couroCano || '').localeCompare(b.couroCano || '');
        if (tipoComp !== 0) return tipoComp;
        const corComp = (a.corCouroCano || '').localeCompare(b.corCouroCano || '');
        if (corComp !== 0) return corComp;
        // Secondary: bordado grouping
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

      // Coluna 1: código de barras em cima + nº do pedido escrito embaixo
      try {
        const bcVal = orderBarcodeValue(o.numero, o.id);
        const bcImg = barcodeDataUrl(bcVal, { width: 1, height: 30 });
        if (bcImg) doc.addImage(bcImg, 'PNG', cx[0] + 2, y + 2, 38, 8);
      } catch {}
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(o.numero, cx[0] + cols[0] / 2, y + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      // Descrição
      doc.setFontSize(6);
      doc.text(lines, cx[1] + 2, y + 4);

      // QR code
      const fotoUrl = o.fotos?.[0];
      if (fotoUrl) {
        const qr = await qrDataUrl(fotoUrl);
        if (qr) try { doc.addImage(qr, 'PNG', cx[2] + 2, y + (rowH - 14) / 2, 14, 14); } catch {}
      }

      // Checkbox pequeno
      doc.setLineWidth(0.3);
      doc.rect(cx[3] + (cols[3] - 5) / 2, y + (rowH - 5) / 2, 5, 5);

      y += rowH;
    }

    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Bordados', userName);
    doc.save('relatorio-bordados.pdf');
  };

  // ── Corte: tabular layout sorted by couro+cor ──
  const generateCortePDF = async () => {
    const filtered = sourceOrders.filter(o =>
      progressoMatches(o.status) &&
      dataMatches(o.dataCriacao) &&
      (!o.tipoExtra || o.tipoExtra === 'cinto')
    );

    // Sort: boots first (by couro priority+cor), then belts grouped together, tiebreak by number
    filtered.sort((a, b) => {
      const isBeltA = a.tipoExtra === 'cinto' ? 1 : 0;
      const isBeltB = b.tipoExtra === 'cinto' ? 1 : 0;
      if (isBeltA !== isBeltB) return isBeltA - isBeltB;
      if (!isBeltA) {
        const prioA = getCouroSortKey(a.couroCano || '');
        const prioB = getCouroSortKey(b.couroCano || '');
        if (prioA !== prioB) return prioA - prioB;
        const tipoComp = (a.couroCano || '').localeCompare(b.couroCano || '');
        if (tipoComp !== 0) return tipoComp;
        const corComp = (a.corCouroCano || '').localeCompare(b.corCouroCano || '');
        if (corComp !== 0) return corComp;
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
    const progressoLabel = progressoLabelText();
    const progressoFile = progressoFileLabel();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Corte — 7ESTRIVOS', mx, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const periodoLabel = (filterDataDe || filterDataAte)
      ? ` | Período: ${filterDataDe ? formatDateBR(filterDataDe) : '...'} a ${filterDataAte ? formatDateBR(filterDataAte) : '...'}`
      : '';
    doc.text(`Filtro: ${progressoLabel}${periodoLabel} | Total: ${filtered.length} pedidos | ${dataBR}`, mx, 25);

    const cols = [42, 110, 18, 12];
    const cx = [
      mx,
      mx + cols[0],
      mx + cols[0] + cols[1],
      mx + cols[0] + cols[1] + cols[2],
    ];

    let y = drawTableHeader(doc, 32, mx, cw, [
      { label: 'Nº PEDIDO', x: cx[0] + 2 },
      { label: 'DESCRIÇÃO DO CORTE', x: cx[1] + 2 },
      { label: 'QR CODE', x: cx[2] + 2 },
      { label: 'CHECK', x: cx[3] + 1 },
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
        // Recortes (cano / gáspea / taloneira) com suas cores
        if (o.recorteCano || o.corRecorteCano) parts.push(`Recorte Cano: ${o.recorteCano || ''}${o.corRecorteCano ? ' - ' + o.corRecorteCano : ''}`.trim());
        if (o.recorteGaspea || o.corRecorteGaspea) parts.push(`Recorte Gáspea: ${o.recorteGaspea || ''}${o.corRecorteGaspea ? ' - ' + o.corRecorteGaspea : ''}`.trim());
        if (o.recorteTaloneira || o.corRecorteTaloneira) parts.push(`Recorte Talon.: ${o.recorteTaloneira || ''}${o.corRecorteTaloneira ? ' - ' + o.corRecorteTaloneira : ''}`.trim());
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

      // Coluna 1: código de barras em cima + nº do pedido escrito embaixo
      try {
        const bcVal = orderBarcodeValue(o.numero, o.id);
        const bcImg = barcodeDataUrl(bcVal, { width: 1, height: 30 });
        if (bcImg) doc.addImage(bcImg, 'PNG', cx[0] + 2, y + 2, 38, 8);
      } catch {}
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(o.numero, cx[0] + cols[0] / 2, y + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      // Descrição
      doc.setFontSize(6);
      doc.text(lines, cx[1] + 2, y + 4);

      // QR code
      const fotoUrl = o.fotos?.[0];
      if (fotoUrl) {
        const qr = await qrDataUrl(fotoUrl);
        if (qr) try { doc.addImage(qr, 'PNG', cx[2] + 2, y + (rowH - 14) / 2, 14, 14); } catch {}
      }

      // Checkbox pequeno
      doc.setLineWidth(0.3);
      doc.rect(cx[3] + (cols[3] - 5) / 2, y + (rowH - 5) / 2, 5, 5);

      y += rowH;
    }

    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Corte', userName);
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
      const numLinesExp = doc.splitTextToSize(o.numero, cols[0] - 4);
      numLinesExp.forEach((line: string, li: number) => {
        doc.text(line, cx[0] + 1, y + 5 + li * 3);
      });
      doc.setFontSize(7);
      doc.text(formatDateBR(o.dataCriacao), cx[1] + 1, y + 5);

      doc.setFontSize(5);
      doc.text(lines, cx[2] + 1, y + 4);

      doc.setFontSize(8);
      const isBotaPE_exp = o.tipoExtra === 'bota_pronta_entrega';
      const detExp = (o.extraDetalhes || {}) as any;
      const realQtdExp = isBotaPE_exp && Array.isArray(detExp.botas) ? detExp.botas.length : o.quantidade;
      // Valor exibido = valor final do pedido (já com desconto, se houver).
      // Centralizado em getOrderFinalValue para bater com lista, detalhe e demais PDFs.
      const orderTotal = getOrderFinalValue(o);
      doc.text(String(realQtdExp), cx[3] + 1, y + 5);
      doc.text(formatCurrency(orderTotal), cx[4] + 1, y + 5);
      doc.setLineWidth(0.3);
      doc.line(cx[5] + 4, y + rowH - 4, cx[5] + cols[5] - 4, y + rowH - 4);

      y += rowH;
      totalValor += orderTotal;
      totalQtd += realQtdExp;
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
    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Expedição', userName);
    doc.save(`Expedição - ${vendedorLabel} - ${dateFile} - R$ ${valorFile} - ${totalQtd} pares.pdf`);
  };

  // ── Cobrança: tabular A4 layout ──
  const generateCobrancaPDF = () => {
    const DEFAULT_COBRANCA = ['Entregue', 'Conferido', 'Cobrado', 'Pago'];
    const selecionados = filterProgresso.size === 0 ? DEFAULT_COBRANCA : [...filterProgresso];
    const statusSetLower = new Set(selecionados.map(s => s.trim().toLowerCase()));
    const filtered = sourceOrders.filter(o =>
      statusSetLower.has((o.status || '').trim().toLowerCase()) &&
      (filterVendedor === 'todos' || o.vendedor === filterVendedor)
    ).sort((a, b) => {
      // Igual ao portal: data_criacao desc, hora_criacao desc, numero desc
      const dA = (a.dataCriacao || '');
      const dB = (b.dataCriacao || '');
      if (dA !== dB) return dA < dB ? 1 : -1;
      const hA = (a.horaCriacao || '');
      const hB = (b.horaCriacao || '');
      if (hA !== hB) return hA < hB ? 1 : -1;
      const numA = parseInt((a.numero || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b.numero || '').replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = 210;
    const mx = 14;
    const cw = pw - mx * 2;
    const geradoEm = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const vendedorLabel = filterVendedor === 'todos' ? 'Todos vendedores' : filterVendedor;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const statusLabel = selecionados.join(' / ');
    doc.text(`Cobrança  [${geradoEm} — ${vendedorLabel} — ${statusLabel}]`, mx, 20);

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
        // Tamanho do cinto pode estar salvo como "1,10 cm" ou "1,10 cm (R$X)" — usa startsWith
        const tamRaw: string = det.tamanhoCinto || '';
        const sizeEntry = BELT_SIZES.find(s => tamRaw.startsWith(s.label));
        if (sizeEntry) priceItems.push([`Tamanho: ${sizeEntry.label}`, sizeEntry.preco]);
        // Bordado/Nome são salvos como 'Tem' (criação/edição). Mantém 'Sim' por compatibilidade.
        if (det.bordadoP === 'Tem' || det.bordadoP === 'Sim') priceItems.push(['Bordado P', BORDADO_P_PRECO]);
        if (det.nomeBordado === 'Tem' || det.nomeBordado === 'Sim') priceItems.push(['Nome Bordado', NOME_BORDADO_CINTO_PRECO]);
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
                    const LABELS: Record<string, string> = { tiras_laterais: 'Tiras Laterais', carimbo_fogo: 'Carimbo a Fogo', kit_faca: 'Kit Faca', kit_canivete: 'Kit Canivete', adicionar_metais: 'Adicionar Metais' };
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
        // Couros — preço REAL do banco POR REGIÃO (cano/gáspea/taloneira). Antes
        // o PDF usava COURO_PRECOS[t], um mapa global por NOME do couro, ignorando
        // a região e cobrando o mesmo valor nos 3 campos. O detalhe do pedido já
        // respeita o preço por região; agora o PDF também respeita.
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
        // Bordados — busca em todos os aliases possíveis (categoria visual, categoria
        // legada e slug do campo). "bordados-visual" cobre os bordados cadastrados
        // no editor visual; "bordados-cano" mantém compatibilidade com o cadastro
        // antigo; e o slug do CAMPO (`bordado_cano`) cobre custom_options.
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
        // Cor da Vira: o detalhe lista qualquer cor com preço > 0 (sem filtro
        // antecipado por nome). Mantemos o mesmo critério aqui.
        const corViraP = COR_VIRA.find(c => c.label === o.corVira)?.preco || 0;
        if (corViraP > 0) priceItems.push(['Cor Vira: ' + o.corVira, corViraP]);
        if (o.costuraAtras === 'Sim') priceItems.push(['Costura Atrás', COSTURA_ATRAS_PRECO]);
        const carimboP = CARIMBO.find(c => c.label === o.carimbo)?.preco;
        if (carimboP) priceItems.push([o.carimbo!, carimboP]);
        if (o.adicionalValor && o.adicionalValor > 0) priceItems.push(['Adicional: ' + (o.adicionalDesc || ''), o.adicionalValor]);
      }

      const isBotaPE_cob = o.tipoExtra === 'bota_pronta_entrega';
      // Total = preco × quantidade − desconto direto do banco (mesma fórmula do Portal e da
      // RPC get_orders_totals). A coluna "Composição" continua listando os itens só para
      // referência; não é mais usada como base do total para evitar divergência quando
      // tabelas de preço (ficha_variacoes / custom_options) mudam após o pedido ser fechado.
      const subtotalCalc = priceItems.reduce((s, [, v]) => s + (Number(v) || 0), 0);
      const orderTotal = getOrderFinalValue(o);
      const baseDb = getOrderBaseValue(o);
      const tabelaDivergente = (!o.tipoExtra || o.tipoExtra === 'cinto')
        && subtotalCalc > 0
        && Math.abs(subtotalCalc - baseDb) > 0.01;
      if (o.desconto && o.desconto !== 0) {
        const isAcr = o.desconto < 0;
        const label = isAcr ? 'Acréscimo' : 'Desconto';
        // Sempre exibe valor absoluto positivo; o rótulo + bolinha colorida no nº do pedido
        // indicam o tipo. Antes "-R$" no Desconto sumia visualmente no PDF.
        priceItems.push([label, Math.abs(o.desconto)]);
      }
      // Última justificativa que afetou o valor (admin_master/admin_producao)
      const ultimaJust = [...(o.alteracoes || [])]
        .reverse()
        .find(a => a.afetouValor && a.justificativa);
      // Remove prefixo "Acréscimo/Desconto aplicado: R$ X,XX — " da justificativa
      // (o valor já é mostrado na linha própria acima, não repetir).
      const justifTextoLimpo = ultimaJust
        ? ultimaJust.justificativa
            .replace(/^\s*(Acréscimo|Desconto)\s+aplicado:\s*R\$\s*[\d.,]+\s*[—\-–]\s*/i, '')
            .trim()
        : '';
      const justifLines: string[] = ultimaJust
        ? [`Justificativa (${ultimaJust.data} por ${ultimaJust.usuario || '—'}): ${justifTextoLimpo}`]
        : [];
      const divergLines: string[] = tabelaDivergente
        ? [`(valor congelado do pedido — soma da tabela atual: ${formatCurrency(subtotalCalc)})`]
        : [];
      const compText = [
        ...priceItems.map(([name, val]) => `${name} ${formatCurrency(val)}`),
        ...divergLines,
        ...justifLines,
      ].join('\n');

      doc.setFontSize(6);
      const lines = doc.splitTextToSize(compText, cols[2] - 4);
      // Altura mínima precisa abraçar a bolinha (centro em y+17, raio 2 → vai até y+19)
      // quando o pedido tem desconto/acréscimo. Sem isso, em linhas curtas a bolinha
      // estouraria o quadro e apareceria dentro do pedido de baixo.
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

      // Indicador visual: bolinha na coluna do número do pedido, abaixo do código de barras.
      // Verde = acréscimo ativo (desconto < 0), vermelho = desconto ativo (desconto > 0).
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

    const dateFile = geradoEm.replace(/\//g, '-');
    const valorFile = formatCurrency(totalValor).replace(/[^\d.,]/g, '').trim();
    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Cobrança', userName);
    doc.save(`Cobrança - ${vendedorLabel} - ${dateFile} - R$ ${valorFile} - ${totalQtd} pares.pdf`);
  };

  // ── Extras / Cintos: grouping report ──
  const generateExtrasCintosPDF = () => {
    if (!filterTipoProduto) return;
    const selectedFields = Array.from(filterCampos);
    if (selectedFields.length === 0) return;

    // Filter orders by tipoExtra
    const filtered = sourceOrders.filter(o => o.tipoExtra === filterTipoProduto && o.extraDetalhes && progressoMatches(o.status));
    if (filtered.length === 0) {
      toast.error('Nenhum pedido encontrado para os filtros selecionados');
      return;
    }

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
    const progressLabel = filterProgresso.size > 0 ? ` (${progressoLabelText()})` : '';
    doc.text(`Relatório: ${productLabel}${progressLabel} — 7ESTRIVOS`, mx, 20);
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

    stampPageNumbers(doc);
    void recordPrintHistory(filtered.map(o => o.id), 'Extras/Cintos', userName);
    doc.save(`relatorio-${filterTipoProduto}.pdf`);
  };

  // ── Comissão Bordado: replicates BordadoPortalPage.gerarPDF ──
  const generateComissaoBordadoPDF = async () => {
    if (!filterDataDe || !filterDataAte) { toast.error('Informe o período (De e Até).'); return; }
    if (filterDataDe > filterDataAte) { toast.error('Data inicial maior que a final.'); return; }
    try {
      const { data: ids, error } = await supabase.rpc('find_orders_by_status_change' as any, {
        _status: ['Baixa Bordado 7Estrivos'],
        _de: filterDataDe,
        _ate: filterDataAte,
      });
      if (error) throw error;
      const idList = (ids || []).map((r: any) => r.id ?? r);
      if (idList.length === 0) { toast.info('Nenhum pedido baixado no período.'); return; }
      const { data: rows, error: fErr } = await supabase.from('orders').select('*').in('id', idList);
      if (fErr) throw fErr;
      const list = (rows || []).map(dbRowToOrder) as Order[];
      const baixaIdx = PRODUCTION_STATUSES.indexOf('Baixa Bordado 7Estrivos');
      const valid = list.filter(o => {
        const idx = PRODUCTION_STATUSES.indexOf(o.status);
        return idx >= baixaIdx && o.status !== 'Cancelado';
      });
      if (valid.length === 0) { toast.info('Nenhum pedido baixado no período.'); return; }
      await generateBordadoBaixaResumoPDF(valid, filterDataDe, filterDataAte, userName || 'Admin', filterBordadoUsuarios.size > 0 ? [...filterBordadoUsuarios] : undefined);
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.message || err));
    }
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
      case 'comissao_bordado': void generateComissaoBordadoPDF(); break;
    }
  };

  const needsProgressFilter = activeReport === 'escalacao' || activeReport === 'forro' || activeReport === 'palmilha' || activeReport === 'forma' || activeReport === 'pesponto' || activeReport === 'metais' || activeReport === 'bordados' || activeReport === 'corte' || activeReport === 'extras_cintos' || activeReport === 'cobranca';
  const needsVendedorFilter = activeReport === 'expedicao' || activeReport === 'cobranca';
  const needsExtrasCintosFilter = activeReport === 'extras_cintos';
  const needsComissaoBordadoFilter = activeReport === 'comissao_bordado';

  const progressOptions = useMemo(() => {
    if (activeReport === 'extras_cintos') return EXTRAS_STATUSES;
    if (activeReport === 'cobranca') return ['Entregue', 'Conferido', 'Cobrado', 'Pago'];
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
            onClick={() => {
              const next = activeReport === r ? null : r;
              setActiveReport(next);
              resetFilters();
              if (next === 'cobranca') setFilterProgresso(new Set(['Entregue']));
            }}
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
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="bg-background border border-input rounded-md px-3 py-2 text-sm w-64 text-left">
                    {filterProgresso.size === 0
                      ? 'Todos'
                      : `${filterProgresso.size} selecionado${filterProgresso.size > 1 ? 's' : ''}`}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-h-72 overflow-y-auto p-3" align="start">
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => setFilterProgresso(new Set(progressOptions))} className="text-xs font-semibold text-primary hover:underline">Todos</button>
                    <button type="button" onClick={() => setFilterProgresso(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline">Nenhum</button>
                  </div>
                  <div className="space-y-2">
                    {progressOptions.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filterProgresso.has(s)}
                          onCheckedChange={() => {
                            setFilterProgresso(prev => {
                              const next = new Set(prev);
                              next.has(s) ? next.delete(s) : next.add(s);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm">{s}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {activeReport === 'corte' && (
            <div>
              <label className="block text-xs font-semibold mb-1">Período de criação (opcional)</label>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">De</label>
                  <input
                    type="date"
                    value={filterDataDe}
                    onChange={(e) => setFilterDataDe(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Até</label>
                  <input
                    type="date"
                    value={filterDataAte}
                    onChange={(e) => setFilterDataAte(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm"
                  />
                </div>
                {(filterDataDe || filterDataAte) && (
                  <button
                    type="button"
                    onClick={() => { setFilterDataDe(''); setFilterDataAte(''); }}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline pb-2"
                  >
                    Limpar datas
                  </button>
                )}
              </div>
            </div>
          )}

          {needsComissaoBordadoFilter && (
            <div>
              <label className="block text-xs font-semibold mb-1">Período de baixa (obrigatório)</label>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">De</label>
                  <input
                    type="date"
                    value={filterDataDe}
                    onChange={(e) => setFilterDataDe(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Até</label>
                  <input
                    type="date"
                    value={filterDataAte}
                    onChange={(e) => setFilterDataAte(e.target.value)}
                    className="bg-background border border-input rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Resumo das baixas válidas no período (mesmo PDF gerado pelo portal Bordado).
              </p>

              <div className="mt-3">
                <label className="block text-xs font-semibold mb-1">Quem deu baixa (opcional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="bg-background border border-input rounded-md px-3 py-2 text-sm w-64 text-left">
                      {filterBordadoUsuarios.size === 0
                        ? 'Todos'
                        : `${filterBordadoUsuarios.size} selecionado${filterBordadoUsuarios.size > 1 ? 's' : ''}`}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 max-h-72 overflow-y-auto p-3" align="start">
                    <div className="flex gap-2 mb-3">
                      <button type="button" onClick={() => setFilterBordadoUsuarios(new Set(bordadoUsuariosOptions))} className="text-xs font-semibold text-primary hover:underline">Todos</button>
                      <button type="button" onClick={() => setFilterBordadoUsuarios(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline">Nenhum</button>
                    </div>
                    {bordadoUsuariosOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Carregando...</p>
                    ) : (
                      <div className="space-y-2">
                        {bordadoUsuariosOptions.map(u => (
                          <label key={u} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={filterBordadoUsuarios.has(u)}
                              onCheckedChange={() => {
                                setFilterBordadoUsuarios(prev => {
                                  const next = new Set(prev);
                                  next.has(u) ? next.delete(u) : next.add(u);
                                  return next;
                                });
                              }}
                            />
                            <span className="text-sm">{u}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-2">
                  Vazio = todas as baixas do período. Útil para separar baixas administrativas das do bordado.
                </p>
              </div>
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
