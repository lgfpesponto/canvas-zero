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
import { dbRowToOrder } from '@/lib/order-logic';
import { buildBootFichaCategories } from '@/lib/orderFichaCategories';
import { isHttpUrl, isDriveUrl, toDriveImageUrl, toDrivePreviewUrl } from '@/lib/driveUrl';
import { Clock, Loader2, ExternalLink } from 'lucide-react';
import logoAsset from '@/assets/logo-7estrivos.png.asset.json';

// Etapas-chave agrupadas para o stepper público.
const PROGRESS_STEPS: { label: string; matches: (s: string) => boolean }[] = [
  { label: 'Em aberto', matches: s => s === 'Em aberto' || s === 'Impresso' || s.startsWith('Aguardando') || s === 'Emprestado' },
  { label: 'Corte/Laser', matches: s => s === 'Corte' || s === 'Baixa Corte' || s.startsWith('Entrada Laser') || s.startsWith('Baixa Laser') || s === 'Estampa' },
  { label: 'Bordado', matches: s => s === 'Sem bordado' || s.startsWith('Bordado ') || s.includes('Bordado 7Estrivos') },
  { label: 'Pesponto', matches: s => s.startsWith('Pesponto') || s === 'Pespontando' },
  { label: 'Montagem', matches: s => s.startsWith('Montagem') },
  { label: 'Revisão', matches: s => s === 'Revisão' },
  { label: 'Expedição', matches: s => s === 'Expedição' || s === 'Baixa Estoque' || s === 'Baixa Site (Despachado)' },
  { label: 'Entregue ao vendedor', matches: s => s === 'Entregue' || s === 'Conferido' || s === 'Cobrado' || s === 'Pago' },
];

