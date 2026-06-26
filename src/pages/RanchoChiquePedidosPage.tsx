import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, RefreshCw, ExternalLink, FileText, Package, Truck, ChevronDown, ChevronRight, Search, Send, CheckCircle2, XCircle, Loader2, Printer } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BagyFichaDialog, type BagyFichaQueueItem } from '@/components/bagy/BagyFichaDialog';

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
  metodo_envio: string | null;
  flag: string | null;
  erro: string | null;
  order_id_portal: string | null;
  created_at: string;
  bagy_created_at: string | null;
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
  ncm: string | null;
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
  new: 'Novo', pending: 'Pendente', open: 'Aberto', archived: 'Arquivado',
  paid: 'Pago', approved: 'Aprovado', processing: 'Processando',
  separated: 'Separado', production: 'Em Produção',
  invoiced: 'Faturado', billed: 'Faturado',
  shipped: 'Despachado', delivered: 'Entregue', completed: 'Concluído',
  canceled: 'Cancelado', cancelled: 'Cancelado',
  refunded: 'Reembolsado', returned: 'Devolvido',
};

const STATUS_BAGY_FILTROS: Array<{ value: string; label: string }> = [
  { value: 'approved', label: 'Aprovado' },
  { value: 'production', label: 'Em Produção' },
  { value: 'separated', label: 'Separado' },
  { value: 'invoiced', label: 'Faturado' },
  { value: 'shipped', label: 'Despachado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'canceled', label: 'Cancelado' },
];


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
  const [filtroStatusBagy, setFiltroStatusBagy] = useState<string>('todos');
  const [reprocessing, setReprocessing] = useState(false);
  const [selPedido, setSelPedido] = useState<BagyPedido | null>(null);
  const [trackDialog, setTrackDialog] = useState<BagyPedido | null>(null);
  const [trackCode, setTrackCode] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [fichaQueue, setFichaQueue] = useState<BagyFichaQueueItem[] | null>(null);

  const allowed = role === 'admin_master' || role === 'admin_producao' || role === 'vendedor_comissao';

  const load = async () => {
    setLoading(true);
    const { data: peds, error } = await supabase
      .from('bagy_pedidos')
      .select('*')
      .order('bagy_created_at', { ascending: false, nullsFirst: false })
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
      if (filtroStatusBagy !== 'todos' && (p.status_bagy || '').toLowerCase() !== filtroStatusBagy) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.numero_bagy.toLowerCase().includes(q) ||
        (p.cliente_nome || '').toLowerCase().includes(q) ||
        (p.cliente_doc || '').toLowerCase().includes(q) ||
        (p.cliente_whats || '').toLowerCase().includes(q)
      );
    });
  }, [pedidos, search, filtroFlag, filtroStatusBagy]);


  const semMapCount = pedidos.filter(p => p.flag === 'aguardando_mapeamento').length;
  const aguardFichaCount = pedidos.filter(p => p.flag === 'aguardando_ficha').length;

  const reprocessarBulk = async (pedidoIds: string[]) => {
    const ids = pedidoIds.filter(Boolean);
    if (ids.length === 0) { toast.error('Nenhum pedido selecionado.'); return; }
    setReprocessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('bagy-reprocess', {
        body: { pedido_ids: ids },
      });
      if (error) { toast.error('Erro: ' + error.message); return; }
      const results = (data?.results || []) as Array<{ ok: boolean; message: string; numero_bagy: string }>;
      const ok = results.filter(r => r.ok).length;
      const fail = results.length - ok;
      if (fail === 0) toast.success(`Reprocessado: ${ok} pedido(s).`);
      else if (ok === 0) toast.error(`Falha ao reprocessar ${fail} pedido(s). Verifique o console.`);
      else toast.warning(`${ok} reprocessado(s) · ${fail} com erro.`);
      if (fail > 0) console.warn('Falhas reprocesso:', results.filter(r => !r.ok));
      await load();
    } finally {
      setReprocessing(false);
    }
  };

  const reprocessar = async (p: BagyPedido) => {
    if (!confirm(`Reprocessar pedido Bagy ${p.numero_bagy}?\nIsso reexecuta a importação usando o payload original.`)) return;
    await reprocessarBulk([p.id]);
  };


  /** Abre o BagyFichaDialog com a fila pedida. Filtra apenas itens prontos (aguardando_ficha + template_id). */
  const abrirFichaDialog = (queue: BagyFichaQueueItem[]) => {
    if (queue.length === 0) {
      toast.error('Nenhum item pronto para gerar ficha.');
      return;
    }
    setFichaQueue(queue);
  };

  /** Constrói a fila a partir de um pedido (todos os itens elegíveis dele). */
  const queueFromPedido = (p: BagyPedido): BagyFichaQueueItem[] => {
    const itens = itensByPed[p.id] || [];
    return itens
      .filter(i => i.status === 'aguardando_ficha' && !!i.template_id)
      .map(i => ({ pedidoId: p.id, itemId: i.id }));
  };

  /** Constrói a fila a partir de vários pedidos selecionados. */
  const queueFromSelection = (): BagyFichaQueueItem[] => {
    const out: BagyFichaQueueItem[] = [];
    pedidos.filter(p => selected.has(p.id)).forEach(p => {
      out.push(...queueFromPedido(p));
    });
    return out;
  };

  const gerarFichaItem = (p: BagyPedido, item: BagyItem) => {
    if (!item.template_id) {
      toast.error('Item sem template mapeado por SKU. Crie/edite um modelo de ficha com esse SKU.');
      return;
    }
    abrirFichaDialog([{ pedidoId: p.id, itemId: item.id }]);
  };



  const marcarDespachado = async () => {
    if (!trackDialog) return;
    const code = trackCode.trim();
    if (!code) { toast.error('Informe o código de rastreio'); return; }
    const { error: bpErr } = await supabase
      .from('bagy_pedidos')
      .update({ tracking_code: code, tracking_url: trackUrl.trim() || null } as any)
      .eq('id', trackDialog.id);
    if (bpErr) { toast.error('Erro ao salvar rastreio: ' + bpErr.message); return; }
    if (trackDialog.order_id_portal) {
      await supabase.from('orders').update({ status: 'Despachado' } as any).eq('id', trackDialog.order_id_portal);
      await sincronizarBagy([trackDialog.order_id_portal], { silent: false });
    } else {
      toast.success('Rastreio salvo. Vincule o pedido ao portal para sincronizar com a Bagy.');
    }
    setTrackDialog(null);
    setTrackCode('');
    setTrackUrl('');
    await load();
  };

  const sincronizarBagy = async (
    portalOrderIds: string[],
    opts?: { silent?: boolean },
  ): Promise<{ ok: number; fail: number }> => {
    const ids = portalOrderIds.filter(Boolean);
    if (ids.length === 0) {
      if (!opts?.silent) toast.error('Nenhum pedido selecionado com vínculo ao portal.');
      return { ok: 0, fail: 0 };
    }
    setSyncing(true);
    setSyncProgress({ done: 0, total: ids.length });
    let ok = 0; let fail = 0;
    const CHUNK = 5;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { data, error } = await supabase.functions.invoke('bagy-status-push', {
        body: { order_ids: slice },
      });
      if (error) {
        fail += slice.length;
      } else {
        const results = (data?.results || []) as Array<{ ok: boolean }>;
        results.forEach(r => { if (r.ok) ok++; else fail++; });
      }
      setSyncProgress({ done: Math.min(i + CHUNK, ids.length), total: ids.length });
    }
    setSyncing(false);
    setSyncProgress(null);
    if (!opts?.silent) {
      if (fail === 0) toast.success(`Sincronizado com a Bagy: ${ok} pedido(s).`);
      else if (ok === 0) toast.error(`Falha ao sincronizar ${fail} pedido(s).`);
      else toast.warning(`${ok} ok · ${fail} com erro.`);
    }
    await load();
    return { ok, fail };
  };

  const toggleSelected = (pedidoId: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(pedidoId)) n.delete(pedidoId); else n.add(pedidoId);
      return n;
    });
  };
  const selectAllVisible = () => {
    setSelected(new Set(filtered.map(p => p.id)));
  };
  const clearSelection = () => setSelected(new Set());

  // Os ids de portal correspondentes aos pedidos selecionados (subset elegível para sync)
  const selectedPortalIds = useMemo(() => {
    const byId = new Map(pedidos.map(p => [p.id, p.order_id_portal]));
    return Array.from(selected).map(id => byId.get(id)).filter(Boolean) as string[];
  }, [selected, pedidos]);


  const fmtRelative = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `há ${h} h`;
    const days = Math.floor(h / 24);
    return `há ${days} d`;
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
        <select className="border rounded px-2 text-sm h-10" value={filtroStatusBagy} onChange={e => setFiltroStatusBagy(e.target.value)}>
          <option value="todos">Todos status Bagy</option>
          {STATUS_BAGY_FILTROS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select className="border rounded px-2 text-sm h-10" value={filtroFlag} onChange={e => setFiltroFlag(e.target.value)}>
          <option value="todos">Toda situação interna</option>
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
        <>
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Checkbox
              checked={filtered.length > 0 && filtered.every(p => selected.has(p.id))}
              onCheckedChange={(v) => v ? selectAllVisible() : clearSelection()}
            />
            <span>Selecionar todos visíveis</span>
            {selected.size > 0 && <span className="ml-2">· {selected.size} selecionado(s)</span>}
          </div>

        <div className="space-y-2">
          {filtered.map(p => {
            const itens = itensByPed[p.id] || [];
            const flag = p.flag ? FLAG_BADGE[p.flag] : null;
            return (
              <div key={p.id} className="border rounded-lg bg-card overflow-hidden">
                <div className="w-full flex items-center gap-3 p-3 hover:bg-accent/30">
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggleSelected(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Selecionar pedido"
                  />

                  <button
                    type="button"
                    onClick={() => setSelPedido(selPedido?.id === p.id ? null : p)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {selPedido?.id === p.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div className="font-mono font-bold text-sm shrink-0">RC-{p.numero_bagy}</div>
                    <div className="flex-1 min-w-0 text-sm truncate">{p.cliente_nome || '—'}</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">{new Date(p.bagy_created_at || p.created_at).toLocaleString('pt-BR')}</div>
                    <div className="text-sm font-semibold">{brl(p.total)}</div>
                    <Badge variant="outline">{STATUS_BAGY_LABEL[p.status_bagy] || p.status_bagy}</Badge>
                  </button>

                  {/* Slot de status interno — botão "Gerar ficha" substitui o badge quando aguardando_ficha (sem duplicar). */}
                  {p.flag === 'aguardando_ficha' ? (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                      onClick={(e) => { e.stopPropagation(); const q = queueFromPedido(p); abrirFichaDialog(q); }}
                    >
                      <FileText size={14} className="mr-1" /> Gerar ficha
                    </Button>
                  ) : flag ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${flag.cls}`}>{flag.label}</span>
                  ) : null}

                  {(() => {
                    const si = p.order_id_portal ? syncByOrder[p.order_id_portal] : null;
                    if (!si) return null;
                    if (si.bagy_last_sync_error) {
                      return (
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1 shrink-0"><XCircle size={10}/>ERRO BAGY</span>
                          </TooltipTrigger>
                          <TooltipContent>{si.bagy_last_sync_error}</TooltipContent>
                        </Tooltip></TooltipProvider>
                      );
                    }
                    if (si.bagy_last_sync_at) {
                      return <span className="text-[10px] text-muted-foreground hidden md:inline shrink-0">Bagy: {fmtRelative(si.bagy_last_sync_at)}</span>;
                    }
                    return null;
                  })()}
                </div>

                {selPedido?.id === p.id && (
                  <div className="border-t p-3 space-y-3 bg-background">
                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Cliente</div>
                        <div className="font-semibold">{p.cliente_nome || '—'}</div>
                        {p.cliente_doc && <div className="text-xs">CPF/CNPJ: {p.cliente_doc}</div>}
                        {p.cliente_whats && <div className="text-xs">WhatsApp: {p.cliente_whats}</div>}
                        {p.cliente_email && <div className="text-xs">{p.cliente_email}</div>}
                        {p.pagamento && <div className="text-xs mt-1">Pagamento: <b>{p.pagamento}</b></div>}
                        <div className="text-xs">Total: <b>{brl(p.total)}</b></div>
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
                      <div>
                        <div className="text-xs text-muted-foreground">Envio</div>
                        <div className="text-xs">{p.metodo_envio || <span className="text-muted-foreground">— não informado —</span>}</div>
                        {(p.frete ?? 0) > 0 && <div className="text-xs">Frete: <b>{brl(p.frete)}</b></div>}
                        {p.tracking_code && (
                          <div className="text-xs mt-1">
                            Rastreio: <span className="font-mono">{p.tracking_code}</span>
                          </div>
                        )}
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
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {it.nome_produto || '—'}
                                  {it.variacao_nome && <span className="text-muted-foreground font-normal"> — {it.variacao_nome}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {it.tamanho && <>Tam {it.tamanho} · </>}
                                  Qtd {it.quantidade}
                                  {it.sku && <> · SKU <span className="font-mono">{it.sku}</span></>}
                                  {it.ncm && <> · NCM <span className="font-mono">{it.ncm}</span></>}
                                </div>
                              </div>
                              <div className="text-sm font-semibold">{brl(it.preco_unit)}</div>
                              {/* Quando aguardando_ficha: mostra só o botão azul (sem badge duplicado). */}
                              {it.status === 'aguardando_ficha' ? (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => gerarFichaItem(p, it)}>
                                  <FileText size={14} className="mr-1" /> Gerar ficha
                                </Button>
                              ) : (
                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${sb.cls}`}>{sb.label}</span>
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
                      {p.order_id_portal && (
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="default" disabled={syncing}
                              onClick={() => sincronizarBagy([p.order_id_portal!])}>
                              {syncing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
                              Atualizar status na Bagy
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Envia o status atual do portal pra Bagy agora.<br/>
                            Use depois de mudar a etapa, faturar (emitir NF) ou despachar (com rastreio).
                          </TooltipContent>
                        </Tooltip></TooltipProvider>
                      )}
                      <Button size="sm" variant="outline" disabled={reprocessing} onClick={() => reprocessar(p)}>
                        {reprocessing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                        Reprocessar
                      </Button>
                      <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="outline" disabled>
                              <FileText size={14} className="mr-1" /> Gerar NF-e
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Integração NF-e em configuração.</TooltipContent>
                      </Tooltip></TooltipProvider>
                      <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="outline" disabled>
                              <Printer size={14} className="mr-1" /> Imprimir etiqueta
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Integração Melhor Envio em configuração.</TooltipContent>
                      </Tooltip></TooltipProvider>
                      <Button size="sm" variant="outline" onClick={() => { setTrackDialog(p); setTrackCode(p.tracking_code || ''); setTrackUrl(p.tracking_url || ''); }}>
                        <Truck size={14} className="mr-1" /> {p.tracking_code ? 'Editar rastreio' : 'Marcar despachado + rastreio'}
                      </Button>
                    </div>



                    {p.order_id_portal && syncByOrder[p.order_id_portal] && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                        {syncByOrder[p.order_id_portal].bagy_last_sync_at ? (
                          <>
                            {syncByOrder[p.order_id_portal].bagy_last_sync_error ? (
                              <span className="text-destructive flex items-center gap-1"><XCircle size={12}/>Último envio falhou ({fmtRelative(syncByOrder[p.order_id_portal].bagy_last_sync_at)}): {syncByOrder[p.order_id_portal].bagy_last_sync_error}</span>
                            ) : (
                              <span className="text-green-700 flex items-center gap-1"><CheckCircle2 size={12}/>Sincronizado {fmtRelative(syncByOrder[p.order_id_portal].bagy_last_sync_at)} como <b>{syncByOrder[p.order_id_portal].bagy_last_sync_status}</b></span>
                            )}
                          </>
                        ) : (
                          <span>Nunca sincronizado com a Bagy.</span>
                        )}
                      </div>
                    )}

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
        </>
      )}

      {/* Barra flutuante de seleção */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border-2 border-primary shadow-2xl rounded-2xl px-4 py-2 flex items-center gap-2 flex-wrap max-w-[95vw]">
          <span className="text-sm font-semibold">{selected.size} selecionado(s)</span>
          <Button size="sm" variant="ghost" onClick={clearSelection}>Limpar</Button>
          <Button size="sm" variant="outline" disabled={reprocessing}
            onClick={() => reprocessarBulk(Array.from(selected))}>
            {reprocessing
              ? <><Loader2 size={14} className="mr-1 animate-spin"/> Reprocessando...</>
              : <><RefreshCw size={14} className="mr-1"/> Reprocessar</>}
          </Button>
          {(() => {
            const fichaCount = queueFromSelection().length;
            return (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={fichaCount === 0}
                onClick={() => abrirFichaDialog(queueFromSelection())}>
                <FileText size={14} className="mr-1"/> Gerar fichas ({fichaCount})
              </Button>
            );
          })()}
          <Button size="sm" disabled={syncing || selectedPortalIds.length === 0}
            onClick={() => sincronizarBagy(selectedPortalIds)}>
            {syncing
              ? <><Loader2 size={14} className="mr-1 animate-spin"/> {syncProgress ? `${syncProgress.done}/${syncProgress.total}` : 'Enviando...'}</>
              : <><Send size={14} className="mr-1"/> Atualizar Bagy ({selectedPortalIds.length}/{selected.size})</>}
          </Button>
          <TooltipProvider><Tooltip>
            <TooltipTrigger asChild>
              <span><Button size="sm" variant="outline" disabled><FileText size={14} className="mr-1"/> Gerar NF-e</Button></span>
            </TooltipTrigger>
            <TooltipContent>Integração NF-e em configuração.</TooltipContent>
          </Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip>
            <TooltipTrigger asChild>
              <span><Button size="sm" variant="outline" disabled><Printer size={14} className="mr-1"/> Imprimir etiqueta</Button></span>
            </TooltipTrigger>
            <TooltipContent>Integração Melhor Envio em configuração.</TooltipContent>
          </Tooltip></TooltipProvider>
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
