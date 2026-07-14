import { useAuth, PRODUCTION_STATUSES, PRODUCTION_STATUSES_USER, EXTRAS_STATUSES, BELT_STATUSES, orderBarcodeValue, matchOrderBarcode, type Order } from '@/contexts/AuthContext';
import { useOrders, fetchOrderByScan, fetchVendedores, fetchAllFilteredOrders, fetchAllFilteredOrderIds, fetchOrdersByIds, type OrderFilters } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder, getOrderFinalValue } from '@/lib/order-logic';
import { EXTRA_PRODUCTS, EXTRA_PRODUCT_NAME_MAP } from '@/lib/extrasConfig';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Filter, FileText, Download, Printer, CheckCircle, StickyNote, Pencil, Trash2, RefreshCw, ScanBarcode, X, Loader2, MessageCircle, SkipForward, Package } from 'lucide-react';
import CompletarSkusBulkPanel from '@/components/estoque/CompletarSkusBulkPanel';
import { criarEstoqueEmMassa } from '@/lib/criarEstoqueBulk';
import { buildTrackingMessage, buildWhatsappUrl, getPublicTrackingUrl } from '@/lib/whatsappSend';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SpecializedReports from '@/components/SpecializedReports';
import { useConfirmPrint } from '@/components/common/ConfirmPrintDialog';
import { ReportConfirmSummary, fmtSet, fmtPeriodo } from '@/components/common/ReportConfirmSummary';
import OrderCard from '@/components/OrderCard';
import { useAjustesPendentesIds } from '@/hooks/useAjustesPendentesIds';
import { generateReportPDF, generateProductionSheetPDF } from '@/lib/pdfGenerators';
import { requiresJustification, type JustificationKind } from '@/lib/statusRegression';
import { isTransitionAllowed } from '@/lib/statusTransitions';
import { BulkBlockedDialog, type BlockedItem } from '@/components/BulkBlockedDialog';
import { LoadingValue } from '@/components/ui/LoadingValue';
import { useCanSeeValues } from '@/hooks/useCanSeeValues';

import { getOrderDeadlineInfo, FINAL_STAGES, isAlertOrder } from '@/lib/orderDeadline';
import HolidayNoticeBanner from '@/components/HolidayNoticeBanner';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 50;

function PaginationBar({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const [input, setInput] = useState(String(page));
  useEffect(() => { setInput(String(page)); }, [page]);

  const go = () => {
    const n = parseInt(input, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages && n !== page) {
      onChange(n);
    } else {
      setInput(String(page));
    }
  };

  const btn = "px-3 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
      <button onClick={() => onChange(1)} disabled={page <= 1} className={btn} title="Primeira página">« Primeira</button>
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={btn}>‹ Anterior</button>
      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        Página
        <input
          type="number"
          min={1}
          max={totalPages}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); go(); } }}
          onBlur={go}
          className="w-16 px-2 py-1 rounded-md border-2 border-primary/50 text-center font-bold text-foreground bg-background focus:outline-none focus:border-primary"
        />
        de {totalPages}
      </span>
      <button onClick={go} className={btn}>Ir</button>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className={btn}>Próxima ›</button>
      <button onClick={() => onChange(totalPages)} disabled={page >= totalPages} className={btn} title="Última página">Última »</button>
    </div>
  );
}


