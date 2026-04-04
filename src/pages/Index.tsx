import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Eye, BarChart3, DollarSign, AlertCircle, AlignStartVertical, FileText, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SpecializedReports from '@/components/SpecializedReports';
import CommissionPanel from '@/components/CommissionPanel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const Index = () => {
  const { isLoggedIn, isAdmin, isFernanda, orders, allOrders, user, allProfiles } = useAuth();
  const [chartPeriod, setChartPeriod] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes');
  const [receberVendedor, setReceberVendedor] = useState<string>('todos');
  const [chartProductFilter, setChartProductFilter] = useState<string>('todos');
  const [chartVendedorFilter, setChartVendedorFilter] = useState<string>('todos');
  const [prodProductFilter, setProdProductFilter] = useState<Set<string>>(new Set());
  const [prodVendedorFilter, setProdVendedorFilter] = useState<Set<string>>(new Set());
  const [checkedAlertIds, setCheckedAlertIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('alert_checked_orders');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const handleChecked = (orderId: string) => {
    setCheckedAlertIds(prev => {
      const next = new Set(prev);
      next.add(orderId);
      localStorage.setItem('alert_checked_orders', JSON.stringify([...next]));
      return next;
    });
  };

  const sourceOrders = isAdmin ? allOrders : orders;

  const vendedores = useMemo(() => {
    const names = [...new Set(sourceOrders.map((o) => o.vendedor))].sort();
    return names;
  }, [sourceOrders]);

  const PRODUCTION_STATUSES_IN_PROD = [
    'Aguardando', 'Corte', 'Sem bordado',
    'Bordado Dinei', 'Bordado Sandro', 'Bordado 7Estrivos',
    'Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05',
    'Pespontando', 'Montagem', 'Revisão', 'Expedição'];

  const financialData = useMemo(() => {
    const filtered = sourceOrders.filter((o) => (o.status === 'Entregue' || o.status === 'Cobrado') && (receberVendedor === 'todos' || o.vendedor === receberVendedor));
    const aReceber = filtered.reduce((s, o) => s + o.preco * o.quantidade, 0);
    return { aReceber };
  }, [sourceOrders, receberVendedor]);

  const EXCLUDED_PREFIXES = ['TROCA', 'REFAZENDO', 'ERRO', 'INFLUENCER'];
  const isExcludedOrder = (numero: string) => EXCLUDED_PREFIXES.some(p => numero.toUpperCase().startsWith(p));

  const PROD_PRODUCT_OPTIONS = [
    { value: 'bota', label: 'Bota' },
    { value: 'regata', label: 'Regata' },
    { value: 'bota_pronta_entrega', label: 'Bota P.E.' },
    { value: 'cinto', label: 'Cinto' },
  ];

  const getProductType = (o: { tipoExtra?: string | null }) => {
    if (!o.tipoExtra) return 'bota';
    return o.tipoExtra;
  };

  const produtosProducao = useMemo(() => {
    return sourceOrders
      .filter((o) => PRODUCTION_STATUSES_IN_PROD.some((s) => s.toLowerCase() === o.status.toLowerCase()))
      .filter((o) => prodProductFilter.size === 0 || prodProductFilter.has(getProductType(o)))
      .filter((o) => prodVendedorFilter.size === 0 || prodVendedorFilter.has(o.vendedor))
      .reduce((s, o) => s + o.quantidade, 0);
  }, [sourceOrders, prodProductFilter, prodVendedorFilter]);

  const totalProducao = useMemo(() => {
    return sourceOrders
      .filter((o) => prodProductFilter.size === 0 || prodProductFilter.has(getProductType(o)))
      .filter((o) => prodVendedorFilter.size === 0 || prodVendedorFilter.has(o.vendedor))
      .reduce((s, o) => s + o.quantidade, 0);
  }, [sourceOrders, prodProductFilter, prodVendedorFilter]);

  const chartData = useMemo(() => {
    const data: { name: string; vendas: number }[] = [];
    const now = new Date();

    // Exclude special orders from sales count
    const chartOrders = sourceOrders.filter(o => !isExcludedOrder(o.numero)).filter(o => {
      // Product filter
      if (chartProductFilter === 'bota') return !o.tipoExtra;
      if (chartProductFilter === 'regata') return o.tipoExtra === 'regata';
      if (chartProductFilter === 'bota_pronta_entrega') return o.tipoExtra === 'bota_pronta_entrega';
      // 'todos' = bota + regata + bota_pronta_entrega
      return !o.tipoExtra || o.tipoExtra === 'regata' || o.tipoExtra === 'bota_pronta_entrega';
    }).filter(o => {
      if (chartVendedorFilter === 'todos') return true;
      return o.vendedor === chartVendedorFilter;
    });

    if (chartPeriod === 'dia') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toISOString().split('T')[0];
        data.push({ name: `${d.getDate()}/${d.getMonth() + 1}`, vendas: chartOrders.filter((o) => o.dataCriacao === key).reduce((s, o) => s + o.quantidade, 0) });
      }
    } else if (chartPeriod === 'semana') {
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 7 * 86400000);
        const start = new Date(end.getTime() - 7 * 86400000);
        const vendas = chartOrders.filter((o) => o.dataCriacao >= start.toISOString().split('T')[0] && o.dataCriacao <= end.toISOString().split('T')[0]).reduce((s, o) => s + o.quantidade, 0);
        data.push({ name: `Sem ${4 - i}`, vendas });
      }
    } else if (chartPeriod === 'mes') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const vendas = chartOrders.filter((o) => o.dataCriacao >= d.toISOString().split('T')[0] && o.dataCriacao <= monthEnd.toISOString().split('T')[0]).reduce((s, o) => s + o.quantidade, 0);
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        data.push({ name: months[d.getMonth()], vendas });
      }
    } else {
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const vendas = chartOrders.filter((o) => o.dataCriacao.startsWith(`${year}`)).reduce((s, o) => s + o.quantidade, 0);
        data.push({ name: `${year}`, vendas });
      }
    }
    return data;
  }, [chartPeriod, sourceOrders, chartProductFilter, chartVendedorFilter]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Fernanda ADM: only reports, no charts ──
  const renderFernandaDashboard = () => (
    <section className="container mx-auto px-4 py-8">
      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
        <SpecializedReports reports={['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'expedicao', 'extras_cintos']} />
      </motion.div>
    </section>
  );

  // ── 7Estrivos ADM: full dashboard + reports ──
  const renderAdminDashboard = () => (
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
              <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(financialData.aReceber)}</p>
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
                <PopoverContent className="w-48 p-2">
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
              <p className="text-3xl font-bold text-primary mt-1">{produtosProducao} {produtosProducao === 1 ? 'produto' : 'produtos'}</p>
            </div>
            <Progress value={produtosProducao > 0 ? Math.min(produtosProducao / Math.max(totalProducao, 1) * 100, 100) : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">{produtosProducao} de {totalProducao} produtos totais estão em produção</p>
          </motion.div>
        </div>
      </div>

      {/* Pedidos de Alerta — only Juliana (admin-1) */}
      {user?.nomeUsuario?.toLowerCase() === '7estrivos' && (() => {
        const FINAL_STAGES = ['Expedição', 'Entregue', 'Cobrado', 'Pago'];
        const alertOrders = sourceOrders.filter(o => {
          const overdue = o.diasRestantes === 0 && !FINAL_STAGES.includes(o.status);
          const regressed = o.historico.some(h => FINAL_STAGES.includes(h.local)) && !FINAL_STAGES.includes(o.status);
          return overdue || regressed;
        }).filter(o => !checkedAlertIds.has(o.id));
        return alertOrders.length > 0 ? (
          <div className="mt-8">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={2} className="bg-card rounded-xl p-6 western-shadow">
              <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
                <AlertTriangle className="text-destructive" size={22} /> Pedidos de Alerta
              </h2>
              <p className="text-sm text-muted-foreground mb-3">Pedidos atrasados ou que regrediram na produção</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {alertOrders.map(o => (
                  <div key={o.id} className="flex items-center gap-2">
                    <Link to={`/pedido/${o.id}`} className="flex-1 flex items-center justify-between p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors">
                      <div>
                        <span className="font-bold text-sm">{o.numero}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {o.vendedor}</span>
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
        ) : null;
      })()}

      {/* Specialized reports section */}
      <div className="mt-8">
        <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={3}>
          <SpecializedReports reports={['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'expedicao', 'cobranca', 'extras_cintos']} />
        </motion.div>
      </div>
    </section>
  );

  // ── Revendedor: pendente + produção + gráfico ──
  const renderVendedorDashboard = () => {
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
                <PopoverContent className="w-48 p-2">
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

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden flex items-center bg-primary" style={{ minHeight: '320px' }}>
        <div className="relative z-10 container mx-auto px-4 py-12">
          <motion.div initial="hidden" animate="visible" className="max-w-lg">
            <motion.h1 variants={fadeIn} custom={0} className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Portal de Representantes
            </motion.h1>
            <motion.p variants={fadeIn} custom={1} className="text-white/90 text-lg mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Crie fichas de produção, acompanhe seus pedidos e gerencie suas vendas no portal exclusivo para revendedores.
            </motion.p>
            <motion.div variants={fadeIn} custom={2} className="flex gap-3 flex-wrap">
              <Link to="/pedido" className="bg-white text-primary px-6 py-3 rounded-lg font-bold tracking-wider hover:bg-white/90 transition-opacity inline-flex items-center gap-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <ShoppingBag size={18} /> FAÇA SEU PEDIDO
              </Link>
              <Link to="/relatorios" className="bg-white/20 backdrop-blur text-white border border-white/40 px-6 py-3 rounded-lg font-bold tracking-wider hover:bg-white/30 transition-colors inline-flex items-center gap-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <Eye size={18} /> MEUS PEDIDOS
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard content */}
      {isLoggedIn ? (
        isFernanda ? renderFernandaDashboard() :
        isAdmin ? renderAdminDashboard() :
        renderVendedorDashboard()
      ) : (
        <section className="container mx-auto px-4 py-12 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
            <h2 className="text-2xl font-display font-bold mb-4">Faça login para acessar o dashboard</h2>
            <p className="text-muted-foreground mb-6">Acesse sua conta de revendedor para ver vendas, pedidos e relatórios.</p>
            <Link to="/login" className="orange-gradient text-primary-foreground px-8 py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity inline-block">
              ENTRAR
            </Link>
          </motion.div>
        </section>
      )}
    </div>
  );
};

export default Index;
