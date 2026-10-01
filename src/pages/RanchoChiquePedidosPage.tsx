import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, RefreshCw, ExternalLink, FileText, Package, Truck, ChevronDown, ChevronRight, Search, Send, CheckCircle2, XCircle, Loader2, Printer, ShoppingCart, ArrowUpRight, ClipboardList } from 'lucide-react';
import { DanfeViewerDialog } from '@/components/fiscal/DanfeViewerDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BagyFichaDialog, type BagyFichaQueueItem } from '@/components/bagy/BagyFichaDialog';
import { BagyNfeMenu } from '@/components/fiscal/BagyNfeMenu';
import { bagyLetterSuffix } from '@/lib/bagySuffix';
import { NfeBagyDialog } from '@/components/fiscal/NfeBagyDialog';
import { useNfeAccess } from '@/hooks/useNfeAccess';
import { gerarDanfePdf } from '@/lib/fiscal/danfePdf';
import { matchOrderBarcode } from '@/contexts/AuthContext';
import { BagyPedidoView } from '@/components/bagy/BagyPedidoView';

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

type PortalOrderInfo = OrderSyncInfo & {
  id: string;
  numero: string | null;
  bagy_order_id: string | null;
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

type BagyNfeInfo = {
  id: string;
  numero: number;
  status: string;
  tipo_nota: string;
  chave_acesso: string | null;
  protocolo: string | null;
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
  const [portalOrdersByBagy, setPortalOrdersByBagy] = useState<Record<string, PortalOrderInfo[]>>({});
  const [nfeByPedido, setNfeByPedido] = useState<Record<string, BagyNfeInfo>>({});
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
  const [nfeIds, setNfeIds] = useState<string[] | null>(null);
  const nfeAcesso = useNfeAccess();
  const [danfeView, setDanfeView] = useState<{ id: string; mode: 'a4' | 'etiqueta' } | null>(null);
  const [danfeLote, setDanfeLote] = useState<string[] | null>(null);
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [fichasOpen, setFichasOpen] = useState(false);

  const allowed = role === 'admin_master' || role === 'admin_producao' || role === 'vendedor_comissao';

  const load = async () => {
    setLoading(true);
    try {
    const chunk = <T,>(arr: T[], n = 100): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
      return out;
    };
    const { data: peds, error } = await supabase
      .from('bagy_pedidos')
      .select('*')
      .order('bagy_created_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      toast.error('Erro ao carregar pedidos Bagy: ' + error.message);
      return;
    }
    setPedidos((peds || []) as any);
    const ids = (peds || []).map((p: any) => p.id);
    if (ids.length > 0) {
      const parts = chunk(ids);
      const results = await Promise.all(parts.map(async (part) => {
        const [{ data: itens }, { data: notas }] = await Promise.all([
          supabase.from('bagy_pedido_itens').select('*').in('pedido_id', part),
          supabase.from('nfe_notas')
            .select('id, numero, status, tipo_nota, chave_acesso, protocolo, bagy_pedido_id, created_at')
            .in('bagy_pedido_id', part)
            .eq('tipo_nota', 'normal')
            .order('created_at', { ascending: false }),
        ]);
        return { itens: itens || [], notas: notas || [] };
      }));
      const itens = results.flatMap(r => r.itens);
      const notas = results.flatMap(r => r.notas);
      const map: Record<string, BagyItem[]> = {};
      itens.forEach((i: any) => {
        (map[i.pedido_id] ||= []).push(i);
      });
      setItensByPed(map);
      const nfeMap: Record<string, BagyNfeInfo> = {};
      notas.forEach((nota: any) => {
        if (!nota.bagy_pedido_id) return;
        const atual = nfeMap[nota.bagy_pedido_id];
        const ativa = ['autorizada', 'processando'].includes(nota.status);
        const atualAtiva = atual && ['autorizada', 'processando'].includes(atual.status);
        if (!atual || (ativa && !atualAtiva)) nfeMap[nota.bagy_pedido_id] = nota;
      });
      setNfeByPedido(nfeMap);
    } else {
      setItensByPed({});
      setNfeByPedido({});
    }
    const bagyOrderIds = Array.from(new Set((peds || []).map((p: any) => p.bagy_order_id).filter(Boolean))) as string[];
    if (bagyOrderIds.length > 0) {
      const ordParts = await Promise.all(chunk(bagyOrderIds).map(part =>
        supabase
          .from('orders')
          .select('id, numero, bagy_order_id, status, bagy_last_sync_at, bagy_last_sync_error, bagy_last_sync_status')
          .in('bagy_order_id', part)
          .order('numero', { ascending: true })
          .then(r => r.data || []),
      ));
      const ords = ordParts.flat();
      const sm: Record<string, OrderSyncInfo> = {};
      const byBagy: Record<string, PortalOrderInfo[]> = {};
      ords.forEach((o: any) => {
        const info: PortalOrderInfo = {
          id: o.id,
          numero: o.numero || null,
          bagy_order_id: o.bagy_order_id || null,
          status: o.status || null,
          bagy_last_sync_at: o.bagy_last_sync_at || null,
          bagy_last_sync_error: o.bagy_last_sync_error || null,
          bagy_last_sync_status: o.bagy_last_sync_status || null,
        };
        sm[o.id] = info;
        if (info.bagy_order_id) (byBagy[info.bagy_order_id] ||= []).push(info);
      });
      setSyncByOrder(sm);
      setPortalOrdersByBagy(byBagy);
    } else {
      setSyncByOrder({});
      setPortalOrdersByBagy({});
    }
    } catch (e: any) {
      toast.error('Erro ao carregar pedidos Bagy: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isLoggedIn && allowed) {
      load();
      // drena fila de status Bagy em background (silencioso)
      supabase.functions.invoke('bagy-queue-drain').catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isLoggedIn, allowed]);

  const filtered = useMemo(() => {
    return pedidos.filter(p => {
      if (filtroFlag !== 'todos' && (p.flag || 'sem_flag') !== filtroFlag) return false;
      if (filtroStatusBagy !== 'todos' && (p.status_bagy || '').toLowerCase() !== filtroStatusBagy) return false;
      if (dataIni || dataFim) {
        const d = new Date(p.bagy_created_at || p.created_at);
        const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dataIni && dia < dataIni) return false;
        if (dataFim && dia > dataFim) return false;
      }
      if (!search.trim()) return true;
      const raw = search.trim();
      const q = raw.toLowerCase();
      if (
        p.numero_bagy.toLowerCase().includes(q) ||
        `rc-${p.numero_bagy}`.toLowerCase().includes(q) ||
        (p.cliente_nome || '').toLowerCase().includes(q) ||
        (p.cliente_doc || '').toLowerCase().includes(q) ||
        (p.cliente_whats || '').toLowerCase().includes(q)
      ) return true;
      // Código de barras / número dos pedidos gerados no portal ("Meus pedidos")
      const portal = [
        ...(portalOrdersByBagy[p.bagy_order_id] || []),
        ...(p.order_id_portal ? [{ id: p.order_id_portal, numero: null as string | null }] : []),
      ];
      return portal.some(o =>
        matchOrderBarcode(raw.toUpperCase(), { id: o.id, numero: o.numero || '' }) ||
        (o.numero || '').toLowerCase().includes(q)
      );
    });
  }, [pedidos, search, filtroFlag, filtroStatusBagy, portalOrdersByBagy, dataIni, dataFim]);

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, filtroFlag, filtroStatusBagy, dataIni, dataFim]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);


  const semMapCount = pedidos.filter(p => p.flag === 'aguardando_mapeamento').length;
  const fichasPendentes = pedidos.filter(p => p.flag === 'aguardando_ficha' && (itensByPed[p.id] || []).some(i => i.status === 'aguardando_ficha' && !!i.template_id));
  const aguardFichaCount = fichasPendentes.length;

  const getPortalOrdersForPedido = (p: BagyPedido): PortalOrderInfo[] => {
    const linked = portalOrdersByBagy[p.bagy_order_id] || [];
    if (linked.length > 0) return linked;
    if (!p.order_id_portal) return [];
    const sync = syncByOrder[p.order_id_portal];
    return [{
      id: p.order_id_portal,
      numero: null,
      bagy_order_id: p.bagy_order_id,
      status: sync?.status || null,
      bagy_last_sync_at: sync?.bagy_last_sync_at || null,
      bagy_last_sync_error: sync?.bagy_last_sync_error || null,
      bagy_last_sync_status: sync?.bagy_last_sync_status || null,
    }];
  };

  const getPrimaryPortalId = (p: BagyPedido) => p.order_id_portal || getPortalOrdersForPedido(p)[0]?.id || null;

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

  /** Constrói a fila a partir de um pedido — expande cada item pela sua quantidade (1 par = 1 ficha).
   * Se houver mais de 1 par no pedido inteiro (soma das quantidades), aplica sufixo A/B/C...
   */
  const queueFromPedido = (p: BagyPedido): BagyFichaQueueItem[] => {
    const itens = (itensByPed[p.id] || []).filter(i => i.status === 'aguardando_ficha' && !!i.template_id);
    const totalPares = itens.reduce((s, i) => s + Math.max(1, i.quantidade || 1), 0);
    const numeroBase = `RC-${p.numero_bagy}`;
    const out: BagyFichaQueueItem[] = [];
    let idx = 0;
    for (const it of itens) {
      const q = Math.max(1, it.quantidade || 1);
      for (let k = 0; k < q; k++) {
        const suffix = totalPares > 1 ? bagyLetterSuffix(idx) : '';
        out.push({
          pedidoId: p.id,
          itemId: it.id,
          unitIndex: k,
          unitTotalItem: q,
          numeroOverride: numeroBase + suffix,
        });
        idx++;
      }
    }
    return out;
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
    // Usa a fila completa do pedido para manter a numeração global correta (A/B/C...),
    // mas filtra apenas os pares deste item.
    const full = queueFromPedido(p);
    const only = full.filter(q => q.itemId === item.id);
    abrirFichaDialog(only.length > 0 ? only : [{ pedidoId: p.id, itemId: item.id, unitIndex: 0, unitTotalItem: 1, numeroOverride: `RC-${p.numero_bagy}` }]);
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
    const primaryPortalId = getPrimaryPortalId(trackDialog);
    if (primaryPortalId) {
      const ids = getPortalOrdersForPedido(trackDialog).map(o => o.id);
      const targetIds = ids.length > 0 ? ids : [primaryPortalId];
      await supabase.from('orders').update({ status: 'Despachado' } as any).in('id', targetIds);
      await sincronizarBagy(targetIds, { silent: false });
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
    const byId = new Map(pedidos.map(p => [p.id, p]));
    return Array.from(new Set(Array.from(selected).flatMap(id => {
      const pedido = byId.get(id);
      if (!pedido) return [];
      const linked = getPortalOrdersForPedido(pedido).map(o => o.id);
      return linked.length > 0 ? linked : (pedido.order_id_portal ? [pedido.order_id_portal] : []);
    })));
  }, [selected, pedidos, portalOrdersByBagy, syncByOrder]);


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
          <Button variant="outline" size="sm" className="relative" onClick={() => setFichasOpen(true)} title="Pedidos com modelo rascunho aguardando ficha">
            <ClipboardList size={16} className="mr-1" /> Fichas
            {fichasPendentes.length > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">{fichasPendentes.length}</span>
            )}
          </Button>
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



      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar nº Bagy, nº do pedido, código de barras, cliente, CPF..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>De</span>
          <Input type="date" className="h-10 w-[150px]" value={dataIni} onChange={e => setDataIni(e.target.value)} aria-label="Data inicial" />
          <span>até</span>
          <Input type="date" className="h-10 w-[150px]" value={dataFim} onChange={e => setDataFim(e.target.value)} aria-label="Data final" />
          {(dataIni || dataFim) && <Button size="sm" variant="ghost" onClick={() => { setDataIni(''); setDataFim(''); }}>Limpar</Button>}
        </div>
        <select className="border rounded px-2 text-sm h-10" value={filtroStatusBagy} onChange={e => setFiltroStatusBagy(e.target.value)}>
          <option value="todos">Todos status Bagy</option>
          {STATUS_BAGY_FILTROS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
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
          {paged.map(p => {
            const itens = itensByPed[p.id] || [];
            const flag = p.flag ? FLAG_BADGE[p.flag] : null;
            const portalOrders = getPortalOrdersForPedido(p);
            const primaryPortalId = getPrimaryPortalId(p);
            const portalOrderIds = portalOrders.map(o => o.id);
            const displayPortalIds = portalOrderIds.length > 0 ? portalOrderIds : (primaryPortalId ? [primaryPortalId] : []);
            const syncError = portalOrders.find(o => o.bagy_last_sync_error)?.bagy_last_sync_error;
            const notaFiscal = nfeByPedido[p.id];
            const nfeAutorizada = notaFiscal?.status === 'autorizada' && !!notaFiscal.chave_acesso && !!notaFiscal.protocolo;
            const nfeBloqueada = notaFiscal?.status === 'autorizada' || notaFiscal?.status === 'processando';
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
                    <span className="flex items-center gap-1 text-primary shrink-0">
                      {notaFiscal && <span title={`NF-e nº ${notaFiscal.numero} (${notaFiscal.status})`}><FileText size={15} /></span>}
                      {nfeAutorizada && <span title="NF-e pronta para impressão"><Printer size={15} /></span>}
                      {p.tracking_code && <span title={`Etiqueta de transporte: ${p.tracking_code}`}><ShoppingCart size={15} /></span>}
                    </span>
                  </button>
                  {primaryPortalId && (
                    <button type="button" title="Abrir pedido em Meus Pedidos" aria-label="Abrir pedido em Meus Pedidos"
                      onClick={(e) => { e.stopPropagation(); navigate(`/pedido/${primaryPortalId}`); }}
                      className="text-primary hover:bg-accent rounded p-1 shrink-0">
                      <ArrowUpRight size={16} />
                    </button>
                  )}

                  {(() => {
                    if (syncError) {
                      return (
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1 shrink-0"><XCircle size={10}/>ERRO BAGY</span>
                          </TooltipTrigger>
                          <TooltipContent>{syncError}</TooltipContent>
                        </Tooltip></TooltipProvider>
                      );
                    }
                    return null;
                  })()}

                  {nfeAcesso && (
                    <BagyNfeMenu pedido={p} hideSello onGerarNfe={() => setNfeIds([p.id])} onChanged={load} />
                  )}
                </div>

                {selPedido?.id === p.id && (
                  <div className="border-t p-2 space-y-2 bg-background">
                    <BagyPedidoView pedido={p} nota={notaFiscal} statusLabel={STATUS_BAGY_LABEL[p.status_bagy]}
                      onOpenNota={() => notaFiscal && (nfeAutorizada ? setDanfeView({ id: notaFiscal.id, mode: 'a4' }) : setNfeIds([p.id]))}
                      onOpenTracking={() => p.tracking_url ? window.open(p.tracking_url, '_blank') : (setTrackDialog(p), setTrackCode(p.tracking_code || ''), setTrackUrl(p.tracking_url || ''))} />

                    {(p.flag === 'aguardando_ficha' || (flag && p.flag !== 'aguardando_mapeamento')) && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Portal — situação interna</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {p.flag === 'aguardando_ficha' ? (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => abrirFichaDialog(queueFromPedido(p))}>
                            <FileText size={14} className="mr-1" /> Gerar ficha
                          </Button>
                        ) : flag ? (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${flag.cls}`}>{flag.label}{p.flag === 'pedido_criado' && portalOrders.length > 1 ? ` (${portalOrders.length})` : ''}</span>
                        ) : null}
                      </div>
                    </div>
                    )}


                    {portalOrders.length > 1 && (
                      <div className="rounded border p-2 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Pedidos gerados no portal</div>
                        <div className="flex flex-wrap gap-2">
                          {portalOrders.map(o => (
                            <Button key={o.id} size="sm" variant="outline" onClick={() => navigate(`/pedido/${o.id}`)}>
                              <ExternalLink size={14} className="mr-1" /> {o.numero || 'Abrir pedido'}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {primaryPortalId && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/pedido/${primaryPortalId}`)}>
                          <ExternalLink size={14} className="mr-1" /> {portalOrders.length > 1 ? 'Ver primeiro pedido' : 'Ver pedido no portal'}
                        </Button>
                      )}
                      {displayPortalIds.length > 0 && (
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="default" disabled={syncing}
                              onClick={() => sincronizarBagy(displayPortalIds)}>
                              {syncing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
                              Atualizar status na Bagy{displayPortalIds.length > 1 ? ` (${displayPortalIds.length})` : ''}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Envia o status atual do portal pra Bagy agora.<br/>
                            Use depois de mudar a etapa, faturar (emitir NF) ou despachar (com rastreio).
                          </TooltipContent>
                        </Tooltip></TooltipProvider>
                      )}
                      {nfeAcesso && !nfeBloqueada && (
                        <Button size="sm" variant="outline" onClick={() => setNfeIds([p.id])}>
                          <FileText size={14} className="mr-1" /> Gerar NF-e
                        </Button>
                      )}
                      <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="outline" disabled={!nfeAutorizada}
                              onClick={() => notaFiscal && setDanfeView({ id: notaFiscal.id, mode: 'a4' })}>
                              <Printer size={14} className="mr-1" /> Imprimir NF-e
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!nfeAutorizada && <TooltipContent>Disponível após a autorização da NF-e.</TooltipContent>}
                      </Tooltip></TooltipProvider>
                      <TooltipProvider><Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="outline" disabled={!nfeAutorizada}
                              onClick={() => notaFiscal && setDanfeView({ id: notaFiscal.id, mode: 'etiqueta' })}>
                              <Printer size={14} className="mr-1" /> DANFE Simplificada
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!nfeAutorizada && <TooltipContent>Disponível após a autorização da NF-e.</TooltipContent>}
                      </Tooltip></TooltipProvider>
                      <Button size="sm" variant="outline" onClick={() => { setTrackDialog(p); setTrackCode(p.tracking_code || ''); setTrackUrl(p.tracking_url || ''); }}>
                        <Truck size={14} className="mr-1" /> {p.tracking_code ? 'Editar rastreio' : 'Marcar despachado + rastreio'}
                      </Button>
                    </div>



                    {portalOrders.length > 0 && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                        {syncError ? (
                          <span className="text-destructive flex items-center gap-1"><XCircle size={12}/>Último envio falhou: {syncError}</span>
                        ) : portalOrders.some(o => o.bagy_last_sync_at) ? (
                          <span className="text-green-700 flex items-center gap-1"><CheckCircle2 size={12}/>Sincronizado com a Bagy ({portalOrders.length} pedido(s))</span>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 mt-4 flex-wrap text-sm">
            <span className="text-muted-foreground">
              Exibindo {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} de {filtered.length} pedidos
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={pageSafe === 1} onClick={() => setPage(1)}>Primeira</Button>
              <Button size="sm" variant="outline" disabled={pageSafe === 1} onClick={() => setPage(pageSafe - 1)}>Anterior</Button>
              <span className="px-2">Página {pageSafe} de {totalPages}</span>
              <Button size="sm" variant="outline" disabled={pageSafe === totalPages} onClick={() => setPage(pageSafe + 1)}>Próxima</Button>
              <Button size="sm" variant="outline" disabled={pageSafe === totalPages} onClick={() => setPage(totalPages)}>Última</Button>
            </div>
          </div>
        )}
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
          {nfeAcesso && (
            <Button size="sm" variant="outline" onClick={() => setNfeIds(Array.from(selected))}><FileText size={14} className="mr-1"/> Gerar NF-e ({selected.size})</Button>
          )}
          <TooltipProvider><Tooltip>
            <TooltipTrigger asChild>
              <span><Button size="sm" variant="outline" disabled={selectedNotaIds.length === 0}
                onClick={() => setDanfeLote(selectedNotaIds)}>
                <Printer size={14} className="mr-1"/> DANFE Simplificada ({selectedNotaIds.length})
              </Button></span>
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

      <DanfeViewerDialog notaId={danfeView?.id ?? null} mode={danfeView?.mode ?? 'a4'} onClose={() => setDanfeView(null)} />
      <DanfeViewerDialog notaIds={danfeLote} mode="etiqueta" onClose={() => setDanfeLote(null)} />

      <Dialog open={fichasOpen} onOpenChange={setFichasOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Aguardando ficha ({fichasPendentes.length})</DialogTitle></DialogHeader>
          {fichasPendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido com modelo rascunho aguardando ficha.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {fichasPendentes.map(p => (
                <div key={p.id} className="flex items-center gap-2 border rounded p-2 text-sm">
                  <span className="font-mono font-bold">RC-{p.numero_bagy}</span>
                  <span className="flex-1 truncate">{p.cliente_nome || '—'}</span>
                  <Button size="sm" onClick={() => { setFichasOpen(false); abrirFichaDialog(queueFromPedido(p)); }}>
                    <FileText size={14} className="mr-1" /> Fazer ficha
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NfeBagyDialog
        pedidoIds={nfeIds}
        portalIdPorBagy={Object.fromEntries((nfeIds ?? []).map(id => { const pd = pedidos.find(x => x.id === id); return [id, pd ? getPrimaryPortalId(pd) : null]; }))}
        onRemainingChange={(ids) => setSelected(new Set(ids))}
        onClose={() => { setNfeIds(null); load(); }}
      />

      <BagyFichaDialog
        open={!!fichaQueue}
        queue={fichaQueue || []}
        onClose={() => setFichaQueue(null)}
        onFinished={({ saved: ok, skipped: sk }) => {
          if (ok > 0 && sk === 0) toast.success(`${ok} ficha(s) gerada(s).`);
          else if (ok === 0 && sk > 0) toast.info(`${sk} item(ns) pulado(s).`);
          else if (ok + sk > 0) toast.success(`${ok} gerada(s) · ${sk} pulada(s).`);
          // Empurra status para Bagy imediatamente (em produção / separado)
          setTimeout(() => {
            supabase.functions.invoke('bagy-queue-drain').catch(() => {}).finally(() => load());
          }, 800);
          load();
        }}
      />
    </div>
  );
};

export default RanchoChiquePedidosPage;
