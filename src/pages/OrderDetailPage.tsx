import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, businessDaysRemaining, formatBrasiliaDate, formatBrasiliaTime, orderBarcodeValue, matchOrderBarcode, PRODUCTION_STATUSES, EXTRAS_STATUSES, BELT_STATUSES } from '@/contexts/AuthContext';
import { useOrderById } from '@/hooks/useOrderById';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';
import { useCustomOptions } from '@/hooks/useCustomOptions';
import { fetchOrderByScan } from '@/hooks/useOrders';
import { useSelectedOrders } from '@/hooks/useSelectedOrders';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Clock, History, Pencil, ScanBarcode, CheckSquare, Loader2, Printer, Image as ImageIcon } from 'lucide-react';
import { FotoPedidoSidePanel } from '@/components/FotoPedidoSidePanel';
import { isHttpUrl } from '@/lib/driveUrl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  MODELOS, ACESSORIOS, BORDADOS, BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA,
  COURO_PRECOS, SOLADO, COR_SOLA, COR_VIRA,
  CARIMBO, AREA_METAL, DESENVOLVIMENTO,
  SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO, PINTURA_PRECO,
  TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, STRASS_PRECO, CRUZ_METAL_PRECO,
  BRIDAO_METAL_PRECO, CAVALO_METAL_PRECO, FRANJA_PRECO, CORRENTE_PRECO,
  LASER_CANO_PRECO, LASER_GASPEA_PRECO, GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO,
  VIRA_HIDDEN,
} from '@/lib/orderFieldsConfig';
import { EXTRA_PRODUCT_NAME_MAP, EXTRA_DETAIL_LABELS, EXTRA_INTERNAL_KEYS, isExtraValueEmpty, BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO } from '@/lib/extrasConfig';

