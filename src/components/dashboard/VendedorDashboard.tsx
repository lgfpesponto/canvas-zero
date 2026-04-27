import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, AlertCircle, AlignStartVertical, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import CommissionPanel from '@/components/CommissionPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import {
  PROD_PRODUCT_OPTIONS,
  formatCurrency,
} from '@/lib/order-logic';
import { LoadingValue } from '@/components/ui/LoadingValue';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order } from '@/contexts/AuthContext';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const VendedorDashboard = () => {
  const { user, role } = useAuth();
  const isSiteUser = role === 'vendedor_comissao';

  const [chartPeriod, setChartPeriod] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes');
  const [chartProductFilter, setChartProductFilter] = useState('todos');
  const [prodProductFilter, setProdProductFilter] = useState<Set<string>>(new Set());

  // Server-side data
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [productionCounts, setProductionCounts] = useState<{ in_production: number; total: number } | null>(null);
  const [productionLoading, setProductionLoading] = useState(true);
  const [chartData, setChartData] = useState<{ name: string; vendas: number }[] | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [commissionOrders, setCommissionOrders] = useState<Order[]>([]);

  // Fetch pending value (vendedor's own orders - handled by RLS)
  useEffect(() => {
    if (isSiteUser) { setPendingLoading(false); return; }
    setPendingLoading(true);
    (async () => {
      try {
        const vendor = user?.nomeCompleto || null;
        const { data } = await supabase.rpc('get_pending_value', { vendor });
        setPendingValue(data !== null && data !== undefined ? Number(data) : 0);
      } finally {
        setPendingLoading(false);
      }
    })();
  }, [user?.nomeCompleto, isSiteUser]);

  // Fetch production counts
  useEffect(() => {
    setProductionLoading(true);
    (async () => {
      try {
        const productTypes = prodProductFilter.size > 0 ? [...prodProductFilter] : null;
        const vendor = user?.nomeCompleto;
        const { data } = await supabase.rpc('get_production_counts', {
          product_types: productTypes,
          vendors: vendor ? [vendor] : null,
        });
        if (data && data.length > 0) {
          setProductionCounts({ in_production: Number(data[0].in_production), total: Number(data[0].total) });
        } else {
          setProductionCounts({ in_production: 0, total: 0 });
        }
      } finally {
        setProductionLoading(false);
      }
    })();
  }, [prodProductFilter, user?.nomeCompleto]);

  // Fetch chart data
  useEffect(() => {
    setChartLoading(true);
    (async () => {
      try {
        const vendor = user?.nomeCompleto || null;
        const { data } = await supabase.rpc('get_sales_chart', {
          period: chartPeriod,
          product_filter: chartProductFilter,
          vendor_filter: vendor,
        });
        setChartData(data ? data.map((d: any) => ({ name: d.label, vendas: Number(d.vendas) })) : []);
      } finally {
        setChartLoading(false);
      }
    })();
  }, [chartPeriod, chartProductFilter, user?.nomeCompleto]);

  // Fetch commission orders for vendedor_comissao
  useEffect(() => {
    if (!isSiteUser) return;
    (async () => {
      const { data } = await supabase.from('orders').select('*')
        .order('data_criacao', { ascending: false })
        .range(0, 999);
      if (data) setCommissionOrders(data.map(dbRowToOrder));
    })();
  }, [isSiteUser]);

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Pendente — hidden for vendedor_comissao */}
          {!isSiteUser && (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0} className="bg-card rounded-xl p-6 western-shadow">
            <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
              <AlertCircle className="text-primary" size={22} /> Pendente
            </h2>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor Pendente</p>
              <p className="text-3xl font-bold text-primary mt-1">
                <LoadingValue loading={pendingLoading} hasData={pendingValue !== null} size={24}>
                  {formatCurrency(pendingValue ?? 0)}
                </LoadingValue>
              </p>
            </div>
          </motion.div>
          )}

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
            </div>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total em produção</p>
              <p className="text-3xl font-bold text-primary mt-1">
                <LoadingValue loading={productionLoading} hasData={productionCounts !== null} size={24}>
                  {productionCounts?.in_production ?? 0} {(productionCounts?.in_production ?? 0) === 1 ? 'produto' : 'produtos'}
                </LoadingValue>
              </p>
            </div>
            <Progress value={productionCounts && productionCounts.in_production > 0 ? Math.min(productionCounts.in_production / Math.max(productionCounts.total, 1) * 100, 100) : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              <LoadingValue loading={productionLoading} hasData={productionCounts !== null} size={14}>
                {productionCounts?.in_production ?? 0} de {productionCounts?.total ?? 0} produtos totais estão em produção
              </LoadingValue>
            </p>
          </motion.div>

          {/* Commission panel — only for vendedor_comissao */}
          {isSiteUser && (
            <CommissionPanel orders={commissionOrders} />
          )}
        </div>

        {/* Right column: Sales chart */}
        <div className="space-y-6">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={2} className="bg-card rounded-xl p-6 western-shadow">
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
            <div className="flex gap-2 mb-4">
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
            </div>
            <div className="h-64">
              {chartLoading && !chartData ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 20% 80%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(20 10% 40%)' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(20 10% 40%)' }} />
                    <Tooltip formatter={(v: number) => [v, 'Vendas']} />
                    <Line type="monotone" dataKey="vendas" stroke="hsl(25 85% 48%)" strokeWidth={3} dot={{ fill: 'hsl(25 85% 48%)', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VendedorDashboard;
