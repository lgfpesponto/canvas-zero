import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, AlertCircle, AlignStartVertical, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import CommissionPanel from '@/components/CommissionPanel';
import { useAuth } from '@/contexts/AuthContext';
import {
  PRODUCTION_STATUSES_IN_PROD, PROD_PRODUCT_OPTIONS,
  isExcludedOrder, getProductType,
  matchVendedorFilter, formatCurrency,
} from '@/lib/order-logic';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const VendedorDashboard = () => {
  const { orders, user, role } = useAuth();
  const isSiteUser = role === 'vendedor_comissao';

  const [chartPeriod, setChartPeriod] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes');
  const [chartProductFilter, setChartProductFilter] = useState('todos');
  const [prodProductFilter, setProdProductFilter] = useState<Set<string>>(new Set());

  const financialData = useMemo(() => {
    const filtered = orders.filter(o => o.status === 'Entregue' || o.status === 'Cobrado');
    return { aReceber: filtered.reduce((s, o) => s + o.preco * o.quantidade, 0) };
  }, [orders]);

  const produtosProducao = useMemo(() => {
    return orders
      .filter(o => PRODUCTION_STATUSES_IN_PROD.some(s => s.toLowerCase() === o.status.toLowerCase()))
      .filter(o => prodProductFilter.size === 0 || prodProductFilter.has(getProductType(o)))
      .reduce((s, o) => s + o.quantidade, 0);
  }, [orders, prodProductFilter]);

  const totalProducao = useMemo(() => {
    return orders
      .filter(o => prodProductFilter.size === 0 || prodProductFilter.has(getProductType(o)))
      .reduce((s, o) => s + o.quantidade, 0);
  }, [orders, prodProductFilter]);

  const chartData = useMemo(() => {
    const data: { name: string; vendas: number }[] = [];
    const now = new Date();
    const chartOrders = orders
      .filter(o => !isExcludedOrder(o.numero))
      .filter(o => {
        if (chartProductFilter === 'bota') return !o.tipoExtra;
        if (chartProductFilter === 'regata') return o.tipoExtra === 'regata';
        if (chartProductFilter === 'bota_pronta_entrega') return o.tipoExtra === 'bota_pronta_entrega';
        return !o.tipoExtra || o.tipoExtra === 'regata' || o.tipoExtra === 'bota_pronta_entrega';
      });

    if (chartPeriod === 'dia') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toISOString().split('T')[0];
        data.push({ name: `${d.getDate()}/${d.getMonth() + 1}`, vendas: chartOrders.filter(o => o.dataCriacao === key).reduce((s, o) => s + o.quantidade, 0) });
      }
    } else if (chartPeriod === 'semana') {
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 7 * 86400000);
        const start = new Date(end.getTime() - 7 * 86400000);
        const vendas = chartOrders.filter(o => o.dataCriacao >= start.toISOString().split('T')[0] && o.dataCriacao <= end.toISOString().split('T')[0]).reduce((s, o) => s + o.quantidade, 0);
        data.push({ name: `Sem ${4 - i}`, vendas });
      }
    } else if (chartPeriod === 'mes') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const vendas = chartOrders.filter(o => o.dataCriacao >= d.toISOString().split('T')[0] && o.dataCriacao <= monthEnd.toISOString().split('T')[0]).reduce((s, o) => s + o.quantidade, 0);
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        data.push({ name: months[d.getMonth()], vendas });
      }
    } else {
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const vendas = chartOrders.filter(o => o.dataCriacao.startsWith(`${year}`)).reduce((s, o) => s + o.quantidade, 0);
        data.push({ name: `${year}`, vendas });
      }
    }
    return data;
  }, [chartPeriod, orders, chartProductFilter]);

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
              <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(financialData.aReceber)}</p>
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
              <p className="text-3xl font-bold text-primary mt-1">{produtosProducao} {produtosProducao === 1 ? 'produto' : 'produtos'}</p>
            </div>
            <Progress value={produtosProducao > 0 ? Math.min(produtosProducao / Math.max(totalProducao, 1) * 100, 100) : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{produtosProducao} de {totalProducao} produtos totais estão em produção</p>
          </motion.div>

          {/* Commission panel — only for vendedor_comissao */}
          {isSiteUser && (
            <CommissionPanel orders={orders} />
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
      </div>
    </section>
  );
};

export default VendedorDashboard;
