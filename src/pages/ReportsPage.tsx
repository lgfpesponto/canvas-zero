import { useAuth, PRODUCTION_STATUSES, PRODUCTION_STATUSES_USER, EXTRAS_STATUSES, BELT_STATUSES, orderBarcodeValue, matchOrderBarcode, type Order } from '@/contexts/AuthContext';
import { useOrders, fetchOrderByScan, fetchVendedores, fetchAllFilteredOrders, fetchOrdersByIds, type OrderFilters } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import { EXTRA_PRODUCTS, EXTRA_PRODUCT_NAME_MAP } from '@/lib/extrasConfig';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Filter, FileText, Download, Printer, CheckCircle, StickyNote, Pencil, Trash2, RefreshCw, ScanBarcode, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SpecializedReports from '@/components/SpecializedReports';
import OrderCard from '@/components/OrderCard';
import { generateReportPDF, generateProductionSheetPDF } from '@/lib/pdfGenerators';
import { requiresJustification, type JustificationKind } from '@/lib/statusRegression';
import { LoadingValue } from '@/components/ui/LoadingValue';
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

const formatDateBR = (date: string, time?: string) => {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}${time ? ` — ${time}` : ''}`;
};

const ReportsPage = () => {
  const { isLoggedIn, isAdmin, isFernanda, user, deleteOrder, deleteOrderBatch, updateOrderStatus, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scannedOrdersMap, setScannedOrdersMap] = useState<Map<string, import('@/contexts/AuthContext').Order>>(new Map());

  // Bulk progress modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState('');
  const [progressObservacao, setProgressObservacao] = useState('');

  // Justification confirmation modal (regressão / pausa / cancelamento)
  const [showRegressionConfirmModal, setShowRegressionConfirmModal] = useState(false);
  const [showRegressionModal, setShowRegressionModal] = useState(false);
  const [regressionItems, setRegressionItems] = useState<{ id: string; numero: string; current: string; next: string; desdeData: string; desdeHora: string; kind: JustificationKind }[]>([]);
  const [normalIds, setNormalIds] = useState<string[]>([]);
  const [regressionReason, setRegressionReason] = useState('');

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
    };
  });

  const syncSearchParams = useCallback((filters: { searchQuery: string; filterDate: string; filterDateEnd: string; filterStatus: Set<string>; filterVendedor: Set<string>; filterProduto: Set<string>; mudouStatus?: Set<string>; mudouDe?: string; mudouAte?: string; onlyOverdue?: boolean }) => {
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
    const newFilters: OrderFilters & { mudouStatus: Set<string>; mudouDe: string; mudouAte: string; onlyOverdue: boolean } = {
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
      onlyOverdue,
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
      val += (Number(o.preco) || 0) * qtd;
    }
    return { displayTotalProdutos: prod, displayTotalValue: val };
  }, [onlyOverdue, visibleOrders, totalProdutos, totalValue]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const formatCurrency = useCallback((v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const statuses = isAdmin ? PRODUCTION_STATUSES : PRODUCTION_STATUSES_USER;
  const allStatuses = [...statuses];

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

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleOrders.map(o => o.id)));
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
      const kind = requiresJustification(ord.status, selectedProgress);
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

    if (regressions.length > 0) {
      setRegressionItems(regressions);
      setNormalIds(normals);
      setRegressionReason('');
      setShowRegressionConfirmModal(true);
      return;
    }

    for (const id of selectedIds) {
      await updateOrderStatus(id, selectedProgress, progressObservacao.trim() || undefined);
    }
    finalizeBulkUpdate(selectedIds.size);
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

    for (const item of regressionItems) {
      const obs = `${prefixOf(item.kind)} ${motivo}${baseObs ? ` — ${baseObs}` : ''}`;
      await updateOrderStatus(item.id, selectedProgress, obs);
    }
    for (const id of normalIds) {
      await updateOrderStatus(id, selectedProgress, baseObs || undefined);
    }
    finalizeBulkUpdate(regressionItems.length + normalIds.length);
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
          navigate(`/pedido/${match.id}`);
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

  const handleGenerateReportPDF = useCallback(() => generateReportPDF(ordersToExport, { userName: user?.nomeCompleto || '' }), [ordersToExport, user]);
  const handleGenerateProductionSheetPDF = useCallback(async () => {
    await generateProductionSheetPDF(ordersToExport, { userName: user?.nomeCompleto || '' });
    if (isFernanda) {
      const toPromote = ordersToExport.filter(o => o.status === 'Em aberto');
      if (toPromote.length > 0) {
        await Promise.all(toPromote.map(o => updateOrderStatus(o.id, 'Impresso')));
        toast.success(`${toPromote.length} ${toPromote.length === 1 ? 'pedido movido' : 'pedidos movidos'} para "Impresso"`);
      }
    }
  }, [ordersToExport, user, isFernanda, updateOrderStatus]);

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
              {user?.role === 'admin_master' && selectedIds.size > 1 && (
                <button onClick={() => setShowBulkDeleteDialog(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:opacity-90 transition-opacity">
                  <Trash2 size={16} /> Excluir selecionados ({selectedIds.size})
                </button>
              )}
            </>
          )}
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
                <Switch checked={onlyOverdue} onCheckedChange={setOnlyOverdue} />
                <span className={`text-xs font-bold uppercase ${onlyOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Apenas atrasados
                </span>
              </label>
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
              <LoadingValue loading={ordersLoading} hasData={serverOrders.length > 0 || !ordersLoading} size={20}>
                {totalProdutos}
              </LoadingValue>
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 western-shadow">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Total</p>
            <p className="text-2xl font-bold text-primary">
              <LoadingValue loading={ordersLoading} hasData={serverOrders.length > 0 || !ordersLoading} size={20}>
                {formatCurrency(totalValue)}
              </LoadingValue>
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 western-shadow flex items-center justify-center">
            <div className="relative">
              <button onClick={() => setShowReportOptions(!showReportOptions)} className="orange-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                <FileText size={16} /> GERAR RELATÓRIO
              </button>
              {showReportOptions && (
                <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg western-shadow p-2 z-20 min-w-[220px]">
                  <button onClick={() => { handleGenerateReportPDF(); setShowReportOptions(false); }} className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-muted rounded-md flex items-center gap-2">
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
            <button onClick={handleGenerateProductionSheetPDF} className="leather-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Printer size={16} /> IMPRIMIR FICHAS
            </button>
          </div>
        </div>

        {/* Specialized Reports inline */}
        {showSpecializedReports && (
          <div className="mb-6">
            <SpecializedReports
              reports={isAdmin
                ? ['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'corte', 'expedicao', 'cobranca', 'extras_cintos']
                : ['expedicao', 'cobranca']
              }
              showTitle={true}
            />
          </div>
        )}

        {/* Select All */}
        <div className="flex items-center gap-3 mb-3">
          <button onClick={toggleSelectAll} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.size === visibleOrders.length && visibleOrders.length > 0 ? 'bg-primary border-primary' : 'border-border hover:border-primary'}`}>
            {selectedIds.size === visibleOrders.length && visibleOrders.length > 0 && <CheckCircle size={14} className="text-primary-foreground" />}
          </button>
          <span className="text-sm font-semibold">Selecionar todos</span>
          {selectedIds.size > 0 && <span className="text-xs text-muted-foreground">({selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''})</span>}
        </div>

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
            />
          ))}
        </div>

        {!onlyOverdue && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg border-2 border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}

        {visibleOrders.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{scanFilterId ? 'Pedido escaneado não encontrado nos filtros atuais.' : 'Nenhum pedido encontrado com esses filtros.'}</p>
        )}
      </motion.div>

      {/* Bulk Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
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
            const statusList = hasBelts && !hasExtras && !hasBotas ? BELT_STATUSES
              : hasExtras && !hasBelts && !hasBotas ? EXTRAS_STATUSES
              : hasBotas && !hasBelts && !hasExtras ? PRODUCTION_STATUSES
              : [...new Set([...PRODUCTION_STATUSES, ...BELT_STATUSES, ...EXTRAS_STATUSES])];
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
            <button onClick={() => setShowProgressModal(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm">Cancelar</button>
            <button
              onClick={handleBulkProgressUpdate}
              disabled={selectedProgress === 'Cancelado' && !progressObservacao.trim()}
              className="px-4 py-2 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              OK
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    onClick={() => { setShowRegressionConfirmModal(false); setRegressionItems([]); setNormalIds([]); }}
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
            <Dialog open={showRegressionModal} onOpenChange={(open) => { if (!open) setShowRegressionModal(false); }}>
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
                {normalIds.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    + {normalIds.length} pedido(s) avançam normalmente e serão atualizados junto.
                  </p>
                )}
                <DialogFooter className="mt-4">
                  <button
                    onClick={() => setShowRegressionModal(false)}
                    className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmRegression}
                    disabled={regressionReason.trim().length < 5}
                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
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
    </div>
  );
};

export default ReportsPage;
