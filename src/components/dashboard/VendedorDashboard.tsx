import { motion } from 'framer-motion';
import { BarChart3, AlertCircle, AlignStartVertical, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import CommissionPanel from '@/components/CommissionPanel';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

interface VendedorDashboardProps {
  user: any;
  orders: any[];
  financialData: { aReceber: number };
  chartData: { name: string; vendas: number }[];
  chartPeriod: 'dia' | 'semana' | 'mes' | 'ano';
  setChartPeriod: (p: 'dia' | 'semana' | 'mes' | 'ano') => void;
  chartProductFilter: string;
  setChartProductFilter: (v: string) => void;
  prodProductFilter: Set<string>;
  setProdProductFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  PROD_PRODUCT_OPTIONS: { value: string; label: string }[];
  produtosProducao: number;
  totalProducao: number;
  formatCurrency: (v: number) => string;
}

const VendedorDashboard = ({
  user, orders, financialData, chartData,
  chartPeriod, setChartPeriod,
  chartProductFilter, setChartProductFilter,
  prodProductFilter, setProdProductFilter,
  PROD_PRODUCT_OPTIONS, produtosProducao, totalProducao, formatCurrency
}: VendedorDashboardProps) => {
  const isSiteUser = user?.nomeUsuario?.toLowerCase() === 'site';
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Pendente — hidden for 'site' user */}
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

          {/* Commission panel — only for "site" user */}
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
