import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, RefreshCw, ExternalLink, FileText, Package, Truck, ChevronDown, ChevronRight, Search, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type BagyPedido = {
  id: string;
  bagy_order_id: string;
  numero_bagy: string;
  status_bagy: string;
  cliente_nome: string | null;
  cliente_whats: string | null;
  cliente_email: string | null;
  cliente_doc: string | null;
  endereco: any;
  total: number | null;
  frete: number | null;
  pagamento: string | null;
  flag: string | null;
  erro: string | null;
  order_id_portal: string | null;
  created_at: string;
  payload: any;
  tracking_code?: string | null;
  tracking_url?: string | null;
};

type OrderSyncInfo = {
  bagy_last_sync_at: string | null;
  bagy_last_sync_error: string | null;
  bagy_last_sync_status: string | null;
  status: string | null;
};

type BagyItem = {
  id: string;
  pedido_id: string;
  sku: string | null;
  nome_produto: string | null;
  variacao_nome: string | null;
  tamanho: string | null;
  quantidade: number;
  preco_unit: number | null;
  foto_url: string | null;
  estoque_produto_id: string | null;
  template_id: string | null;
  status: string;
  order_id_portal: string | null;
};

const FLAG_BADGE: Record<string, { label: string; cls: string }> = {
  pedido_criado: { label: 'PEDIDO CRIADO', cls: 'bg-green-600 text-white' },
  aguardando_ficha: { label: 'GERAR FICHA', cls: 'bg-blue-600 text-white' },
  aguardando_mapeamento: { label: 'SEM MAPEAMENTO', cls: 'bg-yellow-500 text-black' },
  erro_comprar_estoque: { label: 'ERRO ESTOQUE', cls: 'bg-red-600 text-white' },
};

const ITEM_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pedido_criado: { label: 'PEDIDO CRIADO', cls: 'bg-green-600 text-white' },
  aguardando_ficha: { label: 'GERAR FICHA', cls: 'bg-blue-600 text-white' },
  sem_mapeamento: { label: 'SEM MAPEAMENTO', cls: 'bg-yellow-500 text-black' },
  sem_estoque: { label: 'SEM ESTOQUE', cls: 'bg-orange-500 text-white' },
  aguardando_aprovacao: { label: 'AGUARDANDO PAGAMENTO', cls: 'bg-gray-400 text-white' },
  pendente: { label: 'PENDENTE', cls: 'bg-gray-400 text-white' },
};

const STATUS_BAGY_LABEL: Record<string, string> = {
  new: 'Novo', pending: 'Pendente',
  paid: 'Pago', approved: 'Aprovado',
  separated: 'Separado', production: 'Em Produção',
  shipped: 'Despachado', delivered: 'Entregue',
  canceled: 'Cancelado', cancelled: 'Cancelado', refunded: 'Reembolsado',
};

