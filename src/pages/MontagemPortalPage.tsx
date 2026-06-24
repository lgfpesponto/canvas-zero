import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchOrderByScan } from '@/hooks/useOrders';
import { JustificativaDialog } from '@/components/JustificativaDialog';
import { generateBaixaMontagemPDF, type BaixaMontagemItem } from '@/lib/pdfGenerators';
import { getValorMontagem } from '@/lib/montagemValores';
import { ScanBarcode, LogOut, FileText, Loader2, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo-7estrivos.png';

interface ScannedItem {
  id: string;
  numero: string;
  modelo: string;
  quantidade: number;
  valorUnit: number;
  erroMontagem: boolean;
  statusAnterior: string;
  dataBaixa: string; // DD/MM/YYYY
}

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

function todayBR(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const MontagemPortalPage = () => {
  const { isLoggedIn, role, user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<ScannedItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannerOn, setScannerOn] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanQueueRef = useRef<string[]>([]);
  const scanProcessingRef = useRef(false);

  const [pendingRemove, setPendingRemove] = useState<ScannedItem | null>(null);
  const [confirmNova, setConfirmNova] = useState(false);

  const refocus = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scanInputRef.current;
      if (el && document.activeElement !== el) el.focus();
    });
  }, []);

  useEffect(() => {
    if (scannerOn) setTimeout(() => scanInputRef.current?.focus(), 50);
  }, [scannerOn]);

  const processScan = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    try {
      const match = await fetchOrderByScan(trimmed);
      if (!match) {
        playBeep(false);
        toast.error(`"${trimmed}" — pedido não encontrado`);
        return;
      }
      if (items.some(i => i.id === match.id)) {
        playBeep(false);
        toast.info(`${match.numero} já está na lista`);
        return;
      }
      if (match.status !== 'Montagem' && match.status !== 'Montagem Ailton') {
        playBeep(false);
        toast.error(`${match.numero} está em "${match.status}" — só dá baixa de Montagem ou Montagem Ailton`);
        return;
      }
      const { data, error } = await supabase.rpc('montagem_baixar_pedido' as any, { _order_id: match.id } as any);
      if (error) {
        playBeep(false);
        toast.error(`${match.numero}: ${error.message}`);
        return;
      }
      const res = data as any;
      const erro = !!res?.erro_montagem;
      const modelo = String(res?.modelo || match.modelo || '-');
      const qtd = Math.max(1, Number(res?.quantidade ?? match.quantidade ?? 1));
      const valor = erro ? 0 : getValorMontagem(modelo);
      const novo: ScannedItem = {
        id: match.id,
        numero: match.numero,
        modelo,
        quantidade: qtd,
        valorUnit: valor,
        erroMontagem: erro,
        statusAnterior: String(res?.status_anterior || match.status),
        dataBaixa: todayBR(),
      };
      setItems(prev => [...prev, novo]);
      playBeep(true);
      toast.success(`${match.numero} → Baixa Montagem${erro ? ' (ERRO — não cobra)' : ''}`);
    } catch (err: any) {
      playBeep(false);
      toast.error(err?.message || 'Erro ao processar');
    }
  }, [items]);

  const handleScan = useCallback(async (raw: string) => {
    setScanValue('');
    refocus();
    if (!raw.trim()) return;
    if (scanProcessingRef.current) {
      scanQueueRef.current.push(raw);
      return;
    }
    scanProcessingRef.current = true;
    setScanning(true);
    try {
      await processScan(raw);
      while (scanQueueRef.current.length > 0) {
        const next = scanQueueRef.current.shift();
        if (next) await processScan(next);
      }
    } finally {
      scanProcessingRef.current = false;
      setScanning(false);
    }
  }, [processScan, refocus]);

  const confirmarRemover = async (motivo: string) => {
    const it = pendingRemove;
    if (!it) return;
    setPendingRemove(null);
    const destino = it.statusAnterior === 'Montagem Ailton' ? 'Montagem Ailton' : 'Montagem';
    const hist = {
      data: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
      hora: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
      local: destino,
      descricao: 'Removido da lista de baixa montagem (devolvido manualmente)',
      usuario: user?.nomeCompleto || 'Montagem',
      justificativa: motivo,
    };
    // Carrega histórico atual
    const { data: cur, error: e1 } = await supabase.from('orders').select('historico').eq('id', it.id).maybeSingle();
    if (e1) { toast.error(e1.message); return; }
    const novoHist = Array.isArray((cur as any)?.historico) ? [...(cur as any).historico, hist] : [hist];
    const { error: e2 } = await supabase.from('orders').update({ status: destino, historico: novoHist }).eq('id', it.id);
    if (e2) { toast.error(e2.message); return; }
    setItems(prev => prev.filter(p => p.id !== it.id));
    toast.success(`${it.numero} devolvido para ${destino}`);
  };

  const imprimir = () => {
    if (items.length === 0) { toast.info('Nada para imprimir.'); return; }
    const pdfItems: BaixaMontagemItem[] = items.map(it => ({
      numero: it.numero,
      modelo: it.modelo,
      dataBaixa: it.dataBaixa,
      quantidade: it.quantidade,
      valorUnit: it.valorUnit,
      erroMontagem: it.erroMontagem,
    }));
    generateBaixaMontagemPDF(pdfItems, user?.nomeCompleto || 'Montagem');
  };

  const novaBaixa = () => {
    setItems([]);
    setConfirmNova(false);
    setScannerOn(false);
    toast.info('Lista zerada. Os pedidos seguem em Baixa Montagem no sistema.');
  };

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role !== 'montagem') return <Navigate to="/" replace />;

  // Totais da lista
  const totals: Record<number, { qtd: number; valor: number }> = { 19: { qtd: 0, valor: 0 }, 21: { qtd: 0, valor: 0 }, 23: { qtd: 0, valor: 0 } };
  let erroQtd = 0;
  let totalGeral = 0;
  items.forEach(it => {
    const q = it.quantidade;
    if (it.erroMontagem) { erroQtd += q; return; }
    const v = it.valorUnit;
    if (v === 19 || v === 21 || v === 23) {
      totals[v].qtd += q;
      totals[v].valor += v * q;
    }
    totalGeral += v * q;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="7ESTRIVOS" className="h-10 w-10 object-contain bg-white rounded p-1" />
            <div>
              <div className="font-bold text-lg leading-tight">Portal Montagem</div>
              <div className="text-xs opacity-90">{user?.nomeCompleto}</div>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded bg-primary-foreground/10 hover:bg-primary-foreground/20 text-sm font-semibold">
            <LogOut size={16} /> SAIR
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner */}
          <section className="bg-card rounded-2xl border-2 border-border shadow-md p-5 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ScanBarcode size={20} /> Scanner de Baixa Montagem
            </h2>
            {!scannerOn ? (
              <button
                onClick={() => setScannerOn(true)}
                className="w-full flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-8 shadow transition"
              >
                <ScanBarcode size={32} />
                <span className="text-xl font-bold">COMEÇAR BAIXA</span>
                <span className="text-xs opacity-90">Abre o leitor de código de barras</span>
              </button>
            ) : (
              <>
                <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-3">
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Leia o código de barras do pedido (em Montagem ou Montagem Ailton)
                  </label>
                  <input
                    ref={scanInputRef}
                    value={scanValue}
                    onChange={e => setScanValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScan(scanValue);
                      }
                    }}
                    onBlur={refocus}
                    placeholder="Escaneie ou digite o número do pedido + Enter"
                    autoFocus
                    className="w-full bg-white rounded px-3 py-3 text-lg font-mono font-bold border-2 border-emerald-400 focus:border-emerald-600 outline-none"
                  />
                  {scanning && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                      <Loader2 className="animate-spin" size={14} /> Processando...
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setScannerOn(false)}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 py-4 shadow transition font-bold"
                >
                  <CheckCircle2 size={20} /> FINALIZAR BAIXA
                </button>
              </>
            )}
          </section>

          {/* Lista */}
          <section className="bg-card rounded-2xl border-2 border-border shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Pedidos baixados</h2>
              <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pedido baixado ainda.</p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                {items.map((it, i) => (
                  <div key={it.id} className="py-2 flex items-center gap-2 text-sm">
                    <span className="w-6 text-right text-muted-foreground font-mono">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold font-mono">#{it.numero} <span className="ml-2 text-xs font-normal text-muted-foreground">qtd {it.quantidade}</span></div>
                      <div className="text-xs text-muted-foreground truncate">{it.modelo || '-'}</div>
                    </div>
                    <div className="text-right text-xs">
                      {it.erroMontagem ? (
                        <span className="font-bold text-destructive">ERRO MONTAGEM</span>
                      ) : (
                        <span className="font-mono font-bold">R$ {(it.valorUnit * it.quantidade).toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setPendingRemove(it)}
                      title="Devolver para Montagem"
                      className="ml-1 p-1 rounded hover:bg-destructive/10 text-destructive"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Totais */}
            {items.length > 0 && (
              <div className="mt-2 border-t border-border pt-2 text-xs font-mono space-y-0.5">
                <div className="flex justify-between"><span>{totals[19].qtd} × R$ 19,00</span><span>R$ {totals[19].valor.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between"><span>{totals[21].qtd} × R$ 21,00</span><span>R$ {totals[21].valor.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between"><span>{totals[23].qtd} × R$ 23,00</span><span>R$ {totals[23].valor.toFixed(2).replace('.', ',')}</span></div>
                {erroQtd > 0 && <div className="flex justify-between text-destructive"><span>{erroQtd} × ERRO MONTAGEM</span><span>não cobrado</span></div>}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-border mt-1"><span>TOTAL</span><span>R$ {totalGeral.toFixed(2).replace('.', ',')}</span></div>
              </div>
            )}
          </section>
        </div>

        {/* Ações */}
        <section className="bg-card rounded-2xl border-2 border-border shadow-md p-4 flex flex-col md:flex-row gap-3">
          <button
            onClick={imprimir}
            disabled={items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-foreground rounded-xl px-6 py-3 font-bold disabled:opacity-40"
          >
            <FileText size={18} /> IMPRIMIR RELATÓRIO (2 VIAS)
          </button>
          <button
            onClick={() => setConfirmNova(true)}
            disabled={items.length === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl px-6 py-3 font-bold disabled:opacity-40"
          >
            <RotateCcw size={18} /> NOVA BAIXA (zerar lista)
          </button>
        </section>
      </main>

      <JustificativaDialog
        open={!!pendingRemove}
        title="Devolver pedido para Montagem"
        description={pendingRemove ? `O pedido #${pendingRemove.numero} será removido da lista e voltará para "${pendingRemove.statusAnterior}". Justifique:` : ''}
        onConfirm={confirmarRemover}
        onCancel={() => setPendingRemove(null)}
      />

      {confirmNova && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full space-y-4 border-2 border-border">
            <h3 className="font-bold text-lg">Zerar lista?</h3>
            <p className="text-sm text-muted-foreground">
              A lista local será limpa, mas os pedidos continuam em <strong>Baixa Montagem</strong> no sistema.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmNova(false)} className="px-4 py-2 rounded bg-muted text-foreground font-bold text-sm">Cancelar</button>
              <button onClick={novaBaixa} className="px-4 py-2 rounded bg-destructive text-destructive-foreground font-bold text-sm">Zerar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MontagemPortalPage;