function fmtDateBR(d?: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function fmtDateTimeBR(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function PublicTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

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

  const fichaCategorias = useMemo(
    () => order ? buildBootFichaCategories(order, { showCliente: false }) : [],
    [order]
  );

  const fotoUrl = useMemo(() => {
    const fotos: string[] = Array.isArray(order?.fotos) ? order!.fotos : [];
    return fotos.find(f => typeof f === 'string' && isHttpUrl(f)) || null;
  }, [order]);

  const drive = !!fotoUrl && isDriveUrl(fotoUrl);
  const imgUrl = fotoUrl ? (drive ? toDriveImageUrl(fotoUrl) : fotoUrl) : null;
  const previewUrl = fotoUrl && drive ? toDrivePreviewUrl(fotoUrl) : null;
  const useIframe = drive && imgFailed;

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoAsset.url} alt="7 Estrivos" className="w-12 h-12 object-contain mix-blend-multiply shrink-0" />
          <h1 className="text-lg sm:text-xl font-display font-bold leading-tight">
            <span className="sm:hidden">Acompanhe a produção<br />do seu pedido</span>
            <span className="hidden sm:inline">Acompanhe a produção do seu pedido</span>
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
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
          <div className="text-sm mt-1">
            <span className="text-muted-foreground">Etapa atual: </span>
            <span className="font-bold text-primary">{order.status}</span>
          </div>
          {order.status === 'Cancelado' && (
            <div className="mt-2 text-sm text-destructive font-semibold">Pedido cancelado</div>
          )}
        </section>

        {/* Stepper de progresso */}
        <section className="bg-card rounded-xl p-5 western-shadow">
          <h2 className="font-display font-bold mb-4">Etapas de produção</h2>
          {/* Mobile: grid 4x2 */}
          <div className="grid grid-cols-4 gap-y-4 gap-x-2 sm:hidden">
            {PROGRESS_STEPS.map((step, i) => {
              const done = currentStepIdx > -1 && i < currentStepIdx;
              const active = i === currentStepIdx;
              return (
                <div key={step.label} className="flex flex-col items-center text-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    active ? 'bg-primary border-primary text-primary-foreground' :
                    done ? 'bg-primary/80 border-primary/80 text-primary-foreground' :
                    'bg-background border-border text-muted-foreground'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] mt-1.5 leading-tight break-words ${active ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Desktop: linha horizontal com conectores */}
          <div className="hidden sm:flex items-start justify-between gap-1">
            {PROGRESS_STEPS.map((step, i) => {
              const done = currentStepIdx > -1 && i < currentStepIdx;
              const active = i === currentStepIdx;
              return (
                <div key={step.label} className="flex items-start flex-1 min-w-0">
                  <div className="flex flex-col items-center text-center flex-1 min-w-[64px]">
                    <div className="h-6 flex items-center justify-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                        active ? 'bg-primary border-primary text-primary-foreground' :
                        done ? 'bg-primary/80 border-primary/80 text-primary-foreground' :
                        'bg-background border-border text-muted-foreground'
                      }`}>
                        {done ? '✓' : i + 1}
                      </div>
                    </div>
                    <span className={`text-[10px] mt-1 leading-tight ${active ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mt-3 ${done ? 'bg-primary/80' : 'bg-border'}`} />
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

        {/* Detalhes da Bota — mesmo formato da ficha interna */}
        <section className="bg-card rounded-xl p-5 western-shadow">
          <h2 className="font-display font-bold mb-3">Detalhes da Bota</h2>

          <div className="space-y-5">
            <div className="border border-border rounded-lg p-4">
              {/* Cabeçalho tipo ficha */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-border text-sm">
                <div>
                  <div className="font-display font-bold">7ESTRIVOS</div>
                  <div><span className="text-muted-foreground">Código:</span> <span className="font-semibold">{order.numero || '—'}</span></div>
                  <div><span className="text-muted-foreground">Vendedor:</span> <span className="font-semibold">{order.vendedor || '—'}</span></div>
                  <div><span className="text-muted-foreground">Data:</span> <span className="font-semibold">{fmtDateTimeBR(order.criadoEm || order.dataCriacao)}</span></div>
                </div>
                <div>
                  {order.tamanho && <div><span className="text-muted-foreground">Tamanho:</span> <span className="font-semibold">{order.tamanho}</span></div>}
                  {order.modelo && <div><span className="text-muted-foreground">Modelo:</span> <span className="font-semibold">{String(order.modelo).toLowerCase()}</span></div>}
                  {order.genero && <div><span className="text-muted-foreground">Gênero:</span> <span className="font-semibold">{order.genero}</span></div>}
                </div>
                <div>
                  {fotoUrl && (
                    <>
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Foto de Referência</div>
                      <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
                        view <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Categorias em grid (largura total) */}
              {fichaCategorias.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-4">Sem detalhes registrados.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {fichaCategorias.map(cat => (
                    <div key={cat.title} className="border border-border rounded-md p-3 bg-muted/20">
                      <div className="text-[11px] font-bold tracking-wider text-foreground border-b border-border pb-1 mb-2">
                        {cat.title}
                      </div>
                      <div className="space-y-1 text-sm">
                        {cat.fields.map((f, i) => (
                          <div key={i}>
                            {f.label && <span className="font-semibold">{f.label} </span>}
                            <span>{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Foto abaixo da ficha, em largura total */}
            <div className="border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[280px]">
              {!fotoUrl ? (
                <p className="text-xs text-muted-foreground p-4 text-center">Sem foto de referência.</p>
              ) : useIframe && previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[560px] border-0"
                  title="Foto do pedido"
                  allow="autoplay"
                />
              ) : imgUrl ? (
                <img
                  src={imgUrl}
                  alt="Foto do pedido"
                  className="w-full h-auto max-h-[640px] object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => { if (drive) setImgFailed(true); }}
                />
              ) : null}
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground py-4">
          7ESTRIVOS · acompanhe seu pedido em tempo real
        </footer>

      </main>
    </div>
  );
}
