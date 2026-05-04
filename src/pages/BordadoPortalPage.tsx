import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder, PRODUCTION_STATUSES } from '@/lib/order-logic';
import { fetchOrderByScan } from '@/hooks/useOrders';
import type { Order } from '@/contexts/AuthContext';
import { ScanBarcode, LogOut, FileText, Loader2, X, RefreshCw, CheckCircle2, ArrowDownToLine, ArrowUpToLine, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo-7estrivos.png';
import { generateBordadoBaixaResumoPDF } from '@/lib/pdfGenerators';

const BORDADO_STATUSES = ['Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos'] as const;
type ScannerMode = 'entrada' | 'baixa';

const playBeep = (ok: boolean) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1200 : 400;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.15 : 0.3));
  } catch {}
};

const BordadoPortalPage = () => {
  const { isLoggedIn, role, user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const todayStr = (() => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const [pdfDe, setPdfDe] = useState(todayStr);
  const [pdfAte, setPdfAte] = useState(todayStr);

  // Scanner modal (entrada ou baixa)
  const [scannerMode, setScannerMode] = useState<ScannerMode | null>(null);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [processados, setProcessados] = useState<{ id: string; numero: string }[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [showProcessadosList, setShowProcessadosList] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanQueueRef = useRef<string[]>([]);
  const scanProcessingRef = useRef(false);

  // Quick-baixa per card
  const [quickBaixaIds, setQuickBaixaIds] = useState<Set<string>>(new Set());

  // Per-column search
  const [searchEntrada, setSearchEntrada] = useState('');
  const [searchBaixa, setSearchBaixa] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', BORDADO_STATUSES as any)
      .order('data_criacao', { ascending: true })
      .order('hora_criacao', { ascending: true });
    if (error) toast.error('Erro ao carregar pedidos: ' + error.message);
    else setOrders((data || []).map(dbRowToOrder) as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && isLoggedIn && role === 'bordado') fetchOrders();
  }, [authLoading, isLoggedIn, role, fetchOrders]);

  const refocusScanInput = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scanInputRef.current;
      if (el && document.activeElement !== el) el.focus();
    });
  }, []);

  useEffect(() => {
    if (scannerMode) setTimeout(() => scanInputRef.current?.focus(), 50);
  }, [scannerMode]);

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'bordado') return <Navigate to="/" replace />;

  const aplicarStatus = async (orderId: string, novoStatus: string): Promise<{ ok: boolean; msg?: string }> => {
    const { error } = await supabase.rpc('bordado_baixar_pedido' as any, {
      _order_id: orderId,
      _novo_status: novoStatus,
      _justificativa: null,
    } as any);
    if (error) return { ok: false, msg: error.message };
    return { ok: true };
  };

  const processScan = useCallback(async (trimmed: string, mode: ScannerMode) => {
    try {
      const match = await fetchOrderByScan(trimmed);
      if (!match) {
        playBeep(false);
        toast.error(`"${trimmed}" — pedido não encontrado`);
        return;
      }
      if (mode === 'baixa') {
        if (match.status !== 'Entrada Bordado 7Estrivos') {
          playBeep(false);
          toast.error(`${match.numero} está em "${match.status}" — não está em Entrada Bordado`);
          return;
        }
      } else {
        if (match.status === 'Entrada Bordado 7Estrivos') {
          playBeep(false);
          toast.info(`${match.numero} já está em Entrada Bordado`);
          return;
        }
        if (match.status === 'Baixa Bordado 7Estrivos') {
          playBeep(false);
          toast.error(`${match.numero} já está em Baixa Bordado — voltar etapa exige justificativa no pedido`);
          return;
        }
        if (match.status === 'Cancelado') {
          playBeep(false);
          toast.error(`${match.numero} está cancelado`);
          return;
        }
      }
      const novoStatus = mode === 'baixa' ? 'Baixa Bordado 7Estrivos' : 'Entrada Bordado 7Estrivos';
      const r = await aplicarStatus(match.id, novoStatus);
      if (!r.ok) {
        playBeep(false);
        toast.error(`${match.numero}: ${r.msg}`);
        return;
      }
      playBeep(true);
      setLastScanned(match.numero);
      setProcessados(prev => prev.find(p => p.id === match.id) ? prev : [...prev, { id: match.id, numero: match.numero }]);
      setOrders(prev => {
        const existing = prev.find(o => o.id === match.id);
        if (existing) return prev.map(o => o.id === match.id ? { ...o, status: novoStatus } as Order : o);
        // For "entrada" mode, the order may not be in the local list yet
        if (mode === 'entrada') return [...prev, { ...match, status: novoStatus } as Order];
        return prev;
      });
    } catch (err: any) {
      playBeep(false);
      toast.error(err?.message || 'Erro ao processar scan');
    }
  }, []);

  const handleScan = useCallback(async (raw: string, mode: ScannerMode) => {
    const trimmed = raw.trim();
    setScanValue('');
    refocusScanInput();
    if (!trimmed) return;
    if (scanProcessingRef.current) {
      scanQueueRef.current.push(trimmed);
      return;
    }
    scanProcessingRef.current = true;
    setScanning(true);
    try {
      await processScan(trimmed, mode);
      while (scanQueueRef.current.length > 0) {
        const next = scanQueueRef.current.shift();
        if (next) await processScan(next, mode);
      }
    } finally {
      scanProcessingRef.current = false;
      setScanning(false);
    }
  }, [processScan, refocusScanInput]);

  const closeScanner = () => {
    setScannerMode(null);
    setScanValue('');
    setLastScanned(null);
    setProcessados([]);
    setShowProcessadosList(false);
    fetchOrders();
  };

  const removeProcessado = (id: string) => {
    setProcessados(prev => prev.filter(p => p.id !== id));
    refocusScanInput();
  };

  const gerarPDF = async () => {
    if (pdfDe > pdfAte) { toast.error('Data inicial maior que a final.'); return; }
    setPdfLoading(true);
    try {
      const { data: ids, error } = await supabase.rpc('find_orders_by_status_change' as any, {
        _status: ['Baixa Bordado 7Estrivos'],
        _de: pdfDe,
        _ate: pdfAte,
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
      generateBordadoBaixaResumoPDF(valid, pdfDe, pdfAte, user?.nomeCompleto || 'Bordado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.message || err));
    } finally { setPdfLoading(false); }
  };

  const handleQuickStatus = async (o: Order, novoStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (quickBaixaIds.has(o.id)) return;
    setQuickBaixaIds(prev => new Set(prev).add(o.id));
    const r = await aplicarStatus(o.id, novoStatus);
    if (r.ok) {
      toast.success(`Pedido ${o.numero} → ${novoStatus.replace(' 7Estrivos', '')}`);
      setOrders(prev => prev.map(p => p.id === o.id ? { ...p, status: novoStatus } as Order : p));
    } else {
      toast.error(r.msg || 'Falha ao mover pedido');
    }
    setQuickBaixaIds(prev => { const n = new Set(prev); n.delete(o.id); return n; });
  };
  const handleQuickBaixa = (o: Order, e: React.MouseEvent) => handleQuickStatus(o, 'Baixa Bordado 7Estrivos', e);
  const handleQuickEntrada = (o: Order, e: React.MouseEvent) => handleQuickStatus(o, 'Entrada Bordado 7Estrivos', e);

  const handleColumnSearch = async (
    raw: string,
    expectedStatus: typeof BORDADO_STATUSES[number],
    setSearch: (v: string) => void,
  ) => {
    const v = raw.trim();
    if (!v) return;
    try {
      const found = await fetchOrderByScan(v);
      if (!found) {
        toast.error('Pedido não encontrado');
        return;
      }
      if (found.status !== expectedStatus) {
        if (BORDADO_STATUSES.includes(found.status as any)) {
          toast.info(`${found.numero} está em "${found.status}"`);
        } else {
          toast.error('Pedido não está no bordado 7estrivos no momento');
          return;
        }
      }
      setSearch('');
      navigate('/pedido/' + found.id);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao buscar');
    }
  };

  const entrada = useMemo(() => {
    const list = orders.filter(o => o.status === 'Entrada Bordado 7Estrivos');
    if (!searchEntrada.trim()) return list;
    const q = searchEntrada.trim().toLowerCase();
    return list.filter(o => o.numero.toLowerCase().includes(q));
  }, [orders, searchEntrada]);

  const baixa = useMemo(() => {
    const list = orders.filter(o => o.status === 'Baixa Bordado 7Estrivos');
    if (!searchBaixa.trim()) return list;
    const q = searchBaixa.trim().toLowerCase();
    return list.filter(o => o.numero.toLowerCase().includes(q));
  }, [orders, searchBaixa]);

  const isBaixaMode = scannerMode === 'baixa';
  const accent = isBaixaMode ? 'emerald' : 'sky';

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

      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Cabeçalho de operações */}
        <section className="bg-card rounded-2xl border-2 border-border shadow-md p-4 md:p-5">
          <div className="grid md:grid-cols-5 gap-4">
            {/* Coluna esquerda: dois botões grandes */}
            <div className="md:col-span-3 flex flex-col gap-3">
              <button
                onClick={() => setScannerMode('entrada')}
                className="flex flex-col items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 py-5 shadow transition"
              >
                <div className="flex items-center gap-3">
                  <ScanBarcode size={26} />
                  <span className="text-lg md:text-xl font-bold">ESCANEAR PARA DAR ENTRADA</span>
                </div>
                <span className="text-xs opacity-90 font-semibold">→ Entrada Bordado 7Estrivos</span>
              </button>
              <button
                onClick={() => setScannerMode('baixa')}
                className="flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-5 shadow transition"
              >
                <div className="flex items-center gap-3">
                  <ScanBarcode size={26} />
                  <span className="text-lg md:text-xl font-bold">ESCANEAR PARA DAR BAIXA</span>
                </div>
                <span className="text-xs opacity-90 font-semibold">Entrada Bordado → Baixa Bordado</span>
              </button>
            </div>

            {/* Coluna direita: PDF resumo */}
            <div className="md:col-span-2 flex flex-col gap-2 bg-muted/40 rounded-xl p-3 border border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText size={16} /> Resumo de baixas
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">De</label>
                  <input
                    type="date"
                    value={pdfDe}
                    onChange={e => setPdfDe(e.target.value)}
                    className="w-full h-10 px-2 rounded border-2 border-primary/30 bg-background text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Até</label>
                  <input
                    type="date"
                    value={pdfAte}
                    onChange={e => setPdfAte(e.target.value)}
                    className="w-full h-10 px-2 rounded border-2 border-primary/30 bg-background text-sm font-semibold"
                  />
                </div>
              </div>
              <button
                onClick={gerarPDF}
                disabled={pdfLoading}
                className="mt-1 flex items-center justify-center gap-2 px-4 py-2 rounded bg-secondary text-secondary-foreground font-bold text-sm hover:bg-secondary/80 disabled:opacity-50"
              >
                {pdfLoading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                GERAR PDF
              </button>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl">Pedidos no bordado</h2>
          <button onClick={fetchOrders} className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <BordadoColumn
              title="Entrada Bordado 7Estrivos"
              color="bg-amber-100 border-amber-300 text-amber-900"
              inputBorder="border-amber-500"
              orders={entrada}
              onClick={(o) => navigate('/pedido/' + o.id)}
              search={searchEntrada}
              onSearchChange={setSearchEntrada}
              onSearchSubmit={(v) => handleColumnSearch(v, 'Entrada Bordado 7Estrivos', setSearchEntrada)}
              showQuickBaixa
              onQuickBaixa={handleQuickBaixa}
              quickBaixaIds={quickBaixaIds}
            />
            <BordadoColumn
              title="Baixa Bordado 7Estrivos"
              color="bg-emerald-100 border-emerald-300 text-emerald-900"
              inputBorder="border-emerald-500"
              orders={baixa}
              onClick={(o) => navigate('/pedido/' + o.id)}
              search={searchBaixa}
              onSearchChange={setSearchBaixa}
              onSearchSubmit={(v) => handleColumnSearch(v, 'Baixa Bordado 7Estrivos', setSearchBaixa)}
              showQuickEntrada
              onQuickEntrada={handleQuickEntrada}
              quickBaixaIds={quickBaixaIds}
            />
          </div>
        )}
      </main>

      {scannerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeScanner}>
          <div className={`bg-gray-900 text-white p-6 md:p-8 rounded-2xl shadow-2xl border-2 ${isBaixaMode ? 'border-emerald-500' : 'border-sky-500'} w-full max-w-lg`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ScanBarcode className={isBaixaMode ? 'text-emerald-400' : 'text-sky-400'} />
                {isBaixaMode ? 'Dar baixa por scan' : 'Dar entrada por scan'}
              </h3>
              <button onClick={closeScanner} className="p-1 hover:bg-gray-800 rounded"><X size={20} /></button>
            </div>

            <div className={`text-center mb-4 px-3 py-2 rounded-lg ${isBaixaMode ? 'bg-emerald-950/40 border-emerald-700' : 'bg-sky-950/40 border-sky-700'} border`}>
              <p className={`text-xs uppercase font-bold ${isBaixaMode ? 'text-emerald-300' : 'text-sky-300'}`}>Progresso aplicado automaticamente</p>
              <p className={`text-base font-bold ${isBaixaMode ? 'text-emerald-200' : 'text-sky-200'}`}>
                {isBaixaMode ? 'Entrada Bordado → Baixa Bordado 7Estrivos' : 'Qualquer status anterior → Entrada Bordado 7Estrivos'}
              </p>
            </div>

            {lastScanned && (
              <div className="mb-3 text-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Último pedido lido</p>
                <p className={`text-2xl font-bold ${isBaixaMode ? 'text-emerald-400' : 'text-sky-400'}`}>✅ {lastScanned}</p>
              </div>
            )}

            <div className="text-center mb-3">
              <p className="text-lg font-bold">
                {processados.length} pedido{processados.length !== 1 ? 's' : ''} {isBaixaMode ? 'baixado' : 'em entrada'}{processados.length !== 1 ? 's' : ''}
              </p>
              {processados.length > 0 && (
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setShowProcessadosList(v => !v); refocusScanInput(); }}
                  className={`text-xs underline mt-1 ${isBaixaMode ? 'text-emerald-300 hover:text-emerald-200' : 'text-sky-300 hover:text-sky-200'}`}
                >
                  {showProcessadosList ? 'Ocultar lista' : 'Visualizar pedidos'}
                </button>
              )}
            </div>

            {showProcessadosList && processados.length > 0 && (
              <div className="mb-4 max-h-40 overflow-y-auto space-y-1 bg-gray-800 rounded-lg p-3">
                {processados.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                    <span className={`font-bold ${isBaixaMode ? 'text-emerald-300' : 'text-sky-300'}`}>{b.numero}</span>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => removeProcessado(b.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Remover da lista (não desfaz a operação)"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleScan(scanValue, scannerMode); }}>
              <div className="flex items-center gap-2 mb-3">
                {scanning
                  ? <Loader2 size={20} className={`flex-shrink-0 animate-spin ${isBaixaMode ? 'text-emerald-400' : 'text-sky-400'}`} />
                  : <ScanBarcode size={20} className={`flex-shrink-0 ${isBaixaMode ? 'text-emerald-400' : 'text-sky-400'}`} />}
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanValue}
                  onChange={e => setScanValue(e.target.value)}
                  onBlur={() => requestAnimationFrame(() => {
                    const el = scanInputRef.current;
                    if (el && document.activeElement?.tagName !== 'INPUT') el.focus();
                  })}
                  placeholder={scanning ? 'Buscando... pode escanear o próximo' : 'Escaneie ou digite o nº do pedido'}
                  className={`flex-1 bg-gray-800 text-white rounded-lg px-3 py-3 text-base border border-gray-600 outline-none placeholder:text-gray-500 ${isBaixaMode ? 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' : 'focus:border-sky-500 focus:ring-1 focus:ring-sky-500'}`}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <p className="text-xs text-gray-400 text-center mb-3">
                Cada leitura aplica o progresso automaticamente. Use <span className="font-bold text-gray-200">Fechar</span> quando terminar.
              </p>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className={`flex-1 flex items-center justify-center gap-2 text-white py-3 rounded-lg font-bold ${isBaixaMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'}`}
                >
                  {isBaixaMode ? <ArrowDownToLine size={18} /> : <ArrowUpToLine size={18} />}
                  {isBaixaMode ? 'Dar baixa' : 'Dar entrada'}
                </button>
                <button
                  type="button"
                  onClick={closeScanner}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold"
                >
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface BordadoColumnProps {
  title: string;
  color: string;
  inputBorder: string;
  orders: Order[];
  onClick: (o: Order) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: (v: string) => void;
  showQuickBaixa?: boolean;
  onQuickBaixa?: (o: Order, e: React.MouseEvent) => void;
  quickBaixaIds?: Set<string>;
}

const BordadoColumn = ({
  title, color, inputBorder, orders, onClick, search, onSearchChange, onSearchSubmit,
  showQuickBaixa, onQuickBaixa, quickBaixaIds,
}: BordadoColumnProps) => (
  <div className={`rounded-xl border-2 p-3 ${color}`}>
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-bold text-sm">{title}</h3>
      <span className="font-bold text-lg">{orders.length}</span>
    </div>
    <form
      onSubmit={(e) => { e.preventDefault(); onSearchSubmit(search); }}
      className="mb-3 relative"
    >
      <ScanBarcode size={20} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70 pointer-events-none" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Digite o nº do pedido ou escaneie..."
        className={`w-full h-12 pl-10 pr-3 rounded-lg border-2 ${inputBorder} bg-white text-sm font-semibold text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-current/30`}
        autoComplete="off"
      />
    </form>
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {orders.length === 0 && <div className="text-xs opacity-70 text-center py-4">Nenhum pedido</div>}
      {orders.map(o => {
        const baixando = quickBaixaIds?.has(o.id);
        return (
          <div
            key={o.id}
            onClick={() => onClick(o)}
            className="w-full text-left bg-white/80 hover:bg-white rounded-lg p-3 border border-current/20 transition flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm">{o.numero}</div>
              <div className="text-xs opacity-80 line-clamp-1">{o.modelo} • {o.tamanho}</div>
              <div className="text-xs opacity-70 line-clamp-1">{o.vendedor}</div>
            </div>
            {showQuickBaixa && onQuickBaixa && (
              <button
                type="button"
                onClick={(e) => onQuickBaixa(o, e)}
                disabled={baixando}
                title="Mover para Baixa Bordado 7Estrivos"
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition"
              >
                {baixando ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default BordadoPortalPage;