const formatDateBR = (date: string, time?: string) => {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}${time ? ` — ${time}` : ''}`;
};

const ReportsPage = () => {
  const { isLoggedIn, isAdmin, isFernanda, user, deleteOrder, deleteOrderBatch, updateOrderStatus, loading: authLoading } = useAuth();
  const canSeeValues = useCanSeeValues();
  const ajustesPendentesIds = useAjustesPendentesIds();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultProduto = new Set(['bota', 'cinto', ...EXTRA_PRODUCTS.map(p => p.id)]);

  // Initialize filter states from URL params
  const [filterDate, setFilterDate] = useState(() => searchParams.get('de') || '');
  const [filterDateEnd, setFilterDateEnd] = useState(() => searchParams.get('ate') || '');
  const [filterStatus, setFilterStatus] = useState<Set<string>>(() => {
    const v = searchParams.get('status');
    return v ? new Set(v.split(',')) : new Set<string>();
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [filterVendedor, setFilterVendedor] = useState<Set<string>>(() => {
    const v = searchParams.get('vendedor');
    return v ? new Set(v.split(',')) : new Set<string>();
  });
  const [filterProduto, setFilterProduto] = useState<Set<string>>(() => {
    const v = searchParams.get('produtos');
    return v ? new Set(v.split(',')) : new Set(defaultProduto);
  });
  const [mudouStatus, setMudouStatus] = useState<Set<string>>(() => {
    const v = searchParams.get('mudou_status');
    return v ? new Set(v.split(',').filter(Boolean)) : new Set<string>();
  });
  const [mudouDe, setMudouDe] = useState<string>(() => searchParams.get('mudou_de') || '');
  const [mudouAte, setMudouAte] = useState<string>(() => searchParams.get('mudou_ate') || '');
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(() => searchParams.get('atrasados') === '1');
  const [filterConferido, setFilterConferido] = useState<'todos' | 'sim' | 'nao'>(() => {
    const v = searchParams.get('conferido');
    return v === 'sim' || v === 'nao' ? v : 'todos';
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scannedOrdersMap, setScannedOrdersMap] = useState<Map<string, import('@/contexts/AuthContext').Order>>(new Map());

  // Bulk progress modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkConferidoDialog, setShowBulkConferidoDialog] = useState(false);
  const [bulkConferidoLoading, setBulkConferidoLoading] = useState(false);
  // Bulk criar estoque
  const [showCompletarSkusPanel, setShowCompletarSkusPanel] = useState<null | { faltando: Order[]; prontos: Order[] }>(null);
  const [bulkEstoqueLoading, setBulkEstoqueLoading] = useState(false);
  // Bulk WhatsApp queue
  const [whatsappQueue, setWhatsappQueue] = useState<Order[]>([]);
  const [whatsappIndex, setWhatsappIndex] = useState(0);
  const [whatsappSent, setWhatsappSent] = useState(0);
  const [whatsappSkipped, setWhatsappSkipped] = useState(0);
  const [whatsappLojaCache, setWhatsappLojaCache] = useState<Record<string, { nomeLoja: string; telefoneLoja: string }>>({});
  const showWhatsappQueue = whatsappQueue.length > 0;
  const [selectedProgress, setSelectedProgress] = useState('');
  const [progressObservacao, setProgressObservacao] = useState('');

  // Justification confirmation modal (regressão / pausa / cancelamento)
  const [showRegressionConfirmModal, setShowRegressionConfirmModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [showRegressionModal, setShowRegressionModal] = useState(false);
  const [regressionItems, setRegressionItems] = useState<{ id: string; numero: string; current: string; next: string; desdeData: string; desdeHora: string; kind: JustificationKind }[]>([]);
  const [normalIds, setNormalIds] = useState<string[]>([]);
  const [regressionReason, setRegressionReason] = useState('');
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean; destino: string; blocked: BlockedItem[]; movedCount: number }>({ open: false, destino: '', blocked: [], movedCount: 0 });

  // Barcode scanner
  const [showScanner, setShowScanner] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanFilterId, setScanFilterId] = useState<string | null>(null);
  const [lastScannedNumero, setLastScannedNumero] = useState<string | null>(null);
  const [showSelectedList, setShowSelectedList] = useState(false);

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  const playErrorBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 400;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  // Initialize appliedFilters from URL params too
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(() => {
    const ms = searchParams.get('mudou_status');
    const cf = searchParams.get('conferido');
    return {
      searchQuery: searchParams.get('q') || '',
      filterDate: searchParams.get('de') || '',
      filterDateEnd: searchParams.get('ate') || '',
      filterStatus: new Set(filterStatus),
      filterVendedor: new Set(filterVendedor),
      filterProduto: new Set(searchParams.get('produtos')?.split(',') ?? [...defaultProduto]),
      mudouParaStatus: ms ? new Set(ms.split(',').filter(Boolean)) : undefined,
      mudouParaStatusDe: searchParams.get('mudou_de') || undefined,
      mudouParaStatusAte: searchParams.get('mudou_ate') || searchParams.get('mudou_de') || undefined,
      filterConferido: cf === 'sim' || cf === 'nao' ? cf : undefined,
    };
  });

  const syncSearchParams = useCallback((filters: { searchQuery: string; filterDate: string; filterDateEnd: string; filterStatus: Set<string>; filterVendedor: Set<string>; filterProduto: Set<string>; mudouStatus?: Set<string>; mudouDe?: string; mudouAte?: string; onlyOverdue?: boolean; conferido?: 'todos' | 'sim' | 'nao' }) => {
    const params = new URLSearchParams();
    if (filters.searchQuery) params.set('q', filters.searchQuery);
    if (filters.filterDate) params.set('de', filters.filterDate);
    if (filters.filterDateEnd) params.set('ate', filters.filterDateEnd);
    if (filters.filterStatus.size > 0) params.set('status', [...filters.filterStatus].join(','));
    if (filters.filterVendedor.size > 0) params.set('vendedor', [...filters.filterVendedor].join(','));
    const isDefaultProduto = filters.filterProduto.size === defaultProduto.size &&
      [...defaultProduto].every(v => filters.filterProduto.has(v));
    if (!isDefaultProduto && filters.filterProduto.size > 0) {
      params.set('produtos', [...filters.filterProduto].join(','));
    }
    if (filters.mudouStatus && filters.mudouStatus.size > 0) params.set('mudou_status', [...filters.mudouStatus].join(','));
    if (filters.mudouDe) params.set('mudou_de', filters.mudouDe);
    if (filters.mudouAte) params.set('mudou_ate', filters.mudouAte);
    if (filters.onlyOverdue) params.set('atrasados', '1');
    if (filters.conferido && filters.conferido !== 'todos') params.set('conferido', filters.conferido);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const applyFilters = () => {
    setScanFilterId(null);
    setPage(1);
    // valida intervalo "mudou para status": precisa pelo menos de uma data se ao menos um status selecionado
    let mDe = mudouDe;
    let mAte = mudouAte;
    const mudouAtivo = mudouStatus.size > 0;
    if (mudouAtivo) {
      if (!mDe && !mAte) {
        toast.error('Informe a data em que o pedido mudou para o(s) status selecionado(s).');
        return;
      }
      if (!mDe) mDe = mAte;
      if (!mAte) mAte = mDe;
    }
    const newFilters: OrderFilters & { mudouStatus: Set<string>; mudouDe: string; mudouAte: string; onlyOverdue: boolean; conferido: 'todos' | 'sim' | 'nao' } = {
      searchQuery,
      filterDate,
      filterDateEnd,
      filterStatus: new Set(filterStatus),
      filterVendedor: new Set(filterVendedor),
      filterProduto: new Set(filterProduto),
      mudouParaStatus: mudouAtivo ? new Set(mudouStatus) : undefined,
      mudouParaStatusDe: mudouAtivo ? mDe : undefined,
      mudouParaStatusAte: mudouAtivo ? mAte : undefined,
      filterConferido: filterConferido === 'todos' ? undefined : filterConferido,
      mudouStatus: new Set(mudouStatus), mudouDe: mDe, mudouAte: mAte,
      onlyOverdue,
      conferido: filterConferido,
    };
    setAppliedFilters(newFilters);
    syncSearchParams(newFilters as any);
  };

  const toggleProdutoFilter = (val: string) => {
    setFilterProduto(prev => {
      const next = new Set(prev);
      if (next.has(val)) { if (next.size > 1) next.delete(val); } else { next.add(val); }
      return next;
    });
  };

  // Server-side paginated orders
  const [page, setPage] = useState(1);
  const { orders: serverOrders, count: serverCount, totalPages, loading: ordersLoading, totalValue, totalProdutos, refetch: refetchOrders, pageSize: PAGE_SIZE_ACTUAL } = useOrders(appliedFilters, page, isLoggedIn);

  // Quando "Apenas atrasados" está ativo, busca todos os pedidos não-finais
  // (atrasados são tipicamente os mais antigos e não cabem na página atual de 50).
  const [overdueOrders, setOverdueOrders] = useState<Order[]>([]);
  const [overdueLoading, setOverdueLoading] = useState(false);
  useEffect(() => {
    if (!onlyOverdue) { setOverdueOrders([]); return; }
    let cancelled = false;
    (async () => {
      setOverdueLoading(true);
      const f = appliedFilters as any;

      // Status: se vier filtro de status mas todos forem etapas finais, não há atrasados.
      let statusList: string[] | null = null;
      if (f.filterStatus && f.filterStatus.size > 0) {
        statusList = [...f.filterStatus].filter((s: string) => !FINAL_STAGES.includes(s));
        if (statusList.length === 0) {
          if (!cancelled) { setOverdueOrders([]); setOverdueLoading(false); }
          return;
        }
      }

      // Busca em lotes para não perder pedidos antigos (atrasados costumam ser os mais antigos).
      const BATCH = 1000;
      let offset = 0;
      const all: Order[] = [];
      while (true) {
        let q = supabase.from('orders').select('*')
          .not('status', 'in', `(${FINAL_STAGES.join(',')})`)
          .order('data_criacao', { ascending: true })
          .order('hora_criacao', { ascending: true })
          .range(offset, offset + BATCH - 1);

        if (f.filterDate) q = q.gte('data_criacao', f.filterDate);
        if (f.filterDateEnd) q = q.lte('data_criacao', f.filterDateEnd);
        if (statusList && statusList.length > 0) q = q.in('status', statusList);

        if (f.filterVendedor && f.filterVendedor.size > 0) {
          const vendedores = [...f.filterVendedor] as string[];
          const orClauses = vendedores.map(v => `vendedor.eq.${v}`);
          vendedores.forEach(v => {
            orClauses.push(`and(vendedor.eq.Juliana Cristina Ribeiro,cliente.eq.${v})`);
          });
          q = q.or(orClauses.join(','));
        }

        if (f.filterProduto && f.filterProduto.size > 0) {
          const produtos = [...f.filterProduto] as string[];
          const hasBota = produtos.includes('bota');
          const outros = produtos.filter(p => p !== 'bota');
          if (hasBota && outros.length > 0) {
            q = q.or(`tipo_extra.is.null,tipo_extra.in.(${outros.join(',')})`);
          } else if (hasBota) {
            q = q.is('tipo_extra', null);
          } else if (outros.length > 0) {
            q = q.in('tipo_extra', outros);
          }
        }

        if (f.searchQuery) {
          const s = String(f.searchQuery).replace(/%/g, '\\%');
          q = q.or(`numero.ilike.%${s}%,cliente.ilike.%${s}%`);
        }

        const { data, error } = await q;
        if (cancelled) return;
        if (error) { console.error('overdue fetch error:', error); break; }
        const rows = data || [];
        all.push(...rows.map(dbRowToOrder) as Order[]);
        if (rows.length < BATCH) break;
        offset += BATCH;
      }

      if (cancelled) return;
      // Filtra atrasados de verdade (exclui Estoque automaticamente via getOrderDeadlineInfo).
      setOverdueOrders(all.filter(o => getOrderDeadlineInfo(o as any).isOverdue));
      setOverdueLoading(false);
    })();
    return () => { cancelled = true; };
  }, [onlyOverdue, appliedFilters]);

  const visibleOrders = useMemo(() => {
    if (onlyOverdue) {
      return scanFilterId ? overdueOrders.filter(o => o.id === scanFilterId) : overdueOrders;
    }
    return scanFilterId ? serverOrders.filter(o => o.id === scanFilterId) : serverOrders;
  }, [serverOrders, scanFilterId, onlyOverdue, overdueOrders]);

  // Quando "Apenas atrasados" está ativo, recalcula totais a partir da lista visível
  // (mesma fórmula da RPC get_orders_totals).
  const { displayTotalProdutos, displayTotalValue } = useMemo(() => {
    if (!onlyOverdue) {
      return { displayTotalProdutos: totalProdutos, displayTotalValue: totalValue };
    }
    let prod = 0;
    let val = 0;
    for (const o of visibleOrders as any[]) {
      const qtd = Number(o.quantidade) || 1;
      const botas = o?.extraDetalhes?.botas;
      if (o?.tipoExtra === 'bota_pronta_entrega' && Array.isArray(botas) && botas.length > 0) {
        prod += botas.length;
      } else {
        prod += qtd;
      }
      val += getOrderFinalValue(o);
    }
    return { displayTotalProdutos: prod, displayTotalValue: val };
  }, [onlyOverdue, visibleOrders, totalProdutos, totalValue]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const formatCurrency = useCallback((v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const statuses = isAdmin ? PRODUCTION_STATUSES : PRODUCTION_STATUSES_USER;
  // "Produzindo" é exclusivo de Extras — incluir como opção do filtro.
  const allStatuses = Array.from(new Set([...statuses, 'Produzindo']));

  // Fetch vendedores list from DB
  const [allVendedores, setAllVendedores] = useState<string[]>([]);
  useEffect(() => {
    if (isAdmin) { fetchVendedores().then(setAllVendedores); }
  }, [isAdmin]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const [selectAllLoading, setSelectAllLoading] = useState(false);
  const toggleSelectAll = async () => {
    // Se já temos tudo do filtro selecionado, limpa.
    if (serverCount > 0 && selectedIds.size >= serverCount) {
      setSelectedIds(new Set());
      return;
    }
    setSelectAllLoading(true);
    try {
      const ids = await fetchAllFilteredOrderIds(appliedFilters);
      setSelectedIds(new Set(ids));
    } finally {
      setSelectAllLoading(false);
    }
  };

  // Memoize merged map separately so it only rebuilds when source data changes (not on every toggle)
  const mergedOrdersMap = useMemo(() => {
    const m = new Map(serverOrders.map(o => [o.id, o] as const));
    scannedOrdersMap.forEach((o, id) => { if (!m.has(id)) m.set(id, o); });
    return m;
  }, [serverOrders, scannedOrdersMap]);

  const ordersToExport = useMemo(() => {
    if (selectedIds.size === 0) return serverOrders;
    const out: import('@/contexts/AuthContext').Order[] = [];
    selectedIds.forEach(id => { const o = mergedOrdersMap.get(id); if (o) out.push(o); });
    return out;
  }, [selectedIds, serverOrders, mergedOrdersMap]);

  const selectedScannedList = useMemo(
    () => [...scannedOrdersMap.values()].filter(o => selectedIds.has(o.id)),
    [scannedOrdersMap, selectedIds]
  );

  // Pedidos de vendedor "Estoque" atualmente em "Baixa Estoque" — habilitam criar produto em massa via scanner
  const estoqueBaixaSelecionados = useMemo(
    () => selectedScannedList.filter(o => o.vendedor === 'Estoque' && o.status === 'Baixa Estoque'),
    [selectedScannedList],
  );
  const [bulkCriandoEstoque, setBulkCriandoEstoque] = useState(false);

  const handleBulkCriarProduto = async () => {
    const alvo = estoqueBaixaSelecionados;
    if (alvo.length === 0) return;
    if (!window.confirm(`Criar produto no estoque para ${alvo.length} pedido(s) escaneado(s)?`)) return;
    setBulkCriandoEstoque(true);
    const toastId = toast.loading(`Criando produtos… 0/${alvo.length}`);
    try {
      const results = await criarEstoqueEmMassa(
        alvo.map(o => ({ id: o.id, numero: o.numero })),
        (done, total) => toast.loading(`Criando produtos… ${done}/${total}`, { id: toastId }),
      );
      const ok = results.filter(r => r.ok);
      const fail = results.filter(r => !r.ok);
      if (fail.length === 0) {
        toast.success(`${ok.length} produto(s) criado(s) com sucesso.`, { id: toastId });
      } else {
        toast.error(
          `${ok.length} ok, ${fail.length} com erro: ${fail.slice(0, 3).map(f => `${f.numero || f.id} (${f.error})`).join('; ')}${fail.length > 3 ? '…' : ''}`,
          { id: toastId, duration: 8000 },
        );
      }
      // Remove os OK da seleção; mantém falhas para o usuário revisar
      if (ok.length > 0) {
        const okIds = new Set(ok.map(r => r.id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          okIds.forEach(id => next.delete(id));
          return next;
        });
      }
      refetchOrders();
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || e}`, { id: toastId });
    } finally {
      setBulkCriandoEstoque(false);
    }
  };

  const finalizeBulkUpdate = (count: number) => {
    toast.success(`${count} pedido(s) atualizado(s) para "${selectedProgress}".`);
    setShowProgressModal(false);
    setShowRegressionConfirmModal(false);
    setShowRegressionModal(false);
    setSelectedProgress('');
    setProgressObservacao('');
    setRegressionItems([]);
    setNormalIds([]);
    setRegressionReason('');
    setSelectedIds(new Set());
    setScannedOrdersMap(new Map());
    setLastScannedNumero(null);
    setShowSelectedList(false);
    refetchOrders();
  };

  const handleBulkProgressUpdate = async () => {
    if (!selectedProgress) { toast.error('Selecione uma etapa de produção.'); return; }

    // Detecta transições que exigem justificativa (regressão / pausa / cancelamento)
    const regressions: { id: string; numero: string; current: string; next: string; desdeData: string; desdeHora: string; kind: JustificationKind }[] = [];
    const normals: string[] = [];
    selectedIds.forEach(id => {
      const ord = mergedOrdersMap.get(id);
      if (!ord) { normals.push(id); return; }
      const kind = requiresJustification(ord.status, selectedProgress, ord.tipoExtra);
      if (kind) {
        // Procura no histórico a última entrada na etapa atual
        let desdeData = ord.dataCriacao || '';
        let desdeHora = ord.horaCriacao || '';
        const hist = Array.isArray(ord.historico) ? ord.historico : [];
        for (let i = hist.length - 1; i >= 0; i--) {
          const h: any = hist[i];
          if (h && h.local === ord.status) {
            desdeData = h.data || desdeData;
            desdeHora = h.hora || desdeHora;
            break;
          }
        }
        regressions.push({ id, numero: ord.numero, current: ord.status, next: selectedProgress, desdeData, desdeHora, kind });
      } else {
        normals.push(id);
      }
    });

    // Aplica imediatamente os pedidos sem trava (não esperam o modal de justificativa)
    const baseObs = progressObservacao.trim();
    const blockedItems: BlockedItem[] = [];
    if (normals.length > 0) {
      const appliedIds: string[] = [];
      setBulkProgress({ current: 0, total: normals.length });
      try {
        for (const id of normals) {
          const ord = mergedOrdersMap.get(id);
          try {
            await updateOrderStatus(id, selectedProgress, baseObs || undefined);
            appliedIds.push(id);
          } catch {
            if (ord) blockedItems.push({ numero: ord.numero, statusAtual: ord.status });
          }
          setBulkProgress(p => p ? { ...p, current: p.current + 1 } : p);
        }
      } finally {
        if (regressions.length === 0) setBulkProgress(null);
      }
      // Remove os normais já aplicados da seleção, para que continuem visíveis apenas os travados
      setSelectedIds(prev => {
        const next = new Set(prev);
        appliedIds.forEach(id => next.delete(id));
        return next;
      });
      if (regressions.length === 0) {
        if (blockedItems.length > 0) {
          setBlockedDialog({ open: true, destino: selectedProgress, blocked: blockedItems, movedCount: appliedIds.length });
        } else if (appliedIds.length > 0) {
          toast.success(`${appliedIds.length} pedido(s) atualizado(s) para "${selectedProgress}".`);
        }
      } else if (appliedIds.length > 0) {
        toast.success(`${appliedIds.length} pedido(s) sem trava já atualizados. Resolva os ${regressions.length} travado(s).`);
        if (blockedItems.length > 0) {
          setBlockedDialog({ open: true, destino: selectedProgress, blocked: blockedItems, movedCount: appliedIds.length });
        }
      }
    }

    if (regressions.length > 0) {
      setRegressionItems(regressions);
      setNormalIds([]); // já foram aplicados — não reaplicar
      setRegressionReason('');
      setShowRegressionConfirmModal(true);
      return;
    }

    finalizeBulkUpdate(normals.length - blockedItems.length);
  };

  const handleConfirmRegression = async () => {
    const motivo = regressionReason.trim();
    if (motivo.length < 5) {
      toast.error('Justifique com pelo menos 5 caracteres.');
      return;
    }
    const baseObs = progressObservacao.trim();
    const prefixOf = (k: JustificationKind) =>
      k === 'cancel' ? '[CANCELAMENTO]' : k === 'pause' ? '[PAUSA]' : '[RETROCESSO]';

    let okCount = 0;
    const blockedItems: BlockedItem[] = [];
    setBulkProgress({ current: 0, total: regressionItems.length });
    try {
      for (const item of regressionItems) {
        const obs = `${prefixOf(item.kind)} ${motivo}${baseObs ? ` — ${baseObs}` : ''}`;
        try {
          await updateOrderStatus(item.id, selectedProgress, obs);
          okCount++;
        } catch {
          blockedItems.push({ numero: item.numero, statusAtual: item.current });
        }
        setBulkProgress(p => p ? { ...p, current: p.current + 1 } : p);
      }
    } finally {
      setBulkProgress(null);
    }
    if (blockedItems.length > 0) {
      setBlockedDialog({ open: true, destino: selectedProgress, blocked: blockedItems, movedCount: okCount });
    }
    finalizeBulkUpdate(okCount);
  };


  // Barcode scan handler — direct DB query (continuous, queued)
  const scanQueueRef = useRef<string[]>([]);
  const scanProcessingRef = useRef(false);

  const processScan = useCallback(async (trimmed: string) => {
    try {
      const match = await fetchOrderByScan(trimmed);
      if (match) {
        if (isAdmin) {
          let alreadySelected = false;
          setSelectedIds(prev => {
            if (prev.has(match.id)) {
              alreadySelected = true;
              return prev;
            }
            const next = new Set(prev);
            next.add(match.id);
            return next;
          });
          if (alreadySelected) {
            playErrorBeep();
            toast.warning(`Pedido ${match.numero} já está selecionado`);
          } else {
            setLastScannedNumero(match.numero);
            playBeep();
          }
          // Accumulate scanned order data so "Visualizar pedidos" always has it
          setScannedOrdersMap(prev => {
            if (prev.has(match.id)) return prev;
            const next = new Map(prev);
            next.set(match.id, match);
            return next;
          });
        } else {
          navigate(`/pedido/${match.id}${location.search}`);
          toast.success(`Pedido ${match.numero} encontrado.`);
        }
      } else {
        playErrorBeep();
        toast.error(`Pedido não encontrado para código: ${trimmed}`);
      }
    } catch (err) {
      console.error('Scan error:', err);
      playErrorBeep();
    }
  }, [isAdmin, navigate, playBeep, playErrorBeep]);

  const refocusScanInput = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scanInputRef.current;
      if (el && document.activeElement !== el) el.focus();
    });
  }, []);

  const handleScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    // Clear and refocus IMMEDIATELY so the next scan from the gun lands here
    setScanValue('');
    refocusScanInput();
    if (!trimmed) return;

    // Queue rapid scans instead of dropping them
    if (scanProcessingRef.current) {
      scanQueueRef.current.push(trimmed);
      return;
    }

    scanProcessingRef.current = true;
    setScanning(true);
    try {
      await processScan(trimmed);
      // Drain any scans that arrived while we were busy
      while (scanQueueRef.current.length > 0) {
        const next = scanQueueRef.current.shift()!;
        await processScan(next);
      }
    } finally {
      scanProcessingRef.current = false;
      setScanning(false);
      // Always return focus to the input so the next scan is captured
      refocusScanInput();
    }
  }, [processScan, refocusScanInput]);

  // Keep focus on the scan input whenever the panel is open and state changes
  useEffect(() => {
    if (!showScanner) return;
    refocusScanInput();
  }, [showScanner, scanning, lastScannedNumero, selectedIds.size, showSelectedList, refocusScanInput]);

  // Global keystroke recovery: if the scanner panel is open and a printable key
  // arrives while focus is somewhere else (no input/textarea/button focused),
  // redirect focus to the scan input so we don't lose the first character of the
  // next barcode burst.
  useEffect(() => {
    if (!showScanner) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const el = scanInputRef.current;
      if (!el) return;
      if (document.activeElement === el) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      // Don't steal focus from other text fields, textareas, selects or open dialogs
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      // Only react to printable single-character keys (ignore modifiers, arrows, etc.)
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      el.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [showScanner]);

  const { askPrint, dialog: confirmPrintDialog } = useConfirmPrint();

  // Quando não há seleção manual, busca TODOS os pedidos do filtro (não só a página atual)
  // para que o PDF inclua tudo, e não apenas os 50 visíveis. Quando há seleção, usa a seleção.
  const resolveOrdersForExport = useCallback(async (): Promise<import('@/contexts/AuthContext').Order[]> => {
    if (selectedIds.size > 0) return ordersToExport;
    const expected = serverCount || 0;
    if (expected <= serverOrders.length) return serverOrders;
    const tid = toast.loading(`Carregando ${expected.toLocaleString('pt-BR')} pedidos…`);
    try {
      const all = await fetchAllFilteredOrders(appliedFilters);
      toast.success(`${all.length.toLocaleString('pt-BR')} pedidos carregados`, { id: tid });
      return all;
    } catch (e: any) {
      toast.error(`Erro ao carregar pedidos: ${e?.message || e}`, { id: tid });
      return serverOrders;
    }
  }, [selectedIds, ordersToExport, serverCount, serverOrders, appliedFilters]);

  const handleGenerateReportPDF = useCallback(async () => {
    const list = await resolveOrdersForExport();
    return generateReportPDF(list, { userName: user?.nomeCompleto || '' });
  }, [resolveOrdersForExport, user]);
  const handleGenerateProductionSheetPDF = useCallback(async () => {
    const list = await resolveOrdersForExport();
    await generateProductionSheetPDF(list, { userName: user?.nomeCompleto || '' });
  }, [resolveOrdersForExport, user]);

  const askGenerateReportPDF = useCallback(() => {
    const qtd = selectedIds.size > 0 ? ordersToExport.length : (serverCount || ordersToExport.length);
    askPrint({
      title: 'Gerar Relatório por Filtros?',
      description: (
        <ReportConfirmSummary
          intro="Será gerado um PDF respeitando exatamente os filtros aplicados nesta tela."
          destaques={[
            { label: 'Pedidos', value: qtd.toLocaleString('pt-BR') },
            { label: 'Produtos', value: Number(displayTotalProdutos || 0).toLocaleString('pt-BR') },
            { label: 'Valor total', value: formatCurrency(displayTotalValue) },
          ]}
          linhas={[
            { label: 'Vendedor', value: fmtSet(filterVendedor) },
            { label: 'Status', value: fmtSet(filterStatus) },
            { label: 'Período', value: fmtPeriodo(filterDate, filterDateEnd) },
            { label: 'Busca', value: searchQuery || '—' },
            { label: 'Apenas atrasados', value: onlyOverdue ? 'Sim' : 'Não' },
          ]}
        />
      ),
      confirmLabel: 'Gerar PDF',
      run: () => { void handleGenerateReportPDF(); },
    });
  }, [askPrint, selectedIds.size, ordersToExport.length, serverCount, handleGenerateReportPDF, displayTotalValue, displayTotalProdutos, filterVendedor, filterStatus, filterDate, filterDateEnd, searchQuery, onlyOverdue, formatCurrency]);

  const askGenerateProductionSheetPDF = useCallback(() => {
    const qtd = selectedIds.size > 0 ? ordersToExport.length : (serverCount || ordersToExport.length);
    askPrint({
      title: 'Imprimir Fichas de Produção?',
      description: (
        <ReportConfirmSummary
          intro="Cada pedido vira uma ficha A5 para a fábrica."
          destaque={{ label: 'Fichas a imprimir', value: `${qtd} ficha${qtd !== 1 ? 's' : ''}` }}
          linhas={[
            { label: 'Vendedor', value: fmtSet(filterVendedor) },
            { label: 'Status', value: fmtSet(filterStatus) },
            { label: 'Período', value: fmtPeriodo(filterDate, filterDateEnd) },
          ]}
        />
      ),
      confirmLabel: 'Imprimir',
      run: () => { void handleGenerateProductionSheetPDF(); },
    });
  }, [askPrint, selectedIds.size, ordersToExport.length, serverCount, handleGenerateProductionSheetPDF, filterVendedor, filterStatus, filterDate, filterDateEnd]);

  const [showReportOptions, setShowReportOptions] = useState(false);
  const [showSpecializedReports, setShowSpecializedReports] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteOrder(id);
    setConfirmDeleteId(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast.success('Pedido excluído com sucesso!');
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-display font-bold mb-2">Faça login para ver relatórios</h2>
          <button onClick={() => navigate('/login')} className="orange-gradient text-primary-foreground px-6 py-2 rounded-lg font-bold">LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <h1 className="text-3xl font-display font-bold">MEUS PEDIDOS</h1>
          <button onClick={() => navigate('/rascunhos')} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors">
            <StickyNote size={16} /> Rascunhos
          </button>
          <button onClick={() => navigate('/pedido')} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors">
            <FileText size={16} /> Fazer pedido
          </button>
          {/* Barcode scanner for all users */}
          <button onClick={() => { setShowScanner(v => !v); if (showScanner) setScanFilterId(null); }} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors">
            <ScanBarcode size={16} /> {showScanner ? 'Fechar Scanner' : 'Escanear Código'}
          </button>
          {/* Admin bulk progress button */}
          {isAdmin && selectedIds.size > 0 && !(showScanner && selectedIds.size > 0) && (
            <>
              <button onClick={() => setShowProgressModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity ml-auto">
                <RefreshCw size={16} /> Mudar progresso de produção
              </button>
              {user?.role === 'admin_master' && (
                <button onClick={() => setShowBulkConferidoDialog(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors">
                  <CheckCircle size={16} /> Conferir selecionados ({selectedIds.size})
                </button>
              )}
              {user?.role === 'admin_master' && selectedIds.size > 1 && (
                <button onClick={() => setShowBulkDeleteDialog(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:opacity-90 transition-opacity">
                  <Trash2 size={16} /> Excluir selecionados ({selectedIds.size})
                </button>
              )}
              {(() => {
                const selOrders = serverOrders.filter(o =>
                  selectedIds.has(o.id) &&
                  o.vendedor === 'Estoque' &&
                  o.status === 'Baixa Estoque' &&
                  !o.estoqueBaixado,
                );
                if (selOrders.length === 0) return null;
                const faltando = selOrders.filter(o => !o.skuEstoque?.trim() || !o.nomeProdutoEstoque?.trim());
                const prontos = selOrders.filter(o => o.skuEstoque?.trim() && o.nomeProdutoEstoque?.trim());
                const onClick = async () => {
                  if (faltando.length > 0) {
                    setShowCompletarSkusPanel({ faltando, prontos });
                    return;
                  }
                  // Tudo pronto: cria direto
                  setBulkEstoqueLoading(true);
                  try {
                    const res = await criarEstoqueEmMassa(
                      prontos.map(p => ({ id: p.id, numero: p.numero })),
                      (done, total) => {
                        if (done === total) toast.success(`Estoque criado: ${done}/${total}`);
                      },
                    );
                    const ok = res.filter(r => r.ok).length;
                    const fail = res.length - ok;
                    if (fail === 0) toast.success(`Estoque criado para ${ok} pedido(s).`);
                    else toast.warning(`${ok} criados, ${fail} com erro: ${res.filter(r => !r.ok).slice(0, 3).map(r => r.error).join(' | ')}`);
                    refetchOrders();
                    setSelectedIds(new Set());
                  } finally {
                    setBulkEstoqueLoading(false);
                  }
                };
                return (
                  <button
                    onClick={onClick}
                    disabled={bulkEstoqueLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors disabled:opacity-60"
                    title="Criar produtos no estoque a partir dos pedidos selecionados"
                  >
                    {bulkEstoqueLoading ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                    Criar estoque ({selOrders.length})
                  </button>
                );
              })()}
            </>
          )}
          {/* Bulk WhatsApp — disponível para todos (admin e vendedores) */}
          {selectedIds.size > 0 && !showScanner && (() => {
            const ordersWithWa = serverOrders.filter(o => selectedIds.has(o.id) && (o as any).clienteWhatsapp);
            if (ordersWithWa.length === 0) return null;
            return (
              <button
                onClick={async () => {
                  // Pré-carrega loja info dos vendedores únicos
                  const vendedores = Array.from(new Set(ordersWithWa.map(o => o.vendedor)));
                  const cache: Record<string, { nomeLoja: string; telefoneLoja: string }> = {};
                  for (const v of vendedores) {
                    if (user?.nomeCompleto === v) {
                      cache[v] = { nomeLoja: user.nomeLoja || '', telefoneLoja: user.telefoneLoja || '' };
                    } else {
                      const { data } = await supabase
                        .from('profiles').select('nome_loja, telefone_loja').eq('nome_completo', v).maybeSingle();
                      cache[v] = { nomeLoja: (data as any)?.nome_loja || '', telefoneLoja: (data as any)?.telefone_loja || '' };
                    }
                  }
                  setWhatsappLojaCache(cache);
                  setWhatsappQueue(ordersWithWa);
                  setWhatsappIndex(0);
                  setWhatsappSent(0);
                  setWhatsappSkipped(0);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle size={16} /> Enviar WhatsApp ({ordersWithWa.length})
              </button>
            );
          })()}
        </div>

        <HolidayNoticeBanner />

        {/* Barcode scanner for all users — single persistent input to keep focus across scans */}
        {showScanner && (() => {
          const adminMode = isAdmin;
          const hasSelection = adminMode && selectedIds.size > 0;
          const stickyBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            // Only release focus if user explicitly tabbed/clicked into another text-entry field.
            // Buttons, links, divs, etc. should NOT steal focus from the scanner.
            const next = e.relatedTarget as HTMLElement | null;
            const tag = next?.tagName?.toLowerCase();
            const isTextEntry = tag === 'input' || tag === 'textarea' || tag === 'select';
            if (isTextEntry && next !== scanInputRef.current) return;
            // refocus on next frame to survive DOM updates
            requestAnimationFrame(() => {
              const el = scanInputRef.current;
              if (el && document.activeElement !== el) el.focus();
            });
          };
          const inputEl = (
            <input
              ref={scanInputRef}
              type="text"
              value={scanValue}
              onChange={e => setScanValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScan(scanValue);
                }
              }}
              onBlur={stickyBlur}
              placeholder={scanning ? 'Buscando... pode escanear o próximo' : 'Escaneie o código de barras aqui...'}
              className={hasSelection
                ? 'flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 text-base border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none placeholder:text-gray-500'
                : 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none'}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          );

          return (
            <div className={hasSelection
              ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/60'
              : 'bg-card rounded-xl p-4 western-shadow mb-4'}>
              <div className={hasSelection
                ? 'bg-gray-900 text-white p-8 rounded-2xl shadow-2xl border-2 border-green-500 w-full max-w-lg mx-4'
                : ''}>
                {hasSelection && lastScannedNumero && (
                  <div className="mb-4 text-center">
                    <p className="text-sm text-gray-400 uppercase font-semibold mb-1">Último pedido lido</p>
                    <p className="text-3xl font-bold text-green-400">✅ {lastScannedNumero}</p>
                  </div>
                )}
                {hasSelection && (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-2xl font-bold">{selectedIds.size} pedido{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-center mb-4">
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setShowSelectedList(v => !v); refocusScanInput(); }}
                        className="text-sm text-green-300 underline hover:text-green-200 transition-colors"
                      >
                        {showSelectedList ? 'Ocultar pedidos' : 'Visualizar pedidos'}
                      </button>
                    </div>
                    {showSelectedList && (
                      <div className="mb-4 max-h-48 overflow-y-auto space-y-1 bg-gray-800 rounded-lg p-3">
                        {selectedScannedList.map(o => (
                          <div key={o.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                            <span className="font-bold text-green-300">{o.numero}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{o.status}</span>
                              <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => { toggleSelect(o.id); refocusScanInput(); }}
                                className="text-red-400 hover:text-red-300 ml-2"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className={hasSelection ? 'flex items-center gap-3 mb-6' : 'flex items-center gap-3'}>
                  {scanning
                    ? <Loader2 size={20} className={hasSelection ? 'text-green-400 flex-shrink-0 animate-spin' : 'text-primary flex-shrink-0 animate-spin'} />
                    : <ScanBarcode size={20} className={hasSelection ? 'text-green-400 flex-shrink-0' : 'text-primary flex-shrink-0'} />}
                  {hasSelection ? inputEl : (
                    <div className="flex-1">
                      <label className="block text-xs font-semibold mb-1">Escaneie ou digite o código de barras do pedido</label>
                      {inputEl}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { handleScan(scanValue); }}
                    className={hasSelection
                      ? 'bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold text-sm transition-colors flex items-center gap-2'
                      : 'orange-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2'}
                  >
                    {scanning && <Loader2 size={14} className="animate-spin" />}
                    Buscar
                  </button>
                </div>

                {hasSelection && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setShowProgressModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      <RefreshCw size={16} /> Mudar progresso de produção
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setSelectedIds(new Set()); setScannedOrdersMap(new Map()); setLastScannedNumero(null); setShowSelectedList(false); setShowScanner(false); setScanFilterId(null); }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Filters */}
        <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }} className="bg-card rounded-xl p-4 western-shadow mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-primary" />
            <span className="text-sm font-bold">Filtros</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-semibold mb-1">Buscar por Nº do Pedido</label>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ex: 7E-2024..." className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Data de Criação (a partir de)</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Data de Criação (até)</label>
              <input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Progresso da Produção</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none min-w-[180px] text-left">
                    {filterStatus.size === 0
                      ? 'Todos'
                      : `${filterStatus.size} selecionado${filterStatus.size > 1 ? 's' : ''}`}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-h-72 overflow-y-auto p-3" align="start">
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => setFilterStatus(new Set(allStatuses))} className="text-xs font-semibold text-primary hover:underline">Todos</button>
                    <button type="button" onClick={() => setFilterStatus(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline">Nenhum</button>
                  </div>
                  <div className="space-y-2">
                    {allStatuses.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filterStatus.has(s)}
                          onCheckedChange={() => {
                            setFilterStatus(prev => {
                              const next = new Set(prev);
                              next.has(s) ? next.delete(s) : next.add(s);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm">{s}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold mb-1">Vendedor</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none min-w-[180px] text-left">
                      {filterVendedor.size === 0
                        ? 'Todos'
                        : `${filterVendedor.size} selecionado${filterVendedor.size > 1 ? 's' : ''}`}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 max-h-72 overflow-y-auto p-3" align="start">
                    <div className="flex gap-2 mb-3">
                      <button type="button" onClick={() => setFilterVendedor(new Set(allVendedores))} className="text-xs font-semibold text-primary hover:underline">Todos</button>
                      <button type="button" onClick={() => setFilterVendedor(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline">Nenhum</button>
                    </div>
                    <div className="space-y-2">
                      {allVendedores.map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={filterVendedor.has(v)}
                            onCheckedChange={() => {
                              setFilterVendedor(prev => {
                                const next = new Set(prev);
                                next.has(v) ? next.delete(v) : next.add(v);
                                return next;
                              });
                            }}
                          />
                          <span className="text-sm">{v}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1">Produto</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none min-w-[180px] text-left">
                    {filterProduto.size === 0
                      ? 'Todos'
                      : `${filterProduto.size} selecionado${filterProduto.size > 1 ? 's' : ''}`}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-h-72 overflow-y-auto p-3" align="start">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        const all = new Set(['bota', 'cinto', ...EXTRA_PRODUCTS.map(p => p.id)]);
                        setFilterProduto(all);
                      }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilterProduto(new Set())}
                      className="text-xs font-semibold text-muted-foreground hover:underline"
                    >
                      Nenhum
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filterProduto.has('bota')}
                        onCheckedChange={() => toggleProdutoFilter('bota')}
                      />
                      <span className="text-sm">Bota</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filterProduto.has('cinto')}
                        onCheckedChange={() => toggleProdutoFilter('cinto')}
                      />
                      <span className="text-sm">Cinto</span>
                    </label>
                    {EXTRA_PRODUCTS.map(ep => (
                      <label key={ep.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filterProduto.has(ep.id)}
                          onCheckedChange={() => toggleProdutoFilter(ep.id)}
                        />
                        <span className="text-sm">{ep.nome}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {/* Filtro: mudou para status em uma data */}
            <div className="basis-full border-t border-border pt-3 mt-1 flex flex-col sm:flex-row gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs font-semibold mb-1">Mudou para o status</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none min-w-[180px] text-left">
                      {mudouStatus.size === 0
                        ? '— (desligado)'
                        : `${mudouStatus.size} selecionado${mudouStatus.size > 1 ? 's' : ''}`}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 max-h-72 overflow-y-auto p-3" align="start">
                    <div className="flex gap-2 mb-3">
                      <button type="button" onClick={() => setMudouStatus(new Set(allStatuses))} className="text-xs font-semibold text-primary hover:underline">Todos</button>
                      <button type="button" onClick={() => setMudouStatus(new Set())} className="text-xs font-semibold text-muted-foreground hover:underline">Nenhum</button>
                    </div>
                    <div className="space-y-2">
                      {allStatuses.map(s => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={mudouStatus.has(s)}
                            onCheckedChange={() => {
                              setMudouStatus(prev => {
                                const next = new Set(prev);
                                next.has(s) ? next.delete(s) : next.add(s);
                                return next;
                              });
                            }}
                          />
                          <span className="text-sm">{s}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Mudou em (de)</label>
                <input
                  type="date"
                  value={mudouDe}
                  onChange={e => setMudouDe(e.target.value)}
                  disabled={mudouStatus.size === 0}
                  className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Mudou em (até)</label>
                <input
                  type="date"
                  value={mudouAte}
                  onChange={e => setMudouAte(e.target.value)}
                  disabled={mudouStatus.size === 0}
                  className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none disabled:opacity-50"
                />
              </div>
              {mudouStatus.size > 0 && (
                <button
                  type="button"
                  onClick={() => { setMudouStatus(new Set()); setMudouDe(''); setMudouAte(''); }}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary underline pb-2"
                >
                  Limpar
                </button>
              )}
              <p className="text-[11px] text-muted-foreground basis-full">
                Mostra pedidos que entraram em qualquer um dos status selecionados dentro do intervalo (ex.: "Entregue" entre 27/04 e 27/04).
              </p>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer select-none">
                <Switch
                  checked={onlyOverdue}
                  onCheckedChange={(checked) => {
                    setOnlyOverdue(checked);
                    // Aplica os filtros atuais imediatamente para que a tela
                    // (lista, totais e contagens) reflita o novo modo sem exigir
                    // um clique extra em FILTRAR.
                    setScanFilterId(null);
                    setPage(1);
                    const mudouAtivo = mudouStatus.size > 0;
                    let mDe = mudouDe;
                    let mAte = mudouAte;
                    if (mudouAtivo) {
                      if (!mDe && !mAte) { /* mantém estado, validação só ao clicar FILTRAR */ }
                      else { if (!mDe) mDe = mAte; if (!mAte) mAte = mDe; }
                    }
                    const newFilters: any = {
                      searchQuery,
                      filterDate,
                      filterDateEnd,
                      filterStatus: new Set(filterStatus),
                      filterVendedor: new Set(filterVendedor),
                      filterProduto: new Set(filterProduto),
                      mudouParaStatus: mudouAtivo ? new Set(mudouStatus) : undefined,
                      mudouParaStatusDe: mudouAtivo ? mDe : undefined,
                      mudouParaStatusAte: mudouAtivo ? mAte : undefined,
                      mudouStatus: new Set(mudouStatus), mudouDe: mDe, mudouAte: mAte,
                      onlyOverdue: checked,
                      filterConferido: filterConferido === 'todos' ? undefined : filterConferido,
                      conferido: filterConferido,
                    };
                    setAppliedFilters(newFilters);
                    syncSearchParams(newFilters);
                  }}
                />
                <span className={`text-xs font-bold uppercase ${onlyOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Apenas atrasados
                </span>
              </label>
              {user?.role === 'admin_master' && (
                <div className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-card">
                  <span className="text-xs font-bold uppercase text-muted-foreground mr-1">Conferido:</span>
                  {(['todos','sim','nao'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFilterConferido(opt)}
                      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                        filterConferido === opt
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {opt === 'todos' ? 'Todos' : opt === 'sim' ? 'Sim' : 'Não'}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={applyFilters} className="orange-gradient text-primary-foreground px-6 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <Filter size={14} /> FILTRAR
              </button>
              <button onClick={() => {
                setSearchQuery('');
                setFilterDate('');
                setFilterDateEnd('');
                setFilterStatus(new Set());
                setFilterVendedor(new Set());
                setFilterProduto(new Set(['bota', 'cinto', ...EXTRA_PRODUCTS.map(p => p.id)]));
                setMudouStatus(new Set());
                setMudouDe('');
                setMudouAte('');
                setOnlyOverdue(false);
                setFilterConferido('todos');
                setAppliedFilters({ searchQuery: '', filterDate: '', filterDateEnd: '', filterStatus: new Set(), filterVendedor: new Set(), filterProduto: new Set(['bota', 'cinto', ...EXTRA_PRODUCTS.map(p => p.id)]) });
                setSelectedIds(new Set());
                setSearchParams({}, { replace: true });
              }} className="border border-border text-muted-foreground px-4 py-2 rounded-lg font-bold text-sm hover:bg-muted transition-colors flex items-center gap-2">
                <RefreshCw size={14} /> LIMPAR
              </button>
            </div>
          </div>
        </form>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 western-shadow">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total de Produtos</p>
            <p className="text-2xl font-bold">
              <LoadingValue loading={onlyOverdue ? overdueLoading : ordersLoading} hasData={visibleOrders.length > 0 || !(onlyOverdue ? overdueLoading : ordersLoading)} size={20}>
                {displayTotalProdutos}
              </LoadingValue>
            </p>
          </div>
          {canSeeValues && (
            <div className="bg-card rounded-xl p-4 western-shadow">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Total</p>
              <p className="text-2xl font-bold text-primary">
                <LoadingValue loading={onlyOverdue ? overdueLoading : ordersLoading} hasData={visibleOrders.length > 0 || !(onlyOverdue ? overdueLoading : ordersLoading)} size={20}>
                  {formatCurrency(displayTotalValue)}
                </LoadingValue>
              </p>
            </div>
          )}

          <div className="bg-card rounded-xl p-4 western-shadow flex items-center justify-center">
            <div className="relative">
              <button onClick={() => setShowReportOptions(!showReportOptions)} className="orange-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                <FileText size={16} /> GERAR RELATÓRIO
              </button>
              {showReportOptions && (
                <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg western-shadow p-2 z-20 min-w-[220px]">
                  <button onClick={() => { askGenerateReportPDF(); setShowReportOptions(false); }} className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-muted rounded-md flex items-center gap-2">
                    <Download size={14} /> Relatório por Filtros
                  </button>
                  {isAdmin && (
                    <button onClick={() => { navigate('/relatorio-pecas'); setShowReportOptions(false); }} className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-muted rounded-md flex items-center gap-2">
                      <FileText size={14} /> Relatório por Peças
                    </button>
                  )}
                  <button onClick={() => { setShowSpecializedReports(prev => !prev); setShowReportOptions(false); }} className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-muted rounded-md flex items-center gap-2">
                    <FileText size={14} /> Relatórios Especializados
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 western-shadow flex items-center justify-center">
            <button onClick={askGenerateProductionSheetPDF} className="leather-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Printer size={16} /> IMPRIMIR FICHAS
            </button>
          </div>
        </div>

        {/* Specialized Reports inline */}
        {showSpecializedReports && (
          <div className="mb-6">
            <SpecializedReports
              reports={isAdmin
                ? (user?.role === 'admin_master'
                    ? ['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'corte', 'expedicao', 'cobranca', 'extras_cintos', 'comissao_bordado']
                    : ['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'corte', 'expedicao', 'cobranca', 'extras_cintos'])
                : ['expedicao', 'cobranca']
              }
              showTitle={true}
            />
          </div>
        )}

        {/* Select All */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={toggleSelectAll}
            disabled={selectAllLoading || serverCount === 0}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${serverCount > 0 && selectedIds.size >= serverCount ? 'bg-primary border-primary' : 'border-border hover:border-primary'} ${selectAllLoading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {serverCount > 0 && selectedIds.size >= serverCount && <CheckCircle size={14} className="text-primary-foreground" />}
          </button>
          <span className="text-sm font-semibold">
            {serverCount > 0 && selectedIds.size >= serverCount ? 'Desmarcar todos' : 'Selecionar todos'}
            {serverCount > 0 && ` (${serverCount})`}
          </span>
          {selectAllLoading && <span className="text-xs text-muted-foreground">carregando...</span>}
          {selectedIds.size > 0 && !selectAllLoading && (
            <span className="text-xs text-muted-foreground">
              ({selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''})
            </span>
          )}
        </div>

        {showCompletarSkusPanel && (
          <CompletarSkusBulkPanel
            faltando={showCompletarSkusPanel.faltando.map(o => ({
              id: o.id, numero: o.numero, tamanho: o.tamanho, quantidade: o.quantidade,
              modelo: o.modelo, skuEstoque: o.skuEstoque, nomeProdutoEstoque: o.nomeProdutoEstoque,
            }))}
            prontos={showCompletarSkusPanel.prontos.map(o => ({
              id: o.id, numero: o.numero, tamanho: o.tamanho, quantidade: o.quantidade,
              modelo: o.modelo, skuEstoque: o.skuEstoque, nomeProdutoEstoque: o.nomeProdutoEstoque,
            }))}
            onClose={() => setShowCompletarSkusPanel(null)}
            onDone={() => { refetchOrders(); setSelectedIds(new Set()); }}
          />
        )}

        {/* Orders list */}
        <div className="space-y-3">
          {visibleOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              isAdmin={isAdmin}
              canDelete={user?.role === 'admin_master'}
              isSelected={selectedIds.has(order.id)}
              onToggle={toggleSelect}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={setConfirmDeleteId}
              onDelete={handleDelete}
              formatCurrency={formatCurrency}
              formatDateBR={formatDateBR}
              showConferidoTag={user?.role === 'admin_master'}
              temAjustePendente={ajustesPendentesIds.has(order.id)}
            />
          ))}
        </div>

        {!onlyOverdue && totalPages > 1 && (
          <PaginationBar page={page} totalPages={totalPages} onChange={handlePageChange} />
        )}

        {visibleOrders.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{scanFilterId ? 'Pedido escaneado não encontrado nos filtros atuais.' : 'Nenhum pedido encontrado com esses filtros.'}</p>
        )}
      </motion.div>

      {/* Bulk Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={(o) => { if (!bulkProgress) setShowProgressModal(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mudar Progresso de Produção</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Selecione a nova etapa para {selectedIds.size} pedido(s):
          </p>
          {(() => {
            const selectedOrders = serverOrders.filter(o => selectedIds.has(o.id));
            const hasBelts = selectedOrders.some(o => o.tipoExtra === 'cinto');
            const hasExtras = selectedOrders.some(o => o.tipoExtra && o.tipoExtra !== 'cinto');
            const hasBotas = selectedOrders.some(o => !o.tipoExtra);
            let statusList = hasBelts && !hasExtras && !hasBotas ? BELT_STATUSES
              : hasExtras && !hasBelts && !hasBotas ? EXTRAS_STATUSES
              : hasBotas && !hasBelts && !hasExtras ? PRODUCTION_STATUSES
              : [...new Set([...PRODUCTION_STATUSES, ...BELT_STATUSES, ...EXTRAS_STATUSES])];
            // Se exatamente 1 pedido selecionado, filtra para mostrar apenas etapas válidas
            if (selectedOrders.length === 1) {
              const o = selectedOrders[0];
              statusList = statusList.filter(s => isTransitionAllowed(o.status, s, { vendedor: o.vendedor, tipoExtra: o.tipoExtra }));
            }
            return (
              <select
                value={selectedProgress}
                onChange={e => setSelectedProgress(e.target.value)}
                className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary outline-none"
              >
                <option value="">Selecione a etapa...</option>
                {statusList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            );
          })()}
          <div className="mt-3">
            <label className="block text-xs font-semibold mb-1">
              {selectedProgress === 'Cancelado' ? 'Motivo do cancelamento *' : 'Observação (opcional)'}
            </label>
            <textarea
              value={progressObservacao}
              onChange={e => setProgressObservacao(e.target.value)}
              placeholder={selectedProgress === 'Cancelado' ? 'Ex: cliente desistiu, pedido duplicado...' : 'Ex: pedido priorizado...'}
              className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary outline-none min-h-[60px]"
            />
          </div>
          <DialogFooter className="mt-4">
            <button onClick={() => setShowProgressModal(false)} disabled={!!bulkProgress} className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">Cancelar</button>
            <button
              onClick={handleBulkProgressUpdate}
              disabled={!!bulkProgress || (selectedProgress === 'Cancelado' && !progressObservacao.trim())}
              className="px-4 py-2 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
            >
              {bulkProgress ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="animate-spin" size={14} />
                  {bulkProgress.current} / {bulkProgress.total}
                </span>
              ) : 'OK'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkBlockedDialog
        open={blockedDialog.open}
        destino={blockedDialog.destino}
        blocked={blockedDialog.blocked}
        movedCount={blockedDialog.movedCount}
        onClose={() => setBlockedDialog(s => ({ ...s, open: false }))}
      />

      {/* Step 1 — Confirmação humana antes da justificativa */}
      {(() => {
        const kinds = new Set(regressionItems.map(i => i.kind));
        const allCancel = kinds.size === 1 && kinds.has('cancel');
        const allPause = kinds.size === 1 && kinds.has('pause');
        const allRegression = kinds.size === 1 && kinds.has('regression');
        const confirmTitle = allCancel
          ? 'Tem certeza que quer cancelar?'
          : allPause
            ? 'Tem certeza que quer pausar?'
            : allRegression
              ? 'Tem certeza que quer voltar a etapa?'
              : 'Confirma a alteração?';
        const confirmBtn = allCancel
          ? 'Sim, cancelar'
          : allPause
            ? 'Sim, pausar'
            : allRegression
              ? 'Sim, voltar etapa'
              : 'Sim, continuar';
        const confirmIntro = regressionItems.length === 1
          ? 'Confira a data em que o pedido entrou na etapa atual:'
          : `${regressionItems.length} pedidos selecionados. Confira quando cada um entrou na etapa atual:`;
        const labelOf = (k: JustificationKind) =>
          k === 'cancel' ? 'cancelamento' : k === 'pause' ? 'pausa' : 'retrocesso';
        return (
          <>
            <Dialog open={showRegressionConfirmModal} onOpenChange={(open) => { if (!open) setShowRegressionConfirmModal(false); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{confirmTitle}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">{confirmIntro}</p>
                <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2 text-xs space-y-2">
                  {regressionItems.map(item => (
                    <div key={item.id} className="flex flex-col gap-0.5 pb-2 border-b border-border/40 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold">#{item.numero}</span>
                        <span className="text-muted-foreground">
                          {item.current} <span className="text-destructive font-bold">→</span> {item.next}
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-destructive font-bold">
                            ({labelOf(item.kind)})
                          </span>
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Em <strong>{item.current}</strong> desde {item.desdeData ? formatDateBR(item.desdeData, item.desdeHora) : 'data não registrada'}
                      </span>
                    </div>
                  ))}
                </div>
                <DialogFooter className="mt-4">
                  <button
                    onClick={() => { setShowRegressionConfirmModal(false); }}
                    className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { setShowRegressionConfirmModal(false); setShowRegressionModal(true); }}
                    className="px-4 py-2 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90"
                  >
                    {confirmBtn}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Step 2 — Justificativa obrigatória */}
            <Dialog open={showRegressionModal} onOpenChange={(open) => { if (!open && !bulkProgress) setShowRegressionModal(false); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {allCancel ? 'Justifique o cancelamento'
                      : allPause ? 'Justifique a pausa'
                      : allRegression ? 'Justifique o retrocesso'
                      : 'Justifique a alteração'}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {regressionItems.length} pedido(s) {allCancel ? 'estão sendo cancelados'
                    : allPause ? 'estão sendo pausados em "Aguardando"'
                    : allRegression ? 'estão sendo movidos para uma etapa anterior'
                    : 'exigem justificativa'}.
                  A justificativa ficará registrada no histórico de produção.
                </p>
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2 text-xs space-y-1">
                  {regressionItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <span className="font-mono">#{item.numero}</span>
                      <span className="text-muted-foreground">
                        {item.current} <span className="text-destructive font-bold">→</span> {item.next}
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-destructive font-bold">
                          ({labelOf(item.kind)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold mb-1">
                    {allCancel ? 'Motivo do cancelamento *'
                      : allPause ? 'Motivo da pausa *'
                      : 'Justificativa *'}
                  </label>
                  <textarea
                    value={regressionReason}
                    onChange={e => setRegressionReason(e.target.value)}
                    placeholder={
                      allCancel ? 'Ex: cliente desistiu, pedido duplicado...'
                      : allPause ? 'Ex: aguardando material, aguardando confirmação do cliente...'
                      : 'Ex: pedido devolvido pelo cliente, erro na separação, refazer revisão...'
                    }
                    maxLength={500}
                    className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary outline-none min-h-[80px]"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Mínimo 5 caracteres • {regressionReason.trim().length}/500
                  </p>
                </div>
                {/* Os pedidos sem trava já foram aplicados antes deste modal abrir */}
                <DialogFooter className="mt-4 flex-col sm:flex-col items-stretch gap-2">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRegressionModal(false)}
                      disabled={!!bulkProgress}
                      className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmRegression}
                      disabled={!!bulkProgress || regressionReason.trim().length < 5}
                      className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-w-[110px]"
                    >
                      {bulkProgress ? (
                        <span className="inline-flex items-center gap-2 justify-center">
                          <Loader2 className="animate-spin" size={14} />
                          {bulkProgress.current} / {bulkProgress.total}
                        </span>
                      ) : 'Confirmar'}
                    </button>
                  </div>
                  {(selectedProgress === 'Montagem' || selectedProgress === 'Montagem Ailton') && (
                    <button
                      onClick={async () => {
                        let okCount = 0;
                        const blocked: BlockedItem[] = [];
                        setBulkProgress({ current: 0, total: regressionItems.length });
                        try {
                          for (const item of regressionItems) {
                            const motivoOpt = regressionReason.trim();
                            const { error } = await supabase.rpc('montagem_marcar_erro' as any, {
                              _order_id: item.id,
                              _destino: selectedProgress,
                              _motivo: motivoOpt || null,
                            } as any);
                            if (error) blocked.push({ numero: item.numero, statusAtual: item.current });
                            else okCount++;
                            setBulkProgress(p => p ? { ...p, current: p.current + 1 } : p);
                          }
                        } finally {
                          setBulkProgress(null);
                        }
                        if (blocked.length > 0) {
                          setBlockedDialog({ open: true, destino: selectedProgress, blocked, movedCount: okCount });
                        } else if (okCount > 0) {
                          toast.success(`${okCount} pedido(s) marcado(s) como ERRO MONTAGEM.`);
                        }
                        finalizeBulkUpdate(okCount);
                      }}
                      disabled={!!bulkProgress}
                      className="w-full px-4 py-2 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 disabled:opacity-50"
                    >
                      ERRO MONTAGEM (motivo opcional — não cobra novamente)
                    </button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        );
      })()}

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} pedidos?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} pedidos selecionados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await deleteOrderBatch([...selectedIds]);
                setSelectedIds(new Set());
                toast.success(`${selectedIds.size} pedidos excluídos com sucesso`);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk conferido (mark / unmark) */}
      <AlertDialog open={showBulkConferidoDialog} onOpenChange={(o) => { if (!bulkConferidoLoading) setShowBulkConferidoDialog(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferir {selectedIds.size} pedido(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha uma ação para os pedidos selecionados. A marcação ficará registrada com seu usuário e horário atuais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={bulkConferidoLoading}>Cancelar</AlertDialogCancel>
            <button
              type="button"
              disabled={bulkConferidoLoading}
              onClick={async () => {
                const ids = [...selectedIds];
                if (ids.length === 0) return;
                setBulkConferidoLoading(true);
                const { error } = await supabase
                  .from('orders')
                  .update({ conferido: false, conferido_em: null, conferido_por: null })
                  .in('id', ids);
                setBulkConferidoLoading(false);
                if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
                toast.success(`Marcação removida em ${ids.length} pedido(s)`);
                setSelectedIds(new Set());
                setShowBulkConferidoDialog(false);
                refetchOrders();
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              Remover marcação
            </button>
            <button
              type="button"
              disabled={bulkConferidoLoading}
              onClick={async () => {
                const ids = [...selectedIds];
                if (ids.length === 0) return;
                setBulkConferidoLoading(true);
                const { error } = await supabase
                  .from('orders')
                  .update({
                    conferido: true,
                    conferido_em: new Date().toISOString(),
                    conferido_por: user?.id ?? null,
                  })
                  .in('id', ids);
                setBulkConferidoLoading(false);
                if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
                toast.success(`${ids.length} pedido(s) marcado(s) como conferido`);
                setSelectedIds(new Set());
                setShowBulkConferidoDialog(false);
                refetchOrders();
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {bulkConferidoLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Marcar como conferido
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {confirmPrintDialog}

      {/* Fila guiada de envio de WhatsApp */}
      <Dialog open={showWhatsappQueue} onOpenChange={(open) => { if (!open) setWhatsappQueue([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="text-emerald-500" size={20} /> Enviar WhatsApp em lote
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const total = whatsappQueue.length;
            const done = whatsappIndex >= total;
            const current = whatsappQueue[whatsappIndex];
            if (done) {
              return (
                <div className="space-y-4 py-2">
                  <p className="text-sm">
                    Fila concluída: <b>{whatsappSent}</b> enviado{whatsappSent === 1 ? '' : 's'},{' '}
                    <b>{whatsappSkipped}</b> pulado{whatsappSkipped === 1 ? '' : 's'} de <b>{total}</b>.
                  </p>
                  <DialogFooter>
                    <Button onClick={() => setWhatsappQueue([])}>Fechar</Button>
                  </DialogFooter>
                </div>
              );
            }
            const loja = whatsappLojaCache[current.vendedor] || { nomeLoja: '', telefoneLoja: '' };
            const handleOpen = () => {
              const message = buildTrackingMessage({
                cliente: current.cliente || '',
                numero: current.numero,
                nomeLoja: loja.nomeLoja,
                link: getPublicTrackingUrl(current.id),
                telefoneLoja: loja.telefoneLoja,
              });
              const url = buildWhatsappUrl((current as any).clienteWhatsapp || '', message);
              window.open(url, '_blank', 'noopener');
            };
            return (
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground">
                  Pedido {whatsappIndex + 1} de {total} · {whatsappSent} enviado{whatsappSent === 1 ? '' : 's'}, {whatsappSkipped} pulado{whatsappSkipped === 1 ? '' : 's'}
                </p>
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <p className="text-sm"><b>{current.numero}</b> — {current.cliente || 'sem nome'}</p>
                  <p className="text-xs text-muted-foreground">Vendedor: {current.vendedor}</p>
                  <p className="text-xs text-muted-foreground">WhatsApp: {(current as any).clienteWhatsapp}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleOpen} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <MessageCircle size={16} className="mr-2" /> Abrir WhatsApp deste pedido
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => { setWhatsappSkipped(s => s + 1); setWhatsappIndex(i => i + 1); }}
                    >
                      <SkipForward size={16} className="mr-2" /> Pular
                    </Button>
                    <Button
                      onClick={() => { setWhatsappSent(s => s + 1); setWhatsappIndex(i => i + 1); }}
                    >
                      <CheckCircle size={16} className="mr-2" /> Já enviei
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsPage;
