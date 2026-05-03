import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ScanBarcode, CheckSquare, ArrowRight, RotateCcw, LogOut, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchOrderByScan } from '@/hooks/useOrders';
import { dbRowToOrder } from '@/lib/order-logic';
import { useAuth, type Order } from '@/contexts/AuthContext';
import { useOrderNeighbors } from '@/hooks/useOrderNeighbors';
import { useSelectedOrders } from '@/hooks/useSelectedOrders';
import { buildBootFichaCategories } from '@/lib/orderFichaCategories';
import { isHttpUrl } from '@/lib/driveUrl';
import { FotoPedidoSidePanel } from '@/components/FotoPedidoSidePanel';
import { JustificativaDialog } from '@/components/JustificativaDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logo from '@/assets/logo-7estrivos.png';

const BORDADO_STATUSES = ['Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos'] as const;
type BordadoStatus = typeof BORDADO_STATUSES[number];

export function BordadoOrderView({ order: initialOrder, onBack }: { order: Order; onBack: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toggle, isSelected, count, clear, selectedIds } = useSelectedOrders();
  const { prevId, nextId, index: neighborIndex, total: neighborTotal } = useOrderNeighbors(initialOrder.id);

  const [order, setOrder] = useState<Order>(initialOrder);
  const [acting, setActing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [fotoOpen, setFotoOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<'' | BordadoStatus>('');
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [bulkJustifyOpen, setBulkJustifyOpen] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setOrder(initialOrder); }, [initialOrder]);

  // Atalhos ← →
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'ArrowLeft' && prevId) { e.preventDefault(); navigate('/pedido/' + prevId); }
      else if (e.key === 'ArrowRight' && nextId) { e.preventDefault(); navigate('/pedido/' + nextId); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prevId, nextId, navigate]);

  const handleScanSubmit = useCallback(async () => {
    const v = scanValue.trim();
    if (!v || scanning) return;
    setScanning(true);
    try {
      const found = await fetchOrderByScan(v);
      if (!found) toast.error('Pedido não encontrado.');
      else if (!BORDADO_STATUSES.includes(found.status as any)) toast.error(`Pedido em "${found.status}" — fora do bordado`);
      else { setScanValue(''); setShowScanner(false); navigate('/pedido/' + found.id); }
    } finally { setScanning(false); }
  }, [scanValue, scanning, navigate]);

  const formatDateBR = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };

  // RPC
  const callRpc = async (id: string, novoStatus: BordadoStatus, justificativa?: string) => {
    const { error } = await supabase.rpc('bordado_baixar_pedido' as any, {
      _order_id: id,
      _novo_status: novoStatus,
      _justificativa: justificativa ?? null,
    } as any);
    return error;
  };

  const baixar = async (novoStatus: BordadoStatus, justificativa?: string) => {
    setActing(true);
    const err = await callRpc(order.id, novoStatus, justificativa);
    if (err) toast.error(err.message);
    else {
      toast.success(`Pedido ${order.numero} → ${novoStatus}`);
      setOrder({ ...order, status: novoStatus });
    }
    setActing(false);
  };

  const aplicarBulk = async (justificativa?: string) => {
    if (!bulkStatus) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setActing(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      const err = await callRpc(id, bulkStatus, justificativa);
      if (err) fail++; else ok++;
    }
    if (ok) toast.success(`${ok} pedido(s) → ${bulkStatus}`);
    if (fail) toast.error(`${fail} pedido(s) falharam (regra de transição ou permissão)`);
    clear();
    setBulkStatus('');
    setActing(false);
    // Recarregar pedido atual se foi afetado
    if (selectedIds.has(order.id)) {
      const { data } = await supabase.from('orders').select('*').eq('id', order.id).maybeSingle();
      if (data) setOrder(dbRowToOrder(data) as Order);
    }
  };

  const fichaCats = buildBootFichaCategories(order, { showCliente: true });
  const fotosValidas = (order.fotos || []).filter(f => isHttpUrl(f));
  const temFoto = fotosValidas.length > 0;
  const fotoUrlAtual = fotosValidas[0] ?? null;
  const showFotoPanel = fotoOpen && !!fotoUrlAtual;
  const dataHora = `${formatDateBR(order.dataCriacao)} — ${order.horaCriacao || ''}`.trim();
  const tamText = `${order.tamanho || ''}${order.genero ? ' ' + order.genero.substring(0, 3).toLowerCase() + '.' : ''}`;
  const dateStrShort = `${order.dataCriacao.slice(8, 10)}/${order.dataCriacao.slice(5, 7)} ${order.horaCriacao || ''}`.trim();

  // Para botão de baixa — exigir justificativa apenas no retrocesso Baixa→Entrada
  const handleEntradaClick = () => {
    if (order.status === 'Baixa Bordado 7Estrivos') setJustifyOpen(true);
    else baixar('Entrada Bordado 7Estrivos');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="7ESTRIVOS" className="h-10 w-10 object-contain bg-white rounded p-1" />
            <div>
              <div className="font-bold text-lg leading-tight">Portal Bordado</div>
              <div className="text-xs opacity-90">{user?.nomeCompleto}</div>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded bg-primary-foreground/10 hover:bg-primary-foreground/20 text-sm font-semibold">
            <LogOut size={16} /> SAIR
          </button>
        </div>
      </header>

      <div className={`container mx-auto px-4 py-6 ${showFotoPanel ? 'max-w-6xl' : 'max-w-3xl'} transition-[max-width] duration-300`}>
        <div className={showFotoPanel ? 'grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}>
          <div className="min-w-0">
            {/* Top bar — voltar / paginação / selecionar / buscar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="outline" size="sm" disabled={!prevId} onClick={() => prevId && navigate('/pedido/' + prevId)} title="Pedido anterior (←)">
                    <ChevronLeft size={16} />
                  </Button>
                  {neighborTotal > 0 && neighborIndex >= 0 && (
                    <span className="hidden sm:inline text-xs text-muted-foreground px-1 tabular-nums">
                      {neighborIndex + 1} / {neighborTotal}
                    </span>
                  )}
                  <Button variant="outline" size="sm" disabled={!nextId} onClick={() => nextId && navigate('/pedido/' + nextId)} title="Próximo pedido (→)">
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer border border-border rounded-md px-3 py-1.5">
                  <Checkbox checked={isSelected(order.id)} onCheckedChange={() => toggle(order.id)} />
                  Selecionar
                </label>
                <Button variant="outline" size="sm" onClick={() => { setShowScanner(v => !v); setTimeout(() => scanInputRef.current?.focus(), 100); }}>
                  <ScanBarcode size={16} /> Buscar Pedido
                </Button>
              </div>
            </div>

            {/* Bulk bar */}
            {count > 0 && (
              <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold">
                  <CheckSquare size={16} className="inline mr-1" />
                  {count} pedido{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as BordadoStatus)}>
                    <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Novo progresso..." /></SelectTrigger>
                    <SelectContent>
                      {BORDADO_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!bulkStatus || acting}
                    onClick={() => {
                      if (bulkStatus === 'Entrada Bordado 7Estrivos') setBulkJustifyOpen(true);
                      else aplicarBulk();
                    }}
                  >
                    Mudar progresso
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { clear(); setBulkStatus(''); }}>Limpar</Button>
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
                {scanning && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
              </div>
            )}

            <div className="space-y-6">
              {/* Cabeçalho do pedido */}
              <div className="bg-card rounded-xl p-6 md:p-8 western-shadow">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-3">
                  <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Número do pedido</span>
                    <span className="text-base font-display font-bold">{order.numero}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendedor</span>
                    <span className="text-sm font-semibold text-right">{order.vendedor}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data e hora</span>
                    <span className="text-sm font-semibold text-right">{dataHora}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-1 border-b border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Foto</span>
                    {temFoto ? (
                      <button type="button" onClick={() => setFotoOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-semibold">
                        <ImageIcon className="h-4 w-4" />
                        {fotosValidas.length > 1 ? `Ver fotos (${fotosValidas.length})` : 'Ver foto'}
                      </button>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status atual</span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">{order.status}</span>
                </div>

                {/* Botões de ação de bordado */}
                <div className="pt-4 mt-4 border-t border-border space-y-2">
                  {order.status === 'Entrada Bordado 7Estrivos' && (
                    <button
                      onClick={() => baixar('Baixa Bordado 7Estrivos')}
                      disabled={acting}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
                    >
                      <ArrowRight size={18} /> Marcar BAIXA Bordado
                    </button>
                  )}
                  {order.status === 'Baixa Bordado 7Estrivos' && (
                    <button
                      onClick={handleEntradaClick}
                      disabled={acting}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold disabled:opacity-50"
                    >
                      <RotateCcw size={18} /> Voltar para ENTRADA Bordado
                    </button>
                  )}
                </div>
              </div>

              {/* Detalhes da Bota — sem lápis, sem preços */}
              <div className="bg-card rounded-xl p-6 md:p-8 western-shadow">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <h2 className="text-lg font-display font-bold">Detalhes da Bota</h2>
                </div>
                <div className="border border-border rounded-lg p-4 md:p-5 bg-background mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-display font-bold text-base mb-1">7ESTRIVOS</div>
                      <div><span className="font-bold">Código: </span>{order.numero}</div>
                      <div><span className="font-bold">Vendedor: </span>{order.vendedor}</div>
                      <div><span className="font-bold">Data: </span>{dateStrShort}</div>
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div><span className="font-bold">Tamanho: </span>{tamText}{order.sobMedida ? ` | sob medida${order.sobMedidaDesc ? ': ' + order.sobMedidaDesc : ''}` : ''}</div>
                      <div><span className="font-bold">Modelo: </span>{(order.modelo || '').toLowerCase()}</div>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold uppercase tracking-wide text-[10px] text-muted-foreground mb-1">Foto de referência</p>
                      {!temFoto ? (
                        <p className="text-muted-foreground italic text-[11px]">Sem foto</p>
                      ) : (
                        <button type="button" onClick={() => setFotoOpen(true)} className="text-primary hover:underline font-semibold">
                          ver foto ↗
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border mb-3" />

                  <div className="columns-1 sm:columns-2 md:columns-3 gap-5">
                    {fichaCats.map(cat => (
                      <div key={cat.title} className="break-inside-avoid mb-3">
                        <div className="bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide mb-1.5">{cat.title}</div>
                        <div className="px-1 space-y-0.5">
                          {cat.fields.map((f, i) => (
                            <div key={i} className="text-xs leading-snug">
                              {f.label && <span className="font-bold">{f.label} </span>}
                              <span>{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {order.observacao && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm font-semibold mb-1">Observação:</p>
                    <p className="text-sm text-muted-foreground">{order.observacao}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showFotoPanel && (
            <FotoPedidoSidePanel url={fotoUrlAtual} onClose={() => setFotoOpen(false)} />
          )}
        </div>
      </div>

      <JustificativaDialog
        open={justifyOpen}
        title="Justificativa para retroceder"
        description="Voltar de Baixa para Entrada Bordado é um retrocesso. Descreva o motivo — ficará registrado no histórico."
        onConfirm={async (motivo) => { setJustifyOpen(false); await baixar('Entrada Bordado 7Estrivos', motivo); }}
        onCancel={() => setJustifyOpen(false)}
      />
      <JustificativaDialog
        open={bulkJustifyOpen}
        title="Justificativa do retrocesso em massa"
        description="Pedidos em Baixa serão movidos de volta para Entrada Bordado. Descreva o motivo."
        onConfirm={async (motivo) => { setBulkJustifyOpen(false); await aplicarBulk(motivo); }}
        onCancel={() => setBulkJustifyOpen(false)}
      />
    </div>
  );
}
