import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, DollarSign, AlertTriangle, AlignStartVertical, Eye, Check, ChevronDown, RotateCcw, Trash2, HardDrive, Loader2, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SpecializedReports from '@/components/SpecializedReports';
import SoladoBoard from '@/components/SoladoBoard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { dbRowToOrder } from '@/lib/order-logic';
import {
  PRODUCTION_STATUSES_IN_PROD, PROD_PRODUCT_OPTIONS,
  formatCurrency,
} from '@/lib/order-logic';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import type { Order } from '@/contexts/AuthContext';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const AdminDashboard = () => {
  const { user, role } = useAuth();
  const isAdminMaster = role === 'admin_master';

  // Local state
  const [chartPeriod, setChartPeriod] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes');
  const [receberVendedor, setReceberVendedor] = useState('todos');
  const [chartProductFilter, setChartProductFilter] = useState('todos');
  const [chartVendedorFilter, setChartVendedorFilter] = useState('todos');
  const [prodProductFilter, setProdProductFilter] = useState<Set<string>>(new Set());
  const [prodVendedorFilter, setProdVendedorFilter] = useState<Set<string>>(new Set());
  const [checkedAlertIds, setCheckedAlertIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('alert_checked_orders');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [deletedOrders, setDeletedOrders] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ db_size_mb: number; order_count: number; deleted_order_count: number; limit_mb: number } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [viewingDeletedOrder, setViewingDeletedOrder] = useState<any | null>(null);

  // ── Server-side data via RPCs ──
  const [pendingValue, setPendingValue] = useState(0);
  const [productionCounts, setProductionCounts] = useState<{ in_production: number; total: number }>({ in_production: 0, total: 0 });
  const [chartData, setChartData] = useState<{ name: string; vendas: number }[]>([]);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [comprovantesRevendedor, setComprovantesRevendedor] = useState<{ count: number; total: number }>({ count: 0, total: 0 });

  // Fetch vendedores list
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('orders').select('vendedor, cliente');
      if (!data) return;
      const names = new Set<string>();
      data.forEach((o: any) => {
        if (o.vendedor) names.add(o.vendedor);
        if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) names.add(o.cliente.trim());
      });
      setVendedores([...names].sort());
    })();
  }, []);

  // Fetch pending value via RPC
  useEffect(() => {
    (async () => {
      const vendor = receberVendedor === 'todos' ? null : receberVendedor;
      const { data } = await supabase.rpc('get_pending_value', { vendor });
      if (data !== null && data !== undefined) setPendingValue(Number(data));
    })();
  }, [receberVendedor]);

  // Fetch production counts via RPC
  useEffect(() => {
    (async () => {
      const productTypes = prodProductFilter.size > 0 ? [...prodProductFilter] : null;
      const vendors = prodVendedorFilter.size > 0 ? [...prodVendedorFilter] : null;
      const { data } = await supabase.rpc('get_production_counts', {
        product_types: productTypes,
        vendors: vendors,
      });
      if (data && data.length > 0) {
        setProductionCounts({ in_production: Number(data[0].in_production), total: Number(data[0].total) });
      }
    })();
  }, [prodProductFilter, prodVendedorFilter]);

  // Fetch chart data via RPC
  useEffect(() => {
    (async () => {
      const vendor = chartVendedorFilter === 'todos' ? null : chartVendedorFilter;
      const { data } = await supabase.rpc('get_sales_chart', {
        period: chartPeriod,
        product_filter: chartProductFilter,
        vendor_filter: vendor,
      });
      if (data) {
        setChartData(data.map((d: any) => ({ name: d.label, vendas: Number(d.vendas) })));
      }
    })();
  }, [chartPeriod, chartProductFilter, chartVendedorFilter]);

  // Solado board queries via useOrdersQuery
  const { orders: solaCouroOrders } = useOrdersQuery({
    onlyBotas: true,
    soladoValues: ['couro reta', 'couro carrapeta', 'couro carrapeta com espaço espora', 'couro carrapeta com espaço de espora'],
  });

  const { orders: solaRusticaOrders } = useOrdersQuery({
    onlyBotas: true,
    soladoValues: ['rústica'],
  });

  const { orders: viraColoridaOrders } = useOrdersQuery({
    onlyBotas: true,
    corViraValues: ['rosa', 'preta'],
  });

  // Alert orders: overdue or regressed (need all non-final orders)
  const [alertOrders, setAlertOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!isAdminMaster) return;
    (async () => {
      const FINAL_STAGES = ['Expedição', 'Entregue', 'Cobrado', 'Pago'];
      // Fetch non-final orders + orders with dias_restantes=0
      const { data } = await supabase.from('orders').select('*')
        .not('status', 'in', `(${FINAL_STAGES.join(',')})`)
        .order('created_at', { ascending: false })
        .range(0, 499);
      if (!data) return;
      const orders = data.map(dbRowToOrder);
      const alerts = orders.filter(o => {
        const overdue = o.diasRestantes === 0;
        const regressed = o.historico.some((h: any) => FINAL_STAGES.includes(h.local));
        return overdue || regressed;
      });
      setAlertOrders(alerts);
    })();
  }, [isAdminMaster]);

  // Side effects
  const fetchStorageInfo = useCallback(async () => {
    if (!isAdminMaster) return;
    setStorageLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('storage-info');
      if (!error && data) {
        setStorageInfo(data);
        sessionStorage.setItem('storage_info', JSON.stringify(data));
      }
    } catch {} finally { setStorageLoading(false); }
  }, [isAdminMaster]);

  useEffect(() => { fetchStorageInfo(); }, [fetchStorageInfo]);

  const fetchDeletedOrders = useCallback(async () => {
    if (!isAdminMaster) return;
    const { data } = await supabase.from('deleted_orders').select('*').eq('dismissed', false).order('deleted_at', { ascending: false });
    if (data) setDeletedOrders(data);
  }, [isAdminMaster]);

  useEffect(() => { fetchDeletedOrders(); }, [fetchDeletedOrders]);

  const handleCleanup = async () => {
    setCleanupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-old-orders');
      if (error) { toast.error('Erro ao limpar dados: ' + error.message); }
      else { toast.success(`Limpeza concluída! ${data.orders_cleaned} pedidos podados, ${data.deleted_orders_removed} registros removidos.`); fetchStorageInfo(); fetchDeletedOrders(); }
    } catch { toast.error('Erro ao limpar dados'); }
    finally { setCleanupLoading(false); }
  };

  const handleRestoreOrder = async (deletedRecord: any) => {
    try {
      const orderData = deletedRecord.order_data;
      const { error } = await supabase.from('orders').insert(orderData);
      if (error) { toast.error('Erro ao restaurar pedido: ' + error.message); return; }
      await supabase.from('deleted_orders').delete().eq('id', deletedRecord.id);
      setDeletedOrders(prev => prev.filter(d => d.id !== deletedRecord.id));
      toast.success('Pedido restaurado com sucesso!');
      window.location.reload();
    } catch { toast.error('Erro ao restaurar pedido'); }
  };

  const handleDismissDeleted = async (deletedId: string) => {
    await supabase.from('deleted_orders').update({ dismissed: true } as any).eq('id', deletedId);
    setDeletedOrders(prev => prev.filter(d => d.id !== deletedId));
  };

  const handleChecked = (orderId: string) => {
    setCheckedAlertIds(prev => {
      const next = new Set(prev);
      next.add(orderId);
      localStorage.setItem('alert_checked_orders', JSON.stringify([...next]));
      return next;
    });
  };

  const filteredAlertOrders = alertOrders.filter(o => !checkedAlertIds.has(o.id));

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Sales chart */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0} className="bg-card rounded-xl p-6 western-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <BarChart3 className="text-primary" size={22} /> Quantidade de vendas
              </h2>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['dia', 'semana', 'mes', 'ano'] as const).map((p) =>
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${chartPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10'}`}>
                  {p === 'mes' ? 'Mês' : p}
                </button>
              )}
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Select value={chartProductFilter} onValueChange={setChartProductFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos produtos</SelectItem>
                  <SelectItem value="bota">Bota</SelectItem>
                  <SelectItem value="regata">Regata</SelectItem>
                  <SelectItem value="bota_pronta_entrega">Bota P.E.</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chartVendedorFilter} onValueChange={setChartVendedorFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos vendedores</SelectItem>
                  {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 20% 80%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(20 10% 40%)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(20 10% 40%)' }} />
                  <Tooltip formatter={(v: number) => [v, 'Vendas']} />
                  <Line type="monotone" dataKey="vendas" stroke="hsl(25 85% 48%)" strokeWidth={3} dot={{ fill: 'hsl(25 85% 48%)', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* A receber */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0} className="bg-card rounded-xl p-6 western-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <DollarSign className="text-primary" size={22} /> A receber
              </h2>
              <Select value={receberVendedor} onValueChange={setReceberVendedor}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos vendedores</SelectItem>
                  {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor a Receber</p>
              <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(pendingValue)}</p>
            </div>
          </motion.div>

          {/* Produtos na produção */}
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <AlignStartVertical className="text-primary" size={22} /> Produtos na produção
            </h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-primary/10 transition-colors flex items-center gap-1">
                    Produto {prodProductFilter.size > 0 && `(${prodProductFilter.size})`} <ChevronDown size={14} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto">
                  {PROD_PRODUCT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                      <Checkbox checked={prodProductFilter.has(opt.value)} onCheckedChange={(checked) => {
                        setProdProductFilter(prev => { const next = new Set(prev); checked ? next.add(opt.value) : next.delete(opt.value); return next; });
                      }} />
                      {opt.label}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-primary/10 transition-colors flex items-center gap-1">
                    Vendedor {prodVendedorFilter.size > 0 && `(${prodVendedorFilter.size})`} <ChevronDown size={14} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 max-h-60 overflow-y-auto">
                  {vendedores.map(v => (
                    <label key={v} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                      <Checkbox checked={prodVendedorFilter.has(v)} onCheckedChange={(checked) => {
                        setProdVendedorFilter(prev => { const next = new Set(prev); checked ? next.add(v) : next.delete(v); return next; });
                      }} />
                      {v}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total em produção</p>
              <p className="text-3xl font-bold text-primary mt-1">{productionCounts.in_production} {productionCounts.in_production === 1 ? 'produto' : 'produtos'}</p>
            </div>
            <Progress value={productionCounts.in_production > 0 ? Math.min(productionCounts.in_production / Math.max(productionCounts.total, 1) * 100, 100) : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{productionCounts.in_production} de {productionCounts.total} produtos totais estão em produção</p>
          </motion.div>
        </div>
      </div>

      {/* Pedidos de Alerta — only admin_master */}
      {isAdminMaster && filteredAlertOrders.length > 0 && (
        <div className="mt-8">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={2} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <AlertTriangle className="text-destructive" size={22} /> Pedidos de Alerta
            </h2>
            <p className="text-sm text-muted-foreground mb-3">Pedidos atrasados ou que regrediram na produção</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredAlertOrders.map(o => (
                <div key={o.id} className="flex items-center gap-2">
                  <Link to={`/pedido/${o.id}`} className="flex-1 flex items-center justify-between p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors">
                    <div>
                      <span className="font-bold text-sm">{o.numero}</span>
                      <span className="text-xs text-muted-foreground ml-2">{'—'} {o.vendedor}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold bg-destructive/20 text-destructive px-2 py-0.5 rounded">{o.status}</span>
                      {o.diasRestantes === 0 && <span className="text-xs text-destructive ml-2">Prazo atingido</span>}
                    </div>
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleChecked(o.id); }}
                    className="shrink-0 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Marcar como conferido"
                  >
                    <Check size={14} /> Conferido
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Pedidos Apagados — only admin_master */}
      {isAdminMaster && deletedOrders.length > 0 && (
        <div className="mt-8">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={3} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <Trash2 className="text-destructive" size={22} /> Pedidos Apagados
            </h2>
            <p className="text-sm text-muted-foreground mb-3">Pedidos removidos por usuários</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {deletedOrders.map(d => {
                const od = d.order_data || {};
                return (
                  <div key={d.id} className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm">{od.numero || 'S/N'}</span>
                          <span className="text-xs text-muted-foreground ml-2">{'—'} {od.vendedor || 'N/A'}</span>
                        </div>
                        <span className="text-xs text-destructive font-semibold">Removido</span>
                      </div>
                    </div>
                    <button onClick={() => setViewingDeletedOrder(d)} className="shrink-0 px-2 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs transition-colors" title="Visualizar">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleRestoreOrder(d)} className="shrink-0 px-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors" title="Restaurar pedido">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => handleDismissDeleted(d.id)} className="shrink-0 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors" title="Marcar como conferido">
                      <Check size={14} /> Conferido
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Dialog para visualizar pedido apagado */}
      <Dialog open={!!viewingDeletedOrder} onOpenChange={open => !open && setViewingDeletedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido Apagado {'—'} {viewingDeletedOrder?.order_data?.numero || 'S/N'}</DialogTitle>
          </DialogHeader>
          {viewingDeletedOrder && (
            <div className="space-y-2 text-sm">
              {Object.entries(viewingDeletedOrder.order_data || {}).filter(([k]) => !['id', 'created_at', 'historico', 'alteracoes', 'fotos', 'user_id'].includes(k)).map(([key, val]) => (
                <div key={key} className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground font-medium">{key}</span>
                  <span className="text-right max-w-[60%] break-words">{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Specialized reports */}
      <div className="mt-8">
        <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={4}>
          <SpecializedReports reports={['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'corte', 'expedicao', 'cobranca', 'extras_cintos']} />
        </motion.div>
      </div>

      <div className="mt-8 space-y-6">
        <SoladoBoard title="Pedidos com sola de couro" orders={solaCouroOrders} storageKey="dismissed_sola_couro" />
        <SoladoBoard title="Pedidos com sola rústica" orders={solaRusticaOrders} storageKey="dismissed_sola_rustica" />
        <SoladoBoard title="Pedidos com vira colorida" orders={viraColoridaOrders} storageKey="dismissed_vira_colorida" />
      </div>

      {/* Storage monitoring — only admin_master */}
      {isAdminMaster && storageInfo && (
        <div className="mt-8">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={5} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <HardDrive className="text-primary" size={22} /> Armazenamento Supabase
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {storageInfo.db_size_mb} MB / {storageInfo.limit_mb} MB
                  </span>
                  {storageInfo.db_size_mb / storageInfo.limit_mb > 0.8 && (
                    <span className="text-xs font-bold text-destructive flex items-center gap-1">
                      <AlertTriangle size={14} /> Próximo do limite!
                    </span>
                  )}
                </div>
                <Progress
                  value={Math.min((storageInfo.db_size_mb / storageInfo.limit_mb) * 100, 100)}
                  className={`h-4 ${storageInfo.db_size_mb / storageInfo.limit_mb > 0.8 ? '[&>div]:bg-destructive' : ''}`}
                />
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{storageInfo.order_count} pedidos no banco</span>
                <span>{storageInfo.deleted_order_count} registros de pedidos apagados</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={cleanupLoading}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {cleanupLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Limpar dados antigos
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza que deseja limpar os dados antigos?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Pedidos com status <strong>"Pago"</strong> há mais de 90 dias terão seus detalhes removidos permanentemente (fotos, histórico, alterações, observações, número, modelo, etc.).
                      <br /><br />
                      <strong>Apenas vendedor, quantidade e valor serão mantidos</strong> para os gráficos de vendas.
                      <br /><br />
                      Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Confirmar limpeza
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
