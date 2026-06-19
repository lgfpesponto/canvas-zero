/**
 * Página pública (sem login) de acompanhamento de pedido — /rastreio/:id
 *
 * Usa a RPC `get_public_tracking` (security definer) que devolve o pedido
 * SEM dados sensíveis (preço, cliente, comissão, conferido etc.).
 * UUID na URL funciona como token de acesso — não enumerável.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getOrderDeadlineInfo, getTotalBizDays } from '@/lib/orderDeadline';
import { dbRowToOrder, PRODUCTION_STATUSES } from '@/lib/order-logic';
import QRCode from 'qrcode';
import { Clock, Loader2 } from 'lucide-react';

// Etapas-chave agrupadas para o stepper público.
const PROGRESS_STEPS: { label: string; matches: (s: string) => boolean }[] = [
  { label: 'Em aberto', matches: s => s === 'Em aberto' || s === 'Impresso' || s.startsWith('Aguardando') || s === 'Emprestado' },
  { label: 'Corte/Laser', matches: s => s === 'Corte' || s === 'Baixa Corte' || s.startsWith('Entrada Laser') || s.startsWith('Baixa Laser') || s === 'Estampa' },
  { label: 'Bordado', matches: s => s === 'Sem bordado' || s.startsWith('Bordado ') || s.includes('Bordado 7Estrivos') },
  { label: 'Pesponto', matches: s => s.startsWith('Pesponto') || s === 'Pespontando' },
  { label: 'Montagem', matches: s => s.startsWith('Montagem') },
  { label: 'Revisão', matches: s => s === 'Revisão' },
  { label: 'Expedição', matches: s => s === 'Expedição' || s === 'Baixa Estoque' || s === 'Baixa Site (Despachado)' },
  { label: 'Entregue', matches: s => s === 'Entregue' || s === 'Conferido' || s === 'Cobrado' || s === 'Pago' },
];

function fmtDateBR(d?: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

const FIELD_LABELS: Array<[string, string]> = [
  ['modelo', 'Modelo'],
  ['tamanho', 'Tamanho'],
  ['genero', 'Gênero'],
  ['formatoBico', 'Formato do bico'],
  ['solado', 'Solado'],
  ['corSola', 'Cor da sola'],
  ['corVira', 'Cor da vira'],
  ['couroCano', 'Couro do cano'],
  ['corCouroCano', 'Cor do couro do cano'],
  ['couroGaspea', 'Couro da gáspea'],
  ['corCouroGaspea', 'Cor do couro da gáspea'],
  ['couroTaloneira', 'Couro da taloneira'],
  ['corCouroTaloneira', 'Cor do couro da taloneira'],
  ['bordadoCano', 'Bordado do cano'],
  ['corBordadoCano', 'Cor bordado cano'],
  ['bordadoGaspea', 'Bordado da gáspea'],
  ['corBordadoGaspea', 'Cor bordado gáspea'],
  ['bordadoTaloneira', 'Bordado da taloneira'],
  ['corBordadoTaloneira', 'Cor bordado taloneira'],
  ['personalizacaoNome', 'Personalização nome'],
  ['nomeBordadoDesc', 'Nome bordado'],
  ['corLinha', 'Cor da linha'],
  ['corBorrachinha', 'Cor da borrachinha'],
  ['laserCano', 'Laser cano'],
  ['laserGaspea', 'Laser gáspea'],
  ['laserTaloneira', 'Laser taloneira'],
  ['estampa', 'Estampa'],
  ['pintura', 'Pintura'],
  ['carimbo', 'Carimbo'],
  ['metais', 'Metais'],
  ['acessorios', 'Acessórios'],
  ['costuraAtras', 'Costura atrás'],
  ['observacao', 'Observação'],
];

export default function PublicTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Acompanhe a produção do seu pedido — 7 Estrivos';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const { data, error: err } = await supabase.rpc('get_public_tracking' as any, { _id: id });
      if (cancelled) return;
      if (err) { setError(err.message); setLoading(false); return; }
      if (!data) { setError('Pedido não encontrado.'); setLoading(false); return; }
      try {
        const ord = dbRowToOrder(data as any);
        (ord as any).vendedor = (data as any).vendedor || (data as any).vendedor_nome || '';
        setOrder(ord);
        // QR code: aponta para a foto do pedido (Drive), igual ao QR dos PDFs.
        const fotos: string[] = Array.isArray((ord as any).fotos) ? (ord as any).fotos : [];
        const fotoLink = fotos.find(f => typeof f === 'string' && f.startsWith('http'));
        if (fotoLink) {
          const url = await QRCode.toDataURL(fotoLink, { width: 320, margin: 1 });
          if (!cancelled) setQrUrl(url);
        }
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar pedido.');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const deadline = useMemo(() => order ? getOrderDeadlineInfo(order) : null, [order]);
  const totalBizDays = useMemo(() => order ? getTotalBizDays(order) : 0, [order]);

  const currentStepIdx = useMemo(() => {
    if (!order?.status) return -1;
    return PROGRESS_STEPS.findIndex(s => s.matches(order.status));
  }, [order?.status]);

  const historicoDesc = useMemo(() => {
    if (!order?.historico) return [];
    return [...order.historico].reverse();
  }, [order?.historico]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Carregando pedido…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold mb-2">Pedido não encontrado</h1>
          <p className="text-muted-foreground">{error || 'Verifique o link recebido.'}</p>
        </div>
      </div>
    );
  }

  // Lista de campos preenchidos (não vazios)
  const camposPreenchidos = FIELD_LABELS
    .map(([k, label]) => [label, (order as any)[k]] as [string, any])
    .filter(([, v]) => v != null && String(v).trim() !== '' && String(v).trim() !== 'Não');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full orange-gradient flex items-center justify-center text-primary-foreground font-display font-bold">
            7E
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-bold leading-tight">
              acompanhe a produção do seu pedido
            </h1>
            <p className="text-xs text-muted-foreground">7 Estrivos</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Cabeçalho do pedido */}
        <section className="bg-card rounded-xl p-5 western-shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="font-display font-bold text-lg">Pedido {order.numero}</div>
            <div className="text-sm text-muted-foreground">Vendedor: <span className="font-semibold text-foreground">{order.vendedor || '—'}</span></div>
          </div>
          {deadline && !deadline.isNoDeadline && (
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-primary" />
              <span className="text-muted-foreground">Prazo {totalBizDays} dias úteis</span>
              <span className="text-muted-foreground">·</span>
              <span className={deadline.isOverdue ? 'text-destructive font-bold' : deadline.isFinal ? 'text-primary font-bold' : 'font-semibold'}>
                {deadline.isFinal ? 'Concluído ✓' : deadline.isOverdue ? `+${deadline.daysOverdue} dias úteis em atraso` : `${deadline.daysLeft} dias úteis restantes`}
              </span>
            </div>
          )}
          {order.status === 'Cancelado' && (
            <div className="mt-2 text-sm text-destructive font-semibold">Pedido cancelado</div>
          )}
        </section>

        {/* Stepper de progresso */}
        <section className="bg-card rounded-xl p-5 western-shadow">
          <h2 className="font-display font-bold mb-4">Etapas de produção</h2>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
            {PROGRESS_STEPS.map((step, i) => {
              const done = currentStepIdx > -1 && i < currentStepIdx;
              const active = i === currentStepIdx;
              return (
                <div key={step.label} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center text-center flex-1 min-w-[64px]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                      active ? 'bg-primary border-primary text-primary-foreground' :
                      done ? 'bg-primary/80 border-primary/80 text-primary-foreground' :
                      'bg-background border-border text-muted-foreground'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 leading-tight ${active ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${done ? 'bg-primary/80' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm mt-3">
            Etapa atual: <span className="font-bold text-primary">{order.status}</span>
          </p>
        </section>

        {/* Histórico de produção */}
        <section className="bg-card rounded-xl p-5 western-shadow">
          <h2 className="font-display font-bold mb-3">Histórico de produção</h2>
          {historicoDesc.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros ainda.</p>
          ) : (
            <ol className="space-y-3">
              {historicoDesc.map((h: any, i: number) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    {i < historicoDesc.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-sm">{h.local || '—'}</span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDateBR(h.data)} {h.hora || ''}
                      </span>
                    </div>
                    {h.descricao && (
                      <p className="text-sm text-muted-foreground mt-0.5">{h.descricao}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Detalhes da bota + QR */}
        <section className="bg-card rounded-xl p-5 western-shadow">
          <h2 className="font-display font-bold mb-3">Detalhes do pedido</h2>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
            <dl className="space-y-1.5">
              {camposPreenchidos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem detalhes registrados.</p>
              ) : camposPreenchidos.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-1 border-b border-border/40 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-right">{String(value)}</dd>
                </div>
              ))}
            </dl>
            {qrUrl && (
              <div className="flex flex-col items-center md:items-start">
                <img src={qrUrl} alt="QR Code do pedido" className="w-44 h-44 md:w-52 md:h-52" />
                <p className="text-[11px] text-muted-foreground mt-1">QR Code do pedido</p>
              </div>
            )}
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground py-4">
          7 Estrivos · acompanhe seu pedido em tempo real
        </footer>
      </main>
    </div>
  );
}