const OrderDetailPage = () => {
  const { id } = useParams();
  const { isAdmin, user, updateOrder, isFernanda, role } = useAuth();
  const { toggle, isSelected, count, clear, selectedIds } = useSelectedOrders();
  const navigate = useNavigate();
  const { order, loading: orderLoading, refetch: refetchOrder } = useOrderById(id);
  const { findFichaPrice } = useFichaVariacoesLookup();
  const { getByCategoria } = useCustomOptions();

  const [descontoInput, setDescontoInput] = useState('');
  const [justificativaInput, setJustificativaInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkCancelReason, setBulkCancelReason] = useState('');
  const [fotoOpen, setFotoOpen] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScanSubmit = useCallback(async () => {
    if (!scanValue.trim()) return;
    if (scanning) return;
    setScanning(true);
    try {
      const match = await fetchOrderByScan(scanValue.trim());
      if (match) {
        if (order && !isSelected(order.id)) {
          toggle(order.id);
        }
        setScanValue('');
        navigate('/pedido/' + match.id);
      } else {
        toast.error('Pedido não encontrado.');
        setScanValue('');
      }
    } finally {
      setScanning(false);
    }
  }, [scanValue, navigate, order, isSelected, toggle, scanning]);

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
      </div>
    );
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDateBR = (date: string) => {
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  };

  // Calculate days remaining
  const createdDate = new Date(order.dataCriacao + 'T00:00:00');
  const totalBizDays = order.tipoExtra === 'cinto' ? 5 : order.tipoExtra ? 1 : 15;
  const daysLeft = businessDaysRemaining(createdDate, totalBizDays);

  // Build details list (only filled fields)
  const showCliente = !isAdmin || order.vendedor === 'Rancho Chique';
  const details: [string, string][] = [
    ['Modelo', order.modelo],
    ...(showCliente && order.cliente ? [['Cliente', order.cliente] as [string, string]] : []),
    ['Tamanho', order.tamanho ? `${order.tamanho}${order.genero ? ' — ' + order.genero : ''}` : ''],
    ['Sob Medida', order.sobMedida ? `Sim${order.sobMedidaDesc ? ' — ' + order.sobMedidaDesc : ''}` : ''],
    ['Acessórios', order.acessorios],
    ['Tipo Couro Cano', order.couroCano],
    ['Cor Couro Cano', order.corCouroCano || ''],
    ['Tipo Couro Gáspea', order.couroGaspea],
    ['Cor Couro Gáspea', order.corCouroGaspea || ''],
    ['Tipo Couro Taloneira', order.couroTaloneira],
    ['Cor Couro Taloneira', order.corCouroTaloneira || ''],
    ['Desenvolvimento', order.desenvolvimento],
    ['Bordado Cano', order.bordadoCano],
    ['Cor Bordado Cano', order.corBordadoCano || ''],
    ['Bordado Gáspea', order.bordadoGaspea],
    ['Cor Bordado Gáspea', order.corBordadoGaspea || ''],
    ['Bordado Taloneira', order.bordadoTaloneira],
    ['Cor Bordado Taloneira', order.corBordadoTaloneira || ''],
    ['Nome Bordado', order.nomeBordadoDesc || order.personalizacaoNome || ''],
    ['Laser Cano', order.laserCano || ''],
    ['Cor Glitter/Tecido Cano', order.corGlitterCano || ''],
    ['Laser Gáspea', order.laserGaspea || ''],
    ['Cor Glitter/Tecido Gáspea', order.corGlitterGaspea || ''],
    ['Laser Taloneira', order.laserTaloneira || ''],
    ['Cor Glitter/Tecido Taloneira', order.corGlitterTaloneira || ''],
    ['Pintura', order.pintura === 'Sim' ? (order.pinturaDesc || 'Sim') : ''],
    ['Estampa', order.estampa === 'Sim' ? (order.estampaDesc ? `Sim — ${order.estampaDesc}` : 'Sim') : ''],
    ['Cor da Linha', order.corLinha],
    ['Cor Borrachinha', order.corBorrachinha],
    ['Cor do Vivo', order.corVivo || ''],
    ['Área Metal', order.metais],
    ['Tipo Metal', order.tipoMetal || ''],
    ['Cor Metal', order.corMetal || ''],
    ['Strass', order.strassQtd ? `${order.strassQtd} un.` : ''],
    ['Cruz (metal)', order.cruzMetalQtd ? `${order.cruzMetalQtd} un.` : ''],
    ['Bridão (metal)', order.bridaoMetalQtd ? `${order.bridaoMetalQtd} un.` : ''],
    ['Cavalo (metal)', (order.extraDetalhes as any)?.cavaloMetal ? `${(order.extraDetalhes as any).cavaloMetalQtd || 0} un.` : ''],
    ['Tricê', order.trisce === 'Sim' ? (order.triceDesc || 'Sim') : ''],
    ['Tiras', order.tiras === 'Sim' ? (order.tirasDesc || 'Sim') : ''],
    ['Franja', (order.extraDetalhes as any)?.franja ? [(order.extraDetalhes as any).franjaCouro, (order.extraDetalhes as any).franjaCor].filter(Boolean).join(' — ') || 'Sim' : ''],
    ['Corrente', (order.extraDetalhes as any)?.corrente ? ((order.extraDetalhes as any).correnteCor || 'Sim') : ''],
    ['Solado', order.solado],
    ['Formato do Bico', order.formatoBico || ''],
    ['Cor da Sola', order.corSola || ''],
    ['Cor da Vira', (order.corVira && !VIRA_HIDDEN.includes(order.corVira)) ? order.corVira : ''],
    ['Costura Atrás', order.costuraAtras === 'Sim' ? 'Sim' : ''],
    ['Carimbo a Fogo', order.carimbo ? `${order.carimbo}${order.carimboDesc ? ' — ' + order.carimboDesc : ''}` : ''],
    ['Adicional', order.adicionalDesc ? `${order.adicionalDesc}${order.adicionalValor ? ` — ${formatCurrency(order.adicionalValor)}` : ''}` : ''],
  ].filter(([, v]) => v) as [string, string][];

  // Build price breakdown list
  const priceItems: [string, number][] = [];
  const modeloP = MODELOS.find(m => m.label === order.modelo)?.preco;
  if (modeloP) priceItems.push(['Modelo: ' + order.modelo, modeloP]);
  if (order.sobMedida) priceItems.push(['Sob Medida', SOB_MEDIDA_PRECO]);
  if (order.acessorios) {
    order.acessorios.split(', ').filter(Boolean).forEach(a => {
      const p = ACESSORIOS.find(x => x.label === a)?.preco;
      if (p) priceItems.push([a, p]);
    });
  }
  [
    [order.couroCano, 'couro_cano'],
    [order.couroGaspea, 'couro_gaspea'],
    [order.couroTaloneira, 'couro_taloneira'],
  ].forEach(([t, cat]) => {
    if (!t) return;
    const p = findFichaPrice(t, cat) ?? COURO_PRECOS[t] ?? 0;
    if (p) priceItems.push(['Couro: ' + t, p]);
  });
  const desenvP = DESENVOLVIMENTO.find(d => d.label === order.desenvolvimento)?.preco;
  if (desenvP) priceItems.push(['Desenvolvimento: ' + order.desenvolvimento, desenvP]);
  const findDetailPrice = (b: string, cat: string, fallback: { label: string; preco: number }[]) =>
    findFichaPrice(b, cat) ?? getByCategoria(cat).find(x => x.label === b)?.preco ?? fallback.find(x => x.label === b)?.preco ?? 0;

  const bordadoPairs: [string | undefined, string, { label: string; preco: number }[]][] = [
    [order.bordadoCano, 'bordado_cano', BORDADOS_CANO],
    [order.bordadoGaspea, 'bordado_gaspea', BORDADOS_GASPEA],
    [order.bordadoTaloneira, 'bordado_taloneira', BORDADOS_TALONEIRA],
  ];
  bordadoPairs.forEach(([bStr, cat, fallback]) => {
    if (bStr) bStr.split(', ').filter(Boolean).forEach(b => {
      const p = findDetailPrice(b, cat, fallback);
      if (p) priceItems.push([b, p]);
    });
  });
  if (order.nomeBordadoDesc || order.personalizacaoNome) priceItems.push(['Nome Bordado', NOME_BORDADO_PRECO]);
  if (order.laserCano) priceItems.push(['Laser Cano', LASER_CANO_PRECO]);
  if (order.corGlitterCano) priceItems.push(['Glitter/Tecido Cano', GLITTER_CANO_PRECO]);
  if (order.laserGaspea) priceItems.push(['Laser Gáspea', LASER_GASPEA_PRECO]);
  if (order.corGlitterGaspea) priceItems.push(['Glitter/Tecido Gáspea', GLITTER_GASPEA_PRECO]);
  if (order.pintura === 'Sim') priceItems.push(['Pintura', PINTURA_PRECO]);
  if (order.estampa === 'Sim') priceItems.push(['Estampa', ESTAMPA_PRECO]);
  const areaP = AREA_METAL.find(a => a.label === order.metais)?.preco;
  if (areaP) priceItems.push(['Área Metal: ' + order.metais, areaP]);
  if (order.strassQtd) priceItems.push([`Strass (${order.strassQtd} un.)`, order.strassQtd * STRASS_PRECO]);
  if (order.cruzMetalQtd) priceItems.push([`Cruz metal (${order.cruzMetalQtd} un.)`, order.cruzMetalQtd * CRUZ_METAL_PRECO]);
  if (order.bridaoMetalQtd) priceItems.push([`Bridão metal (${order.bridaoMetalQtd} un.)`, order.bridaoMetalQtd * BRIDAO_METAL_PRECO]);
  const detP: any = order.extraDetalhes || {};
  if (detP.cavaloMetal && detP.cavaloMetalQtd) priceItems.push([`Cavalo metal (${detP.cavaloMetalQtd} un.)`, detP.cavaloMetalQtd * CAVALO_METAL_PRECO]);
  if (order.trisce === 'Sim') priceItems.push(['Tricê', TRICE_PRECO]);
  if (order.tiras === 'Sim') priceItems.push(['Tiras', TIRAS_PRECO]);
  if (detP.franja) priceItems.push(['Franja', FRANJA_PRECO]);
  if (detP.corrente) priceItems.push(['Corrente', CORRENTE_PRECO]);
  const soladoP = SOLADO.find(s => s.label === order.solado)?.preco;
  if (soladoP) priceItems.push(['Solado: ' + order.solado, soladoP]);
  const corSolaP = COR_SOLA.find(c => c.label === order.corSola)?.preco;
  if (corSolaP) priceItems.push(['Cor Sola: ' + order.corSola, corSolaP]);
  const corViraP = COR_VIRA.find(c => c.label === order.corVira)?.preco;
  if (corViraP) priceItems.push(['Cor Vira: ' + order.corVira, corViraP]);
  if (order.costuraAtras === 'Sim') priceItems.push(['Costura Atrás', COSTURA_ATRAS_PRECO]);
  const carimboP = CARIMBO.find(c => c.label === order.carimbo)?.preco;
  if (carimboP) priceItems.push([order.carimbo!, carimboP]);
  if (order.adicionalValor && order.adicionalValor > 0) priceItems.push(['Adicional: ' + (order.adicionalDesc || ''), order.adicionalValor]);
  const totalCalc = priceItems.reduce((s, [, v]) => s + v, 0);

  // Compute extras/belt total for header consistency
  const computeExtraTotal = (): number => {
    if (!order.tipoExtra) return 0;
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
      case 'bota_pronta_entrega': t += order.preco; break;
    }
    return t;
  };
  const extraTotalCalc = computeExtraTotal();
  const displayTotal = order.tipoExtra ? (extraTotalCalc || order.preco * order.quantidade) : (totalCalc || order.preco * order.quantidade);

  const alteracoes = order.alteracoes || [];

  const fotoUrlAtual = (order.fotos || []).find(f => isHttpUrl(f)) ?? null;
  const showFotoPanel = fotoOpen && !!fotoUrlAtual;

  return (
    <div className={`container mx-auto px-4 py-8 ${showFotoPanel ? 'max-w-6xl' : 'max-w-3xl'} transition-[max-width] duration-300`}>
      <div className={showFotoPanel ? 'grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-2">
            {isAdmin && order && (
              <label className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-3 py-1.5">
                <Checkbox
                  checked={isSelected(order.id)}
                  onCheckedChange={() => toggle(order.id)}
                />
                Selecionar
              </label>
            )}
            <Button variant="outline" size="sm" onClick={() => { setShowScanner(!showScanner); setTimeout(() => scanInputRef.current?.focus(), 100); }}>
              <ScanBarcode size={16} /> Buscar Pedido
            </Button>
          </div>
        </div>

        {/* Bulk selection bar */}
        {isAdmin && count > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold">
              <CheckSquare size={16} className="inline mr-1" />
              {count} pedido{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={bulkStatus} onValueChange={(v) => { setBulkStatus(v); if (v !== 'Cancelado') setBulkCancelReason(''); }}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Novo progresso..." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {bulkStatus === 'Cancelado' && (
                <Input
                  value={bulkCancelReason}
                  onChange={(e) => setBulkCancelReason(e.target.value)}
                  placeholder="Motivo do cancelamento *"
                  className="h-8 text-xs w-56"
                />
              )}
              <Button
                size="sm"
                disabled={!bulkStatus || (bulkStatus === 'Cancelado' && !bulkCancelReason.trim())}
                onClick={async () => {
                  if (!bulkStatus) return;
                  if (bulkStatus === 'Cancelado' && !bulkCancelReason.trim()) {
                    toast.error('Informe o motivo do cancelamento.');
                    return;
                  }
                  const ids = Array.from(selectedIds);
                  const { fetchOrdersByIds } = await import('@/hooks/useOrders');
                  const fetchedOrders = await fetchOrdersByIds(ids);
                  let updated = 0;
                  const observacao = bulkStatus === 'Cancelado' ? bulkCancelReason.trim() : undefined;
                  for (const oid of ids) {
                    const o = fetchedOrders.find(x => x.id === oid);
                    if (!o) continue;
                    const dataHoje = formatBrasiliaDate();
                    const horaAgora = formatBrasiliaTime();
                    const descricao = bulkStatus === 'Cancelado'
                      ? `Cancelado: ${bulkCancelReason.trim()}`
                      : `Movido para ${bulkStatus}`;
                    const newHist: any = { local: bulkStatus, data: dataHoje, hora: horaAgora, descricao };
                    if (observacao) newHist.observacao = observacao;
                    await updateOrder(oid, {
                      status: bulkStatus,
                      historico: [...(o.historico || []), newHist],
                    });
                    updated++;
                  }
                  toast.success(`${updated} pedido${updated > 1 ? 's' : ''} atualizado${updated > 1 ? 's' : ''} para "${bulkStatus}"`);
                  clear();
                  setBulkStatus('');
                  setBulkCancelReason('');
                }}
              >
                Mudar progresso
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { clear(); setBulkStatus(''); setBulkCancelReason(''); }}>
                Limpar
              </Button>
            </div>
          </div>
        )}
        {showScanner && (
          <div className="mb-4 relative">
            <input
              ref={scanInputRef}
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScanSubmit(); }}
              disabled={scanning}
              placeholder={scanning ? 'Buscando pedido...' : 'Digite o nº do pedido ou escaneie...'}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              autoFocus
            />
            {scanning && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
            )}
          </div>
        )}

        <div className="bg-card rounded-xl p-6 md:p-8 western-shadow">
          {/* Header: order number + vendedor (admin only) + value */}
          {(() => {
            const fotosValidas = (order.fotos || []).filter(f => isHttpUrl(f));
            const temFoto = fotosValidas.length > 0;
            return (
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold">{order.numero}</h1>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      const base = order.tipoExtra === 'cinto'
                        ? `/pedido/${order.id}/editar-cinto`
                        : order.tipoExtra
                          ? `/pedido/${order.id}/editar-extra`
                          : `/pedido/${order.id}/editar`;
                      navigate(showFotoPanel ? `${base}?foto=1` : base, { replace: true });
                    }}>
                      <Pencil size={16} />
                    </Button>
                  )}
                  {isAdmin && <span className="text-sm text-muted-foreground">— {order.vendedor}</span>}
                  {temFoto && (
                    <button
                      type="button"
                      onClick={() => setFotoOpen(true)}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-semibold"
                    >
                      <ImageIcon className="h-4 w-4" />
                      {fotosValidas.length > 1 ? `Ver fotos (${fotosValidas.length})` : 'Ver foto'}
                    </button>
                  )}
                </div>
                <span className="text-2xl font-bold text-primary">{formatCurrency(displayTotal)}</span>
              </div>
            );
          })()}
          <p className="text-sm text-muted-foreground mb-1">
            {formatDateBR(order.dataCriacao)} — {order.horaCriacao || ''}
          </p>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-primary" />
            <span className="text-sm font-semibold">
              {daysLeft > 0 ? `${daysLeft} dias úteis restantes` : 'Prazo atingido ✓'}
            </span>
            <span className="text-xs text-muted-foreground">
              (prazo: {totalBizDays} dias úteis)
            </span>
          </div>


          {/* Production History + Change History side by side */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Histórico de Produção */}
            <div>
              <h2 className="text-lg font-display font-bold mb-3">Histórico de Produção</h2>
              <div className="space-y-3">
                {order.historico.map((h, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                      {i < order.historico.length - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-semibold">{h.local}</p>
                      <p className="text-xs text-muted-foreground">{formatDateBR(h.data)} às {h.hora || '—'} — {h.descricao}</p>
                      {h.observacao && <p className="text-xs text-primary italic mt-0.5">Observação: {h.observacao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico de Alterações */}
            <div>
              <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                <History size={18} /> Histórico de Alterações
              </h2>
              {alteracoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {alteracoes.map((a, i) => (
                    <div key={i} className="border-b border-border/30 pb-2">
                      <p className="text-xs text-muted-foreground">{formatDateBR(a.data)} às {a.hora}</p>
                      <p className="text-sm">{a.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Impressão */}
          <div className="mb-8">
            <h2 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
              <Printer size={18} /> Histórico de Impressão
            </h2>
            {(!order.impressoes || order.impressoes.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhuma impressão registrada.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {[...order.impressoes].reverse().map((p, i) => (
                  <div key={i} className="border-b border-border/30 pb-2 flex flex-wrap items-baseline gap-x-2">
                    <p className="text-xs text-muted-foreground">{formatDateBR(p.data)} às {p.hora}</p>
                    <p className="text-sm font-semibold">
                      {p.tipo}
                      {p.total_pedidos > 1 && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({p.total_pedidos} pedidos no lote)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">— {p.usuario}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes */}
          <h2 className="text-lg font-display font-bold mb-3">
            {order.tipoExtra ? `Detalhes — ${EXTRA_PRODUCT_NAME_MAP[order.tipoExtra] || order.tipoExtra}` : 'Detalhes da Bota'}
          </h2>
          {order.tipoExtra && order.extraDetalhes ? (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
              {order.numeroPedidoBota && (
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Nº do Pedido</span>
                  <span className="text-sm font-semibold text-right">{order.numeroPedidoBota}</span>
                </div>
              )}
              {/* Multi-bota list */}
              {order.tipoExtra === 'bota_pronta_entrega' && Array.isArray((order.extraDetalhes as any)?.botas) ? (
                <>
                   {((order.extraDetalhes as any).botas as any[]).map((b: any, idx: number) => (
                    <div key={idx} className="col-span-full border border-border rounded-lg p-3 space-y-1">
                      <p className="text-sm font-semibold">Bota {idx + 1}</p>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Descrição</span>
                        <span className="text-sm font-semibold text-right max-w-[60%]">{b.descricaoProduto}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Valor</span>
                        <span className="text-sm font-semibold">R$ {parseFloat(b.valorManual || '0').toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Quantidade</span>
                        <span className="text-sm font-semibold">{b.quantidade || 1}</span>
                      </div>
                      {/* Embedded extras */}
                      {Array.isArray(b.extras) && b.extras.length > 0 && (
                        <div className="mt-2 space-y-1 ml-3 border-l-2 border-border pl-3">
                          <p className="text-xs font-semibold text-muted-foreground">Extras</p>
                          {b.extras.map((ex: any, eIdx: number) => {
                            const LABELS: Record<string, string> = { tiras_laterais: 'Tiras Laterais', carimbo_fogo: 'Carimbo a Fogo', kit_faca: 'Kit Faca', kit_canivete: 'Kit Canivete', adicionar_metais: 'Adicionar Metais' };
                            return (
                              <div key={eIdx} className="text-xs space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="font-semibold">{LABELS[ex.tipo] || ex.tipo}</span>
                                  <span className="font-semibold">R$ {(ex.preco || 0).toFixed(2).replace('.', ',')}</span>
                                </div>
                                {ex.dados && Object.entries(ex.dados).filter(([, v]) => v && v !== 'Não' && (!Array.isArray(v) || (v as any[]).length > 0)).map(([k, v]) => (
                                  <div key={k} className="flex justify-between text-muted-foreground">
                                    <span>{EXTRA_DETAIL_LABELS[k] || k}</span>
                                    <span>{Array.isArray(v) ? (v as any[]).join(', ') : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                Object.entries(order.extraDetalhes)
                  .filter(([key, val]) => !EXTRA_INTERNAL_KEYS.has(key) && !isExtraValueEmpty(val) && key !== 'botas')
                  .map(([key, val]) => {
                    const label = EXTRA_DETAIL_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                    return (
                      <div key={key} className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-semibold text-right max-w-[60%]">{displayVal}</span>
                      </div>
                    );
                  })
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          )}

          {order.observacao && (
            <div className="bg-muted rounded-lg p-3 mb-6">
              <p className="text-sm font-semibold mb-1">Observação:</p>
              <p className="text-sm text-muted-foreground">{order.observacao}</p>
            </div>
          )}

          {/* Fotos */}
          {order.fotos && order.fotos.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-display font-bold mb-3">Foto de Referência</h2>
              <div className="space-y-2">
                {order.fotos.map((f, i) => (
                  f.startsWith('http') ? (
                    <a key={i} href={f} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all block">
                      {f} ↗
                    </a>
                  ) : (
                    <img key={i} src={f} alt={`Ref ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-border" />
                  )
                ))}
              </div>
            </div>
          )}

          {/* Composição do Pedido */}
          <h2 className="text-lg font-display font-bold mb-3">Composição do Pedido</h2>
          <div className="border border-border rounded-lg p-4 mb-2">
            {order.tipoExtra ? (
              <>
                {(() => {
                  const extraPriceItems: [string, number][] = [];
                  const det = order.extraDetalhes || {};
                  switch (order.tipoExtra) {
                    case 'cinto': {
                      // Belt price composition
                      const sizeItem = BELT_SIZES.find((s: any) => det.tamanhoCinto?.startsWith(s.label));
                      if (sizeItem) extraPriceItems.push([`Tamanho: ${sizeItem.label}`, sizeItem.preco]);
                      if (det.bordadoP === 'Tem') extraPriceItems.push(['Bordado P', BORDADO_P_PRECO]);
                      if (det.nomeBordado === 'Tem') extraPriceItems.push(['Nome Bordado', NOME_BORDADO_CINTO_PRECO]);
                      if (det.carimbo) {
                        const car = BELT_CARIMBO.find((c: any) => c.label === det.carimbo);
                        if (car) extraPriceItems.push([det.carimbo, car.preco]);
                      }
                      break;
                    }
                    case 'tiras_laterais':
                      extraPriceItems.push(['Tiras Laterais', 15]);
                      break;
                    case 'desmanchar': {
                      extraPriceItems.push(['Valor base (Desmanchar)', 65]);
                      if (det.qualSola === 'Preta borracha') extraPriceItems.push(['Sola preta borracha', 25]);
                      else if (det.qualSola === 'De cor borracha') extraPriceItems.push(['Sola de cor borracha', 40]);
                      else if (det.qualSola === 'De couro') extraPriceItems.push(['Sola de couro', 60]);
                      if (det.trocaGaspea === 'Sim') extraPriceItems.push(['Troca de gáspea/taloneira', 35]);
                      break;
                    }
                    case 'kit_canivete':
                      extraPriceItems.push(['Kit Canivete', 30]);
                      if (det.vaiCanivete === 'Sim') extraPriceItems.push(['Canivete incluso', 30]);
                      break;
                    case 'kit_faca':
                      extraPriceItems.push(['Kit Faca', 35]);
                      if (det.vaiCanivete === 'Sim') extraPriceItems.push(['Faca inclusa', 35]);
                      break;
                    case 'carimbo_fogo': {
                      const qty = parseInt(det.qtdCarimbos) || 1;
                      extraPriceItems.push([`Carimbo a Fogo (${qty}x)`, qty >= 4 ? 40 : 20]);
                      break;
                    }
                    case 'revitalizador': {
                      const qty = parseInt(det.quantidade) || 1;
                      extraPriceItems.push([`Revitalizador (${qty}x)`, 10 * qty]);
                      break;
                    }
                    case 'kit_revitalizador': {
                      const qty = parseInt(det.quantidade) || 1;
                      extraPriceItems.push([`Kit 2 Revitalizador (${qty}x)`, 26 * qty]);
                      break;
                    }
                    case 'gravata_country':
                      extraPriceItems.push(['Gravata Country', 30]);
                      break;
                    case 'adicionar_metais': {
                      const sel = (det.metaisSelecionados as string[]) || [];
                      if (sel.includes('Bola grande')) {
                        const qty = parseInt(det.qtdBolaGrande) || 1;
                        extraPriceItems.push([`Bola grande (${qty}x R$0,60)`, 0.60 * qty]);
                      }
                      if (sel.includes('Strass')) {
                        const qty = parseInt(det.qtdStrass) || 1;
                        extraPriceItems.push([`Strass (${qty}x R$0,60)`, 0.60 * qty]);
                      }
                      break;
                    }
                    case 'chaveiro_carimbo':
                      extraPriceItems.push(['Chaveiro c/ Carimbo a Fogo', 50]);
                      break;
                    case 'bainha_cartao':
                      extraPriceItems.push(['Bainha de Cartão', 15]);
                      break;
                    case 'regata':
                      extraPriceItems.push(['Regata', 50]);
                      break;
                    case 'bota_pronta_entrega': {
                      if (Array.isArray(det.botas)) {
                        (det.botas as any[]).forEach((b: any, idx: number) => {
                          const val = parseFloat(b.valorManual) || 0;
                          extraPriceItems.push([`Bota ${idx + 1}: ${b.descricaoProduto || ''}`, val]);
                          if (Array.isArray(b.extras)) {
                            const LABELS: Record<string, string> = { tiras_laterais: 'Tiras Laterais', carimbo_fogo: 'Carimbo a Fogo', kit_faca: 'Kit Faca', kit_canivete: 'Kit Canivete', adicionar_metais: 'Adicionar Metais' };
                            b.extras.forEach((ex: any) => {
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
                              extraPriceItems.push([`  ↳ ${LABELS[ex.tipo] || ex.tipo}${detail}`, ex.preco || 0]);
                            });
                          }
                        });
                      } else {
                        extraPriceItems.push(['Bota Pronta Entrega', order.preco]);
                      }
                      break;
                    }
                  }
                  const extraTotal = extraPriceItems.reduce((s, [, v]) => s + v, 0);
                  return (
                    <>
                      {extraPriceItems.map(([label, value], i) => (
                        <div key={i} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                          <span className="text-sm">{label}</span>
                          <span className="text-sm font-semibold">{formatCurrency(value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 mt-2 border-t border-border font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(extraTotal || order.preco * order.quantidade)}</span>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {priceItems.map(([label, value], i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-border/30 last:border-0">
                    <span className="text-sm">{label}</span>
                    <span className="text-sm font-semibold">{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-2 border-t border-border font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalCalc || order.preco * order.quantidade)}</span>
                </div>
              </>
            )}
            {/* Desconto display */}
            {order.desconto && order.desconto > 0 && (
              <>
                <div className="flex justify-between pt-1 text-destructive">
                  <span className="text-sm font-semibold">Desconto</span>
                  <span className="text-sm font-semibold">- {formatCurrency(order.desconto)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-lg border-t border-border mt-1">
                  <span>Total com desconto</span>
                  <span className="text-primary">{formatCurrency((totalCalc || order.preco * order.quantidade) - order.desconto)}</span>
                </div>
                {order.descontoJustificativa && (
                  <p className="text-xs text-muted-foreground mt-1 italic">Justificativa: {order.descontoJustificativa}</p>
                )}
              </>
            )}
          </div>

          {/* Discount input — Juliana ADM only */}
          {role === 'admin_master' && (
            <div className="border border-border rounded-lg p-4 mt-4">
              <h3 className="text-sm font-bold mb-3">Aplicar Desconto</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Desconto (R$)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={descontoInput}
                    onChange={e => setDescontoInput(e.target.value)}
                  />
                </div>
                {Number(descontoInput) > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Justificativa do desconto *</label>
                    <Textarea
                      placeholder="Motivo do desconto..."
                      value={justificativaInput}
                      onChange={e => setJustificativaInput(e.target.value)}
                    />
                  </div>
                )}
                <Button
                  onClick={() => {
                    const val = Number(descontoInput);
                    if (!val || val <= 0) { toast.error('Informe um valor de desconto válido.'); return; }
                    if (!justificativaInput.trim()) { toast.error('A justificativa é obrigatória.'); return; }
                    const dataHoje = formatBrasiliaDate();
                    const horaAgora = formatBrasiliaTime();
                    const newAlteracao = {
                      data: dataHoje,
                      hora: horaAgora,
                      descricao: `Desconto aplicado: ${formatCurrency(val)} | Justificativa: ${justificativaInput.trim()} | Por: Juliana ADM`,
                    };
                    updateOrder(order.id, {
                      desconto: (order.desconto || 0) + val,
                      descontoJustificativa: justificativaInput.trim(),
                      alteracoes: [...(order.alteracoes || []), newAlteracao],
                    });
                    setDescontoInput('');
                    setJustificativaInput('');
                    toast.success('Desconto aplicado com sucesso!');
                  }}
                  disabled={!descontoInput || Number(descontoInput) <= 0}
                  className="w-full"
                >
                  Aplicar Desconto
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
        {showFotoPanel && (
          <FotoPedidoSidePanel url={fotoUrlAtual} onClose={() => setFotoOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
