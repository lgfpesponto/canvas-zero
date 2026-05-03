import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanBarcode, ArrowRight, CheckCircle2, X, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchOrderByScan } from '@/hooks/useOrders';
import { useAuth, orderBarcodeValue, type Order } from '@/contexts/AuthContext';
import logo from '@/assets/logo-7estrivos.png';

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

export function BordadoOrderView({ order: initialOrder, onBack }: { order: Order; onBack: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [acting, setActing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setOrder(initialOrder); }, [initialOrder]);
  useEffect(() => {
    if (showScanner) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showScanner]);

  const baixar = async (novoStatus: typeof BORDADO_STATUSES[number]) => {
    setActing(true);
    const { error } = await supabase.rpc('bordado_baixar_pedido' as any, {
      _order_id: order.id,
      _novo_status: novoStatus,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`Pedido ${order.numero} → ${novoStatus}`);
      setOrder({ ...order, status: novoStatus });
    }
    setActing(false);
  };

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = scanValue.trim();
    if (!v || scanning) return;
    setScanning(true);
    try {
      const found = await fetchOrderByScan(v);
      if (!found) { playBeep(false); toast.error('Pedido não encontrado'); }
      else if (!BORDADO_STATUSES.includes(found.status as any)) {
        playBeep(false);
        toast.error(`"${found.status}" — não está no bordado`);
      } else {
        playBeep(true);
        setShowScanner(false);
        setScanValue('');
        navigate('/pedido/' + found.id);
      }
    } finally { setScanning(false); }
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

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="flex items-center gap-1 text-primary font-semibold hover:underline">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:opacity-90"
          >
            <ScanBarcode size={18} /> Buscar pedido
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border p-6 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Pedido</div>
            <div className="text-3xl font-bold">{order.numero}</div>
            <div className="text-xs font-mono text-muted-foreground mt-1">{orderBarcodeValue(order.numero, order.id)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Modelo" value={order.modelo} />
            <Field label="Tamanho" value={order.tamanho} />
            <Field label="Vendedor" value={order.vendedor} />
            <Field label="Cliente" value={order.cliente} />
            <Field label="Cor Couro Cano" value={order.corCouroCano} />
            <Field label="Cor Couro Gáspea" value={order.corCouroGaspea} />
            <Field label="Bordado Cano" value={order.bordadoCano} />
            <Field label="Bordado Gáspea" value={order.bordadoGaspea} />
            <Field label="Cor Bordado Cano" value={order.corBordadoCano} />
            <Field label="Cor Bordado Gáspea" value={order.corBordadoGaspea} />
            <Field label="Cor Linha" value={order.corLinha} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Status atual</div>
            <span className="inline-block mt-1 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-sm">{order.status}</span>
          </div>

          {order.observacao && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Observação</div>
              <div className="text-sm whitespace-pre-wrap">{order.observacao}</div>
            </div>
          )}

          <div className="pt-3 border-t space-y-2">
            {order.status !== 'Entrada Bordado 7Estrivos' && (
              <button
                onClick={() => baixar('Entrada Bordado 7Estrivos')}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold disabled:opacity-50"
              >
                <ArrowRight size={18} /> Marcar ENTRADA Bordado
              </button>
            )}
            {order.status !== 'Baixa Bordado 7Estrivos' && (
              <button
                onClick={() => baixar('Baixa Bordado 7Estrivos')}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold disabled:opacity-50"
              >
                <CheckCircle2 size={18} /> Marcar BAIXA Bordado
              </button>
            )}
          </div>
        </div>
      </main>

      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowScanner(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><ScanBarcode /> Escanear pedido</h3>
              <button onClick={() => setShowScanner(false)} className="p-1 hover:bg-muted rounded"><X size={20} /></button>
            </div>
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
}

const Field = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    <div className="font-semibold">{value || '—'}</div>
  </div>
);