function brl(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const RanchoChiquePedidosPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, role, loading: authLoading } = useAuth();
  const [pedidos, setPedidos] = useState<BagyPedido[]>([]);
  const [itensByPed, setItensByPed] = useState<Record<string, BagyItem[]>>({});
  const [syncByOrder, setSyncByOrder] = useState<Record<string, OrderSyncInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroFlag, setFiltroFlag] = useState<string>('todos');
  const [selPedido, setSelPedido] = useState<BagyPedido | null>(null);
  const [trackDialog, setTrackDialog] = useState<BagyPedido | null>(null);
  const [trackCode, setTrackCode] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

  const allowed = role === 'admin_master' || role === 'admin_producao' || role === 'vendedor_comissao';

  const load = async () => {
    setLoading(true);
    const { data: peds, error } = await supabase
      .from('bagy_pedidos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      toast.error('Erro ao carregar pedidos Bagy: ' + error.message);
      setLoading(false);
      return;
    }
    setPedidos((peds || []) as any);
    const ids = (peds || []).map((p: any) => p.id);
    if (ids.length > 0) {
      const { data: itens } = await supabase
        .from('bagy_pedido_itens')
        .select('*')
        .in('pedido_id', ids);
      const map: Record<string, BagyItem[]> = {};
      (itens || []).forEach((i: any) => {
        (map[i.pedido_id] ||= []).push(i);
      });
      setItensByPed(map);
    }
    // Carrega info de sync dos pedidos do portal
    const portalIds = (peds || []).map((p: any) => p.order_id_portal).filter(Boolean);
    if (portalIds.length > 0) {
      const { data: ords } = await supabase
        .from('orders')
        .select('id, status, bagy_last_sync_at, bagy_last_sync_error, bagy_last_sync_status')
        .in('id', portalIds);
      const sm: Record<string, OrderSyncInfo> = {};
      (ords || []).forEach((o: any) => {
        sm[o.id] = {
          status: o.status || null,
          bagy_last_sync_at: o.bagy_last_sync_at || null,
          bagy_last_sync_error: o.bagy_last_sync_error || null,
          bagy_last_sync_status: o.bagy_last_sync_status || null,
        };
      });
      setSyncByOrder(sm);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isLoggedIn && allowed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isLoggedIn, allowed]);

  const filtered = useMemo(() => {
    return pedidos.filter(p => {
      if (filtroFlag !== 'todos' && (p.flag || 'sem_flag') !== filtroFlag) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.numero_bagy.toLowerCase().includes(q) ||
        (p.cliente_nome || '').toLowerCase().includes(q) ||
        (p.cliente_doc || '').toLowerCase().includes(q) ||
        (p.cliente_whats || '').toLowerCase().includes(q)
      );
    });
  }, [pedidos, search, filtroFlag]);

  const semMapCount = pedidos.filter(p => p.flag === 'aguardando_mapeamento').length;
  const aguardFichaCount = pedidos.filter(p => p.flag === 'aguardando_ficha').length;

  const reprocessar = async (p: BagyPedido) => {
    if (!confirm(`Reprocessar pedido Bagy ${p.numero_bagy}?\nIsso tenta criar o pedido no portal novamente com base nos SKUs atuais.`)) return;
    toast.info('Reprocessando...');
    try {
      // Re-invoca o webhook reenviando o payload guardado
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bagy-webhook?token=__reprocess__&__internal=1`;
      // O melhor é via RPC server-side, mas como simplicidade chamamos uma função separada.
      // Por ora: tenta refazer o caminho A direto no client (só pra item de estoque ainda não criado).
      // Para casos complexos, repostar via webhook real.
      void url;
      toast.error('Reprocessamento server-side ainda não disponível. Aguarde a Bagy reenviar o webhook (ele reenvia em mudança de status) ou contate o admin.');
    } catch (e: any) {
      toast.error('Erro: ' + (e.message || e));
    }
  };

  const gerarFicha = (p: BagyPedido, item: BagyItem) => {
    if (!item.template_id) {
      toast.error('Item sem template mapeado por SKU. Crie/edite um modelo de ficha com esse SKU.');
      return;
    }
    navigate('/pedido', {
      state: {
        bagyPrefill: {
          templateId: item.template_id,
          numero: `RC-${p.numero_bagy}`,
          cliente: p.cliente_nome || '',
          whatsapp: p.cliente_whats || '',
          tamanho: item.tamanho || '',
          fotoUrl: item.foto_url,
          bagyPedidoId: p.id,
          bagyItemId: item.id,
          bagyOrderId: p.bagy_order_id,
          quantidade: item.quantidade,
        },
      },
    });
  };

  const marcarDespachado = async () => {
    if (!trackDialog) return;
    const code = trackCode.trim();
    if (!code) { toast.error('Informe o código de rastreio'); return; }
    const { error } = await supabase.from('bagy_status_sync_queue').insert({
      bagy_order_id: trackDialog.bagy_order_id,
      target_status: 'shipped',
      tracking_code: code,
      tracking_url: trackUrl.trim() || null,
    });
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Despacho enfileirado para sincronizar com a Bagy (até 1 min).');
    // Atualiza pedido portal também
    if (trackDialog.order_id_portal) {
      await supabase.from('orders').update({
        status: 'Despachado',
      } as any).eq('id', trackDialog.order_id_portal);
    }
    setTrackDialog(null);
    setTrackCode('');
    setTrackUrl('');
  };

  if (authLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!isLoggedIn) {
    return <div className="p-8 text-center">Faça login para ver os pedidos Bagy.</div>;
  }
  if (!allowed) {
    return <div className="p-8 text-center text-destructive">Acesso restrito.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Package /> Pedidos Bagy — Rancho Chique
        </h1>
        <div className="flex gap-2">
          {role === 'admin_master' && (
            <Button variant="outline" size="sm" onClick={async () => {
              const { data, error } = await supabase.functions.invoke('bagy-webhook-info');
              if (error || !data?.webhook_url) { toast.error('Erro: ' + (error?.message || 'sem URL')); return; }
              try {
                await navigator.clipboard.writeText(data.webhook_url);
                toast.success('URL do webhook copiada! Cole na Bagy em Webhooks → "Pedidos".');
              } catch {
                prompt('URL do webhook Bagy (copie):', data.webhook_url);
              }
            }}>
              Copiar URL do Webhook
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw size={14} className="mr-1" /> Atualizar
          </Button>
        </div>
      </div>


      {semMapCount > 0 && (
        <div className="mb-3 p-3 rounded-lg border-2 border-yellow-500 bg-yellow-50 text-yellow-900 flex items-start gap-2 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <b>{semMapCount} pedido(s) com SKU não mapeado.</b> Cadastre o produto no Estoque
            ou crie um modelo de ficha com o SKU correspondente — em seguida clique em "Reprocessar".
          </div>
        </div>
      )}

      {aguardFichaCount > 0 && (
        <div className="mb-3 p-3 rounded-lg border-2 border-blue-500 bg-blue-50 text-blue-900 flex items-start gap-2 text-sm">
          <FileText size={18} className="shrink-0 mt-0.5" />
          <div><b>{aguardFichaCount} pedido(s) aguardando geração de ficha.</b> Clique em "Gerar ficha" na lista abaixo.</div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar nº Bagy, cliente, CPF, WhatsApp..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded px-2 text-sm" value={filtroFlag} onChange={e => setFiltroFlag(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="pedido_criado">Pedido criado</option>
          <option value="aguardando_ficha">Aguardando ficha</option>
          <option value="aguardando_mapeamento">Sem mapeamento</option>
          <option value="erro_comprar_estoque">Erros</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando pedidos...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const itens = itensByPed[p.id] || [];
            const flag = p.flag ? FLAG_BADGE[p.flag] : null;
            return (
              <div key={p.id} className="border rounded-lg bg-card overflow-hidden">
                <button
                  onClick={() => setSelPedido(selPedido?.id === p.id ? null : p)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/30"
                >
                  {selPedido?.id === p.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <div className="font-mono font-bold text-sm shrink-0">RC-{p.numero_bagy}</div>
                  <div className="flex-1 min-w-0 text-sm truncate">{p.cliente_nome || '—'}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{new Date(p.created_at).toLocaleString('pt-BR')}</div>
                  <div className="text-sm font-semibold">{brl(p.total)}</div>
                  <Badge variant="outline">{STATUS_BAGY_LABEL[p.status_bagy] || p.status_bagy}</Badge>
                  {flag && <span className={`text-[10px] font-bold px-2 py-1 rounded ${flag.cls}`}>{flag.label}</span>}
                </button>

                {selPedido?.id === p.id && (
                  <div className="border-t p-3 space-y-3 bg-background">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Cliente</div>
                        <div className="font-semibold">{p.cliente_nome || '—'}</div>
                        {p.cliente_doc && <div className="text-xs">CPF/CNPJ: {p.cliente_doc}</div>}
                        {p.cliente_whats && <div className="text-xs">WhatsApp: {p.cliente_whats}</div>}
                        {p.cliente_email && <div className="text-xs">{p.cliente_email}</div>}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Endereço</div>
                        {p.endereco ? (
                          <div className="text-xs whitespace-pre-line">
                            {[p.endereco.street, p.endereco.number, p.endereco.complement].filter(Boolean).join(', ')}
                            {p.endereco.neighborhood && `\n${p.endereco.neighborhood}`}
                            {(p.endereco.city || p.endereco.state) && `\n${p.endereco.city || ''}${p.endereco.state ? ' / ' + p.endereco.state : ''}`}
                            {p.endereco.zipcode && `\nCEP ${p.endereco.zipcode}`}
                          </div>
                        ) : <div className="text-xs text-muted-foreground">—</div>}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Itens</div>
                      <div className="space-y-2">
                        {itens.length === 0 && <div className="text-xs text-muted-foreground">Nenhum item.</div>}
                        {itens.map(it => {
                          const sb = ITEM_STATUS_BADGE[it.status] || { label: it.status.toUpperCase(), cls: 'bg-gray-400 text-white' };
                          return (
                            <div key={it.id} className="flex items-center gap-3 p-2 border rounded text-sm">
                              {it.foto_url
                                ? <img src={it.foto_url} alt="" className="w-12 h-12 object-cover rounded" />
                                : <div className="w-12 h-12 rounded bg-muted" />}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{it.nome_produto || '—'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {it.variacao_nome && <>{it.variacao_nome} · </>}
                                  {it.tamanho && <>Tam {it.tamanho} · </>}
                                  Qtd {it.quantidade}
                                  {it.sku && <> · SKU <span className="font-mono">{it.sku}</span></>}
                                </div>
                              </div>
                              <div className="text-sm font-semibold">{brl(it.preco_unit)}</div>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded ${sb.cls}`}>{sb.label}</span>
                              {it.status === 'aguardando_ficha' && (
                                <Button size="sm" variant="default" onClick={() => gerarFicha(p, it)}>
                                  <FileText size={14} className="mr-1" /> Gerar ficha
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {p.order_id_portal && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/pedido/${p.order_id_portal}`)}>
                          <ExternalLink size={14} className="mr-1" /> Ver pedido no portal
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => reprocessar(p)}>
                        <RefreshCw size={14} className="mr-1" /> Reprocessar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setTrackDialog(p); setTrackCode(''); setTrackUrl(''); }}>
                        <Truck size={14} className="mr-1" /> Marcar despachado + rastreio
                      </Button>
                    </div>

                    {p.erro && (
                      <div className="text-xs text-destructive border border-destructive/40 rounded p-2 bg-destructive/5">
                        <b>Erro:</b> {p.erro}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!trackDialog} onOpenChange={(o) => !o && setTrackDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como despachado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pedido <b>RC-{trackDialog?.numero_bagy}</b>. O status será atualizado no portal e empurrado pra Bagy em até 1 minuto.
            </p>
            <div>
              <label className="text-xs font-semibold">Código de rastreio *</label>
              <Input value={trackCode} onChange={e => setTrackCode(e.target.value)} placeholder="Ex: BR123456789BR" />
            </div>
            <div>
              <label className="text-xs font-semibold">URL de rastreio (opcional)</label>
              <Input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTrackDialog(null)}>Cancelar</Button>
              <Button onClick={marcarDespachado}>Confirmar despacho</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RanchoChiquePedidosPage;
