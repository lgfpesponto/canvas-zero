import { useAuth, PRODUCTION_STATUSES, PRODUCTION_STATUSES_USER, EXTRAS_STATUSES, BELT_STATUSES, orderBarcodeValue, matchOrderBarcode } from '@/contexts/AuthContext';
import { EXTRA_PRODUCTS, EXTRA_PRODUCT_NAME_MAP } from '@/lib/extrasConfig';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Filter, FileText, Download, Printer, CheckCircle, StickyNote, Pencil, Trash2, RefreshCw, ScanBarcode } from 'lucide-react';
import { toast } from 'sonner';
import SpecializedReports from '@/components/SpecializedReports';
import OrderCard from '@/components/OrderCard';
import { generateReportPDF, generateProductionSheetPDF } from '@/lib/pdfGenerators';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const PAGE_SIZE = 50;

const formatDateBR = (date: string, time?: string) => {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}${time ? ` — ${time}` : ''}`;
};

const ReportsPage = () => {
  const { isLoggedIn, isAdmin, isFernanda, orders, allOrders, user, deleteOrder, updateOrderStatus } = useAuth();
  const navigate = useNavigate();
  const [filterDate, setFilterDate] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVendedor, setFilterVendedor] = useState<Set<string>>(new Set());
  const [filterProduto, setFilterProduto] = useState<Set<string>>(new Set(['bota', 'cinto', ...EXTRA_PRODUCTS.map(p => p.id)]));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk progress modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState('');
  const [progressObservacao, setProgressObservacao] = useState('');

  // Barcode scanner
  const [showScanner, setShowScanner] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [scanFilterId, setScanFilterId] = useState<string | null>(null);

  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: '', filterDate: '', filterDateEnd: '', filterStatus: new Set<string>(), filterVendedor: new Set<string>(), filterProduto: new Set(['bota', 'cinto', ...EXTRA_PRODUCTS.map(p => p.id)]),
  });

  const applyFilters = () => {
    setScanFilterId(null);
    setAppliedFilters({ searchQuery, filterDate, filterDateEnd, filterStatus: new Set(filterStatus), filterVendedor: new Set(filterVendedor), filterProduto: new Set(filterProduto) });
  };

  const toggleProdutoFilter = (val: string) => {
    setFilterProduto(prev => {
      const next = new Set(prev);
      if (next.has(val)) { if (next.size > 1) next.delete(val); } else { next.add(val); }
      return next;
    });
  };

  const displayOrders = isAdmin && appliedFilters.filterVendedor.size > 0
    ? allOrders.filter(o => appliedFilters.filterVendedor.has(o.vendedor))
    : orders;

  const filteredOrders = useMemo(() => {
    return displayOrders.filter(o => {
      if (appliedFilters.searchQuery && !o.numero.toLowerCase().includes(appliedFilters.searchQuery.toLowerCase())) return false;
      if (appliedFilters.filterDate && o.dataCriacao < appliedFilters.filterDate) return false;
      if (appliedFilters.filterDateEnd && o.dataCriacao > appliedFilters.filterDateEnd) return false;
      if (appliedFilters.filterStatus.size > 0 && !appliedFilters.filterStatus.has(o.status)) return false;
      if (o.tipoExtra) {
        if (!appliedFilters.filterProduto.has(o.tipoExtra)) return false;
      } else {
        if (!appliedFilters.filterProduto.has('bota')) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.dataCriacao !== b.dataCriacao) return b.dataCriacao.localeCompare(a.dataCriacao);
      if (a.horaCriacao && b.horaCriacao) return b.horaCriacao.localeCompare(a.horaCriacao);
      return 0;
    });
  }, [displayOrders, appliedFilters]);

  const visibleOrders = useMemo(() => {
    if (scanFilterId) return filteredOrders.filter(o => o.id === scanFilterId);
    return filteredOrders;
  }, [filteredOrders, scanFilterId]);

  const totalValue = useMemo(() => filteredOrders.reduce((s, o) => s + o.preco * o.quantidade, 0), [filteredOrders]);
  const formatCurrency = useCallback((v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const statuses = isAdmin ? PRODUCTION_STATUSES : PRODUCTION_STATUSES_USER;
  const allStatuses = [...statuses];
  const allVendedores = isAdmin ? [...new Set(allOrders.map(o => o.vendedor))].sort() : [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleOrders.map(o => o.id)));
    }
  };

  const ordersToExport = useMemo(() => selectedIds.size > 0
    ? filteredOrders.filter(o => selectedIds.has(o.id))
    : filteredOrders, [selectedIds, filteredOrders]);

  const handleBulkProgressUpdate = () => {
    if (!selectedProgress) { toast.error('Selecione uma etapa de produção.'); return; }
    selectedIds.forEach(id => updateOrderStatus(id, selectedProgress, progressObservacao.trim() || undefined));
    toast.success(`${selectedIds.size} pedido(s) atualizado(s) para "${selectedProgress}".`);
    setShowProgressModal(false);
    setSelectedProgress('');
    setProgressObservacao('');
  };

  // Barcode scan handler
  const handleScan = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const source = isAdmin ? allOrders : orders;
    const match = source.find(o => matchOrderBarcode(trimmed, o));
    if (match) {
      if (isAdmin) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (!next.has(match.id)) {
            next.add(match.id);
            toast.success(`Pedido ${match.numero} selecionado.`);
          } else {
            toast.info(`Pedido ${match.numero} já está selecionado.`);
          }
          return next;
        });
        setScanFilterId(match.id);
      } else {
        navigate(`/pedido/${match.id}`);
        toast.success(`Pedido ${match.numero} encontrado.`);
      }
    } else {
      toast.error(`Pedido não encontrado para código: ${trimmed}`);
    }
    setScanValue('');
  }, [allOrders, orders, isAdmin, navigate]);

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
          {isAdmin && selectedIds.size > 0 && (
            <button onClick={() => setShowProgressModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity ml-auto">
              <RefreshCw size={16} /> Mudar progresso de produção
            </button>
          )}
        </div>

        {/* Barcode scanner for all users */}
        {showScanner && (
          <div className="bg-card rounded-xl p-4 western-shadow mb-4">
            <div className="flex items-center gap-3">
              <ScanBarcode size={20} className="text-primary flex-shrink-0" />
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
                  placeholder="Escaneie o código de barras aqui..."
                  className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  autoFocus
                />
              </div>
              <button onClick={() => handleScan(scanValue)} className="orange-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                Buscar
              </button>
            </div>
            {isAdmin && selectedIds.size > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{selectedIds.size} pedido(s) selecionado(s)</p>
            )}
          </div>
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
            <p className="text-2xl font-bold">{visibleOrders.length}</p>
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
                ? ['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'expedicao', 'cobranca', 'extras_cintos']
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
            <div key={order.id} className="bg-card rounded-xl p-4 western-shadow hover:shadow-xl transition-shadow flex items-center gap-3">
              {isAdmin && (
                <button onClick={() => toggleSelect(order.id)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedIds.has(order.id) ? 'bg-primary border-primary' : 'border-border hover:border-primary'}`}>
                  {selectedIds.has(order.id) && <CheckCircle size={14} className="text-primary-foreground" />}
                </button>
              )}

              <div className="flex-1 cursor-pointer" onClick={() => navigate(`/pedido/${order.id}`)}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-display font-bold">{order.numero}</span>
                    {order.tipoExtra && <span className="text-xs font-semibold text-primary ml-2">— {EXTRA_PRODUCT_NAME_MAP[order.tipoExtra] || order.tipoExtra}</span>}
                    {isAdmin && <span className="text-sm text-muted-foreground ml-2">— {order.vendedor}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="text-muted-foreground">{formatDateBR(order.dataCriacao, order.horaCriacao)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-bold">{order.status}</span>
                    <span className="font-bold text-primary">{formatCurrency(order.preco * order.quantidade)}</span>
                    <span className="text-xs text-muted-foreground">{order.diasRestantes > 0 ? `${order.diasRestantes}d úteis` : '✓'}</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => navigate(order.tipoExtra && order.tipoExtra !== 'cinto' ? `/pedido/${order.id}/editar-extra` : `/pedido/${order.id}/editar`)} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Editar pedido">
                    <Pencil size={16} />
                  </button>
                  {confirmDeleteId === order.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(order.id)} className="px-2 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90">Confirmar</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded-lg bg-muted text-xs font-bold hover:opacity-80">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(order.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Excluir pedido">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

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
            const selectedOrders = filteredOrders.filter(o => selectedIds.has(o.id));
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
            <label className="block text-xs font-semibold mb-1">Observação (opcional)</label>
            <textarea
              value={progressObservacao}
              onChange={e => setProgressObservacao(e.target.value)}
              placeholder="Ex: pedido priorizado..."
              className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary outline-none min-h-[60px]"
            />
          </div>
          <DialogFooter className="mt-4">
            <button onClick={() => setShowProgressModal(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm">Cancelar</button>
            <button onClick={handleBulkProgressUpdate} className="px-4 py-2 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90">OK</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsPage;
