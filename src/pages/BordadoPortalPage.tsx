import { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import { fetchOrderByScan } from '@/hooks/useOrders';
import type { Order } from '@/contexts/AuthContext';
import { ScanBarcode, LogOut, FileText, Loader2, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo-7estrivos.png';
import { generateBordadoBaixaResumoPDF } from '@/lib/pdfGenerators';

const BORDADO_STATUSES = ['Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos'] as const;

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
  const [showScanner, setShowScanner] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDate, setPdfDate] = useState(() => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (showScanner) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showScanner]);

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'bordado') return <Navigate to="/" replace />;

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = scanValue.trim();
    if (!v || scanning) return;
    setScanning(true);
    try {
      const found = await fetchOrderByScan(v);
      if (!found) { playBeep(false); toast.error('Pedido não encontrado'); }
      else if (!BORDADO_STATUSES.includes(found.status as any)) { playBeep(false); toast.error(`Pedido em "${found.status}" — fora do bordado`); }
      else {
        playBeep(true);
        setScanValue('');
        setShowScanner(false);
        navigate('/pedido/' + found.id);
      }
    } catch (err: any) {
      playBeep(false);
      toast.error(err?.message || 'Erro ao buscar');
    } finally { setScanning(false); }
  };

  const gerarPDF = async () => {
    setPdfLoading(true);
    try {
      const { data: ids, error } = await supabase.rpc('find_orders_by_status_change' as any, {
        _status: ['Baixa Bordado 7Estrivos'],
        _de: pdfDate,
        _ate: pdfDate,
      });
      if (error) throw error;
      const idList = (ids || []).map((r: any) => r.id ?? r);
      if (idList.length === 0) { toast.info('Nenhum pedido baixado nessa data.'); return; }
      const { data: rows, error: fErr } = await supabase.from('orders').select('*').in('id', idList);
      if (fErr) throw fErr;
      const list = (rows || []).map(dbRowToOrder) as Order[];
      generateBordadoBaixaResumoPDF(list, pdfDate, user?.nomeCompleto || 'Bordado');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err?.message || err));
    } finally { setPdfLoading(false); }
  };

  const entrada = orders.filter(o => o.status === 'Entrada Bordado 7Estrivos');
  const baixa = orders.filter(o => o.status === 'Baixa Bordado 7Estrivos');

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

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-xl px-6 py-6 text-lg font-bold shadow hover:opacity-90 transition"
          >
            <ScanBarcode size={28} /> ESCANEAR / BUSCAR PEDIDO
          </button>
          <div className="flex items-stretch gap-2 bg-card rounded-xl p-3 shadow border">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">PDF resumo (Baixa do dia)</label>
              <input
                type="date"
                value={pdfDate}
                onChange={e => setPdfDate(e.target.value)}
                className="w-full h-10 px-2 rounded border-2 border-primary/30 bg-background text-sm font-semibold"
              />
            </div>
            <button
              onClick={gerarPDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-4 rounded bg-secondary text-secondary-foreground font-bold text-sm hover:bg-secondary/80 disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
              PDF
            </button>
          </div>
        </div>

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
              orders={entrada}
              onClick={(o) => navigate('/pedido/' + o.id)}
            />
            <BordadoColumn
              title="Baixa Bordado 7Estrivos"
              color="bg-emerald-100 border-emerald-300 text-emerald-900"
              orders={baixa}
              onClick={(o) => navigate('/pedido/' + o.id)}
            />
          </div>
        )}
      </main>

      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowScanner(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><ScanBarcode /> Escanear pedido</h3>
              <button onClick={() => setShowScanner(false)} className="p-1 hover:bg-muted rounded"><X size={20} /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Escaneie o código de barras ou digite o número do pedido.</p>
            <form onSubmit={handleScan}>
              <input
                ref={inputRef}
                value={scanValue}
                onChange={e => setScanValue(e.target.value)}
                placeholder="Código ou número..."
                className="w-full h-12 px-3 rounded-lg border-2 border-primary text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button type="submit" disabled={scanning || !scanValue.trim()} className="mt-3 w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold disabled:opacity-50">
                {scanning ? <Loader2 className="animate-spin mx-auto" /> : 'Buscar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const BordadoColumn = ({ title, color, orders, onClick }: { title: string; color: string; orders: Order[]; onClick: (o: Order) => void }) => (
  <div className={`rounded-xl border-2 p-3 ${color}`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-sm">{title}</h3>
      <span className="font-bold text-lg">{orders.length}</span>
    </div>
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {orders.length === 0 && <div className="text-xs opacity-70 text-center py-4">Nenhum pedido</div>}
      {orders.map(o => (
        <button
          key={o.id}
          onClick={() => onClick(o)}
          className="w-full text-left bg-white/80 hover:bg-white rounded-lg p-3 border border-current/20 transition"
        >
          <div className="font-bold text-sm">{o.numero}</div>
          <div className="text-xs opacity-80 line-clamp-1">{o.modelo} • {o.tamanho}</div>
          <div className="text-xs opacity-70 line-clamp-1">{o.vendedor}</div>
        </button>
      ))}
    </div>
  </div>
);

export default BordadoPortalPage;
