import { useAuth, PRODUCTION_STATUSES, PRODUCTION_STATUSES_USER, EXTRAS_STATUSES, BELT_STATUSES, orderBarcodeValue, matchOrderBarcode } from '@/contexts/AuthContext';
import { useOrders, fetchOrderByScan, fetchVendedores, fetchAllFilteredOrders, fetchOrdersByIds, type OrderFilters } from '@/hooks/useOrders';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scannedOrdersMap, setScannedOrdersMap] = useState<Map<string, import('@/contexts/AuthContext').Order>>(new Map());

  // Bulk progress modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState('');
  const [progressObservacao, setProgressObservacao] = useState('');

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
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    searchQuery: searchParams.get('q') || '',
    filterDate: searchParams.get('de') || '',
    filterDateEnd: searchParams.get('ate') || '',
    filterStatus: new Set(filterStatus),
    filterVendedor: new Set(filterVendedor),
    filterProduto: new Set(searchParams.get('produtos')?.split(',') ?? [...defaultProduto]),
  }));

  const syncSearchParams = useCallback((filters: { searchQuery: string; filterDate: string; filterDateEnd: string; filterStatus: Set<string>; filterVendedor: Set<string>; filterProduto: Set<string> }) => {
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
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const applyFilters = () => {
    setScanFilterId(null);
    setPage(1);
    const newFilters = { searchQuery, filterDate, filterDateEnd, filterStatus: new Set(filterStatus), filterVendedor: new Set(filterVendedor), filterProduto: new Set(filterProduto) };
    setAppliedFilters(newFilters);
    syncSearchParams(newFilters);
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
  const { orders: serverOrders, count: serverCount, totalPages, loading: ordersLoading, totalValue, refetch: refetchOrders, pageSize: PAGE_SIZE_ACTUAL } = useOrders(appliedFilters, page, isLoggedIn);

  const visibleOrders = useMemo(() => {
    if (scanFilterId) return serverOrders.filter(o => o.id === scanFilterId);
    return serverOrders;
  }, [serverOrders, scanFilterId]);

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

  const handleBulkProgressUpdate = async () => {
    if (!selectedProgress) { toast.error('Selecione uma etapa de produção.'); return; }
    if (selectedProgress === 'Cancelado' && !progressObservacao.trim()) {
      toast.error('Informe o motivo do cancelamento.');
      return;
    }
    for (const id of selectedIds) {
      await updateOrderStatus(id, selectedProgress, progressObservacao.trim() || undefined);
    }
    toast.success(`${selectedIds.size} pedido(s) atualizado(s) para "${selectedProgress}".`);
    setShowProgressModal(false);
    setSelectedProgress('');
    setProgressObservacao('');
    setSelectedIds(new Set());
    setScannedOrdersMap(new Map());
    setLastScannedNumero(null);
    setShowSelectedList(false);
    refetchOrders();
  };

  // Barcode scan handler — direct DB query
  const handleScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (scanning) return;
    setScanning(true);
    try {
      const match = await fetchOrderByScan(trimmed);
      if (match) {
        if (isAdmin) {
          setSelectedIds(prev => {
            if (prev.has(match.id)) {
              playErrorBeep();
              toast.warning('Esse pedido já está selecionado');
              return prev;
            }
            const next = new Set(prev);
            next.add(match.id);
            setLastScannedNumero(match.numero);
            playBeep();
            return next;
          });
          // Accumulate scanned order data so "Visualizar pedidos" always has it
          setScannedOrdersMap(prev => {
            const next = new Map(prev);
            next.set(match.id, match);
            return next;
          });
          setScanFilterId(match.id);
        } else {
          navigate(`/pedido/${match.id}`);
          toast.success(`Pedido ${match.numero} encontrado.`);
        }
      } else {
        playErrorBeep();
        toast.error(`Pedido não encontrado para código: ${trimmed}`);
      }
      setScanValue('');
    } finally {
      setScanning(false);
    }
  }, [isAdmin, navigate, playBeep, playErrorBeep, scanning]);

  useEffect(() => {
    if (showScanner && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [showScanner]);

  const handleGenerateReportPDF = useCallback(() => generateReportPDF(ordersToExport), [ordersToExport]);
  const handleGenerateProductionSheetPDF = useCallback(() => generateProductionSheetPDF(ordersToExport), [ordersToExport]);

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

        {/* Barcode scanner for all users */}
        {showScanner && (
          <>
            {isAdmin && selectedIds.size > 0 ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-2xl border-2 border-green-500 w-full max-w-lg mx-4">
                  {lastScannedNumero && (
                    <div className="mb-4 text-center">
                      <p className="text-sm text-gray-400 uppercase font-semibold mb-1">Último pedido lido</p>
                      <p className="text-3xl font-bold text-green-400">✅ {lastScannedNumero}</p>
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <p className="text-2xl font-bold">{selectedIds.size} pedido{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-center mb-4">
                    <button onClick={() => setShowSelectedList(v => !v)} className="text-sm text-green-300 underline hover:text-green-200 transition-colors">
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
                            <button onClick={() => toggleSelect(o.id)} className="text-red-400 hover:text-red-300 ml-2">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-6">
                    {scanning
                      ? <Loader2 size={20} className="text-green-400 flex-shrink-0 animate-spin" />
                      : <ScanBarcode size={20} className="text-green-400 flex-shrink-0" />}
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
                      disabled={scanning}
                      placeholder={scanning ? 'Buscando pedido...' : 'Escaneie o código de barras aqui...'}
                      className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 text-base border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none placeholder:text-gray-500 disabled:opacity-60"
                      autoFocus
                    />
                    <button onClick={() => handleScan(scanValue)} disabled={scanning} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                      {scanning && <Loader2 size={14} className="animate-spin" />}
                      {scanning ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowProgressModal(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity">
                      <RefreshCw size={16} /> Mudar progresso de produção
                    </button>
                    <button onClick={() => { setSelectedIds(new Set()); setScannedOrdersMap(new Map()); setLastScannedNumero(null); setShowSelectedList(false); setShowScanner(false); setScanFilterId(null); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors">
                      Limpar seleção
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-4 western-shadow mb-4">
                <div className="flex items-center gap-3">
                  {scanning
                    ? <Loader2 size={20} className="text-primary flex-shrink-0 animate-spin" />
                    : <ScanBarcode size={20} className="text-primary flex-shrink-0" />}
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">Escaneie ou digite o código de barras do pedido</label>
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
                      disabled={scanning}
                      placeholder={scanning ? 'Buscando pedido...' : 'Escaneie o código de barras aqui...'}
                      className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-60"
                      autoFocus
                    />
                  </div>
                  <button onClick={() => handleScan(scanValue)} disabled={scanning} className="orange-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                    {scanning && <Loader2 size={14} className="animate-spin" />}
                    {scanning ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

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
            <div className="flex items-end gap-2">
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
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total de Pedidos</p>
            <p className="text-2xl font-bold">{serverCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 western-shadow">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Total</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
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
          {isAdmin && (
            <div className="bg-card rounded-xl p-4 western-shadow flex items-center justify-center">
              <button onClick={handleGenerateProductionSheetPDF} className="leather-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                <Printer size={16} /> IMPRIMIR FICHAS
              </button>
            </div>
          )}
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

        {/* Select All - admin only */}
        {isAdmin && (
          <div className="flex items-center gap-3 mb-3">
            <button onClick={toggleSelectAll} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.size === visibleOrders.length && visibleOrders.length > 0 ? 'bg-primary border-primary' : 'border-border hover:border-primary'}`}>
              {selectedIds.size === visibleOrders.length && visibleOrders.length > 0 && <CheckCircle size={14} className="text-primary-foreground" />}
            </button>
            <span className="text-sm font-semibold">Selecionar todos</span>
            {selectedIds.size > 0 && <span className="text-xs text-muted-foreground">({selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''})</span>}
          </div>
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
            />
          ))}
        </div>

        {totalPages > 1 && (
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
