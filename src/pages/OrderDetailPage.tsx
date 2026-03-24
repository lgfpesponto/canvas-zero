import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, businessDaysRemaining, formatBrasiliaDate, formatBrasiliaTime, orderBarcodeValue, matchOrderBarcode, PRODUCTION_STATUSES, EXTRAS_STATUSES, BELT_STATUSES } from '@/contexts/AuthContext';
import { useSelectedOrders } from '@/hooks/useSelectedOrders';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Clock, History, Pencil, ScanBarcode, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  MODELOS, ACESSORIOS, BORDADOS, COURO_PRECOS, SOLADO, COR_SOLA, COR_VIRA,
  CARIMBO, AREA_METAL, DESENVOLVIMENTO,
  SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO, PINTURA_PRECO,
  TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, STRASS_PRECO, CRUZ_METAL_PRECO,
  BRIDAO_METAL_PRECO, LASER_CANO_PRECO, LASER_GASPEA_PRECO, GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO,
  VIRA_HIDDEN,
} from '@/lib/orderFieldsConfig';
import { EXTRA_PRODUCT_NAME_MAP, EXTRA_DETAIL_LABELS, EXTRA_INTERNAL_KEYS, isExtraValueEmpty, BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO } from '@/lib/extrasConfig';

const OrderDetailPage = () => {
  const { id } = useParams();
  const { orders, isAdmin, user, updateOrder, isFernanda, allOrders } = useAuth();
  const { toggle, isSelected, count, clear, selectedIds } = useSelectedOrders();
  const navigate = useNavigate();
  const order = orders.find(o => o.id === id);

  const [descontoInput, setDescontoInput] = useState('');
  const [justificativaInput, setJustificativaInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScanSubmit = useCallback(() => {
    if (!scanValue.trim()) return;
    const sourceOrders = isAdmin ? allOrders : orders;
    const match = sourceOrders.find(o => matchOrderBarcode(scanValue.trim(), o));
    if (match) {
      setScanValue('');
      setShowScanner(false);
      navigate('/pedido/' + match.id);
    } else {
      setScanValue('');
    }
  }, [scanValue, isAdmin, allOrders, orders, navigate]);

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
  const details: [string, string][] = [
    ['Modelo', order.modelo],
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
    ['Tricê', order.trisce === 'Sim' ? (order.triceDesc || 'Sim') : ''],
    ['Tiras', order.tiras === 'Sim' ? (order.tirasDesc || 'Sim') : ''],
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
  [order.couroCano, order.couroGaspea, order.couroTaloneira].forEach(t => {
    if (t && COURO_PRECOS[t]) priceItems.push(['Couro: ' + t, COURO_PRECOS[t]]);
  });
  const desenvP = DESENVOLVIMENTO.find(d => d.label === order.desenvolvimento)?.preco;
  if (desenvP) priceItems.push(['Desenvolvimento: ' + order.desenvolvimento, desenvP]);
  [order.bordadoCano, order.bordadoGaspea, order.bordadoTaloneira].forEach(bStr => {
    if (bStr) bStr.split(', ').filter(Boolean).forEach(b => {
      const p = BORDADOS.find(x => x.label === b)?.preco;
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
  if (order.trisce === 'Sim') priceItems.push(['Tricê', TRICE_PRECO]);
  if (order.tiras === 'Sim') priceItems.push(['Tiras', TIRAS_PRECO]);
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

  const alteracoes = order.alteracoes || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
              <ScanBarcode size={16} /> Escanear
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
            <div className="flex items-center gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Novo progresso..." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!bulkStatus}
                onClick={async () => {
                  if (!bulkStatus) return;
                  const ids = Array.from(selectedIds);
                  const sourceOrders = isAdmin ? allOrders : orders;
                  let updated = 0;
                  for (const oid of ids) {
                    const o = sourceOrders.find(x => x.id === oid);
                    if (!o) continue;
                    const dataHoje = formatBrasiliaDate();
                    const horaAgora = formatBrasiliaTime();
                    const newHist = { local: bulkStatus, data: dataHoje, hora: horaAgora, descricao: `Movido para ${bulkStatus}` };
                    await updateOrder(oid, {
                      status: bulkStatus,
                      historico: [...(o.historico || []), newHist],
                    });
                    updated++;
                  }
                  toast.success(`${updated} pedido${updated > 1 ? 's' : ''} atualizado${updated > 1 ? 's' : ''} para "${bulkStatus}"`);
                  clear();
                  setBulkStatus('');
                }}
              >
                Mudar progresso
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { clear(); setBulkStatus(''); }}>
                Limpar
              </Button>
            </div>
          </div>
        )}
        {showScanner && (
          <div className="mb-4">
            <input
              ref={scanInputRef}
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScanSubmit(); }}
              placeholder="Escaneie o código de barras..."
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
          </div>
        )}

        <div className="bg-card rounded-xl p-6 md:p-8 western-shadow">
          {/* Header: order number + vendedor (admin only) + value */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">{order.numero}</h1>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/pedido/${order.id}/editar`)}>
                  <Pencil size={16} />
                </Button>
              )}
              {isAdmin && <span className="text-sm text-muted-foreground">— {order.vendedor}</span>}
            </div>
            <span className="text-2xl font-bold text-primary">{formatCurrency(totalCalc)}</span>
          </div>
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
              {Object.entries(order.extraDetalhes)
                .filter(([key, val]) => !EXTRA_INTERNAL_KEYS.has(key) && !isExtraValueEmpty(val))
                .map(([key, val]) => {
                  const label = EXTRA_DETAIL_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                  const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                  return (
                    <div key={key} className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-right max-w-[60%]">{displayVal}</span>
                    </div>
                  );
                })}
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
                      if (sel.includes('Bola grande')) extraPriceItems.push(['Bola grande', 15]);
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
                    case 'bota_pronta_entrega':
                      extraPriceItems.push(['Bota Pronta Entrega', order.preco]);
                      break;
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
          {isAdmin && user?.nomeUsuario?.toLowerCase() === '7estrivos' && !isFernanda && (
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
    </div>
  );
};

export default OrderDetailPage;
