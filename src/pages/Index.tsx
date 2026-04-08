import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Eye } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { EXTRA_PRODUCTS } from '@/lib/extrasConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FernandaDashboard from '@/components/dashboard/FernandaDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import VendedorDashboard from '@/components/dashboard/VendedorDashboard';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const Index = () => {
  const { isLoggedIn, isAdmin, isFernanda, orders, allOrders, user, allProfiles, addOrder } = useAuth();
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

  const [deletedOrders, setDeletedOrders] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ db_size_mb: number; order_count: number; deleted_order_count: number; limit_mb: number } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const isJuliana = user?.nomeUsuario?.toLowerCase() === '7estrivos';

  const fetchStorageInfo = useCallback(async () => {
    if (!isAdmin || !isJuliana) return;
    setStorageLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('storage-info');
      if (!error && data) {
        setStorageInfo(data);
        sessionStorage.setItem('storage_info', JSON.stringify(data));
      }
    } catch {} finally {
      setStorageLoading(false);
    }
  }, [isAdmin, isJuliana]);

  useEffect(() => { fetchStorageInfo(); }, [fetchStorageInfo]);

  const fetchDeletedOrders = useCallback(async () => {
    if (!isAdmin || user?.nomeUsuario?.toLowerCase() !== '7estrivos') return;
    const { data } = await supabase.from('deleted_orders').select('*').eq('dismissed', false).order('deleted_at', { ascending: false });
    if (data) setDeletedOrders(data);
  }, [isAdmin, user]);

  useEffect(() => { fetchDeletedOrders(); }, [fetchDeletedOrders]);

  const handleCleanup = async () => {
    setCleanupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-old-orders');
      if (error) {
        toast.error('Erro ao limpar dados: ' + error.message);
      } else {
        toast.success(`Limpeza conclu\u00EDda! ${data.orders_cleaned} pedidos podados, ${data.deleted_orders_removed} registros removidos.`);
        fetchStorageInfo();
        fetchDeletedOrders();
      }
    } catch {
      toast.error('Erro ao limpar dados');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleRestoreOrder = async (deletedRecord: any) => {
    try {
      const orderData = deletedRecord.order_data;
      const { error } = await supabase.from('orders').insert(orderData);
      if (error) {
        toast.error('Erro ao restaurar pedido: ' + error.message);
        return;
      }
      await supabase.from('deleted_orders').delete().eq('id', deletedRecord.id);
      setDeletedOrders(prev => prev.filter(d => d.id !== deletedRecord.id));
      toast.success('Pedido restaurado com sucesso!');
      window.location.reload();
    } catch (e) {
      toast.error('Erro ao restaurar pedido');
    }
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

  const sourceOrders = isAdmin ? allOrders : orders;

  const vendedores = useMemo(() => {
    const names = new Set(sourceOrders.map((o) => o.vendedor));
    sourceOrders.forEach(o => {
      if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
        names.add(o.cliente.trim());
      }
    });
    return [...names].sort();
  }, [sourceOrders]);

  const matchVendedorFilter = (o: { vendedor: string; cliente?: string }, filter: string) => {
    if (filter === 'todos') return true;
    if (o.vendedor === filter) return true;
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() === filter) return true;
    return false;
  };

  const matchVendedorFilterSet = (o: { vendedor: string; cliente?: string }, filterSet: Set<string>) => {
    if (filterSet.size === 0) return true;
    if (filterSet.has(o.vendedor)) return true;
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() && filterSet.has(o.cliente.trim())) return true;
    return false;
  };

  const PRODUCTION_STATUSES_IN_PROD = [
    'Aguardando', 'Corte', 'Sem bordado',
    'Bordado Dinei', 'Bordado Sandro', 'Bordado 7Estrivos',
    'Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05',
    'Pespontando', 'Montagem', 'Revis\u00E3o', 'Expedi\u00E7\u00E3o'];

  const financialData = useMemo(() => {
    const filtered = sourceOrders.filter((o) => (o.status === 'Entregue' || o.status === 'Cobrado') && matchVendedorFilter(o, receberVendedor));
    const aReceber = filtered.reduce((s, o) => s + o.preco * o.quantidade, 0);
    return { aReceber };
  }, [sourceOrders, receberVendedor]);

  const EXCLUDED_PREFIXES = ['TROCA', 'REFAZENDO', 'ERRO', 'INFLUENCER'];
  const isExcludedOrder = (numero: string) => EXCLUDED_PREFIXES.some(p => numero.toUpperCase().startsWith(p));

  const PROD_PRODUCT_OPTIONS = [
    { value: 'bota', label: 'Bota' },
    ...EXTRA_PRODUCTS.map(p => ({ value: p.id, label: p.nome })),
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
      .filter((o) => matchVendedorFilterSet(o, prodVendedorFilter))
      .reduce((s, o) => s + o.quantidade, 0);
  }, [sourceOrders, prodProductFilter, prodVendedorFilter]);

  const totalProducao = useMemo(() => {
    return sourceOrders
      .filter((o) => prodProductFilter.size === 0 || prodProductFilter.has(getProductType(o)))
      .filter((o) => matchVendedorFilterSet(o, prodVendedorFilter))
      .reduce((s, o) => s + o.quantidade, 0);
  }, [sourceOrders, prodProductFilter, prodVendedorFilter]);

  const chartData = useMemo(() => {
    const data: { name: string; vendas: number }[] = [];
    const now = new Date();
    const chartOrders = sourceOrders.filter(o => !isExcludedOrder(o.numero)).filter(o => {
      if (chartProductFilter === 'bota') return !o.tipoExtra;
      if (chartProductFilter === 'regata') return o.tipoExtra === 'regata';
      if (chartProductFilter === 'bota_pronta_entrega') return o.tipoExtra === 'bota_pronta_entrega';
      return !o.tipoExtra || o.tipoExtra === 'regata' || o.tipoExtra === 'bota_pronta_entrega';
    }).filter(o => matchVendedorFilter(o, chartVendedorFilter));

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

  const solaCouroOrders = useMemo(() => allOrders.filter(o =>
    !o.tipoExtra &&
    ['couro reta', 'couro carrapeta', 'couro carrapeta com espa\u00E7o espora', 'couro carrapeta com espa\u00E7o de espora']
      .some(s => (o.solado || '').toLowerCase() === s)
  ), [allOrders]);

  const solaRusticaOrders = useMemo(() => allOrders.filter(o =>
    !o.tipoExtra && (o.solado || '').toLowerCase() === 'r\u00FAstica'
  ), [allOrders]);

  const viraColoridaOrders = useMemo(() => allOrders.filter(o =>
    !o.tipoExtra && ['rosa', 'preta'].some(c => (o.corVira || '').toLowerCase() === c)
  ), [allOrders]);

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
              Crie fichas de produ\u00E7\u00E3o, acompanhe seus pedidos e gerencie suas vendas no portal exclusivo para revendedores.
            </motion.p>
            <motion.div variants={fadeIn} custom={2} className="flex gap-3 flex-wrap">
              <Link to="/pedido" className="bg-white text-primary px-6 py-3 rounded-lg font-bold tracking-wider hover:bg-white/90 transition-opacity inline-flex items-center gap-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <ShoppingBag size={18} /> FA\u00C7A SEU PEDIDO
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
        isFernanda ? (
          <FernandaDashboard
            solaCouroOrders={solaCouroOrders}
            solaRusticaOrders={solaRusticaOrders}
            viraColoridaOrders={viraColoridaOrders}
          />
        ) : isAdmin ? (
          <AdminDashboard
            sourceOrders={sourceOrders}
            user={user}
            vendedores={vendedores}
            chartPeriod={chartPeriod}
            setChartPeriod={setChartPeriod}
            receberVendedor={receberVendedor}
            setReceberVendedor={setReceberVendedor}
            chartProductFilter={chartProductFilter}
            setChartProductFilter={setChartProductFilter}
            chartVendedorFilter={chartVendedorFilter}
            setChartVendedorFilter={setChartVendedorFilter}
            prodProductFilter={prodProductFilter}
            setProdProductFilter={setProdProductFilter}
            prodVendedorFilter={prodVendedorFilter}
            setProdVendedorFilter={setProdVendedorFilter}
            financialData={financialData}
            chartData={chartData}
            PROD_PRODUCT_OPTIONS={PROD_PRODUCT_OPTIONS}
            produtosProducao={produtosProducao}
            totalProducao={totalProducao}
            checkedAlertIds={checkedAlertIds}
            handleChecked={handleChecked}
            deletedOrders={deletedOrders}
            handleRestoreOrder={handleRestoreOrder}
            handleDismissDeleted={handleDismissDeleted}
            solaCouroOrders={solaCouroOrders}
            solaRusticaOrders={solaRusticaOrders}
            viraColoridaOrders={viraColoridaOrders}
            storageInfo={storageInfo}
            cleanupLoading={cleanupLoading}
            handleCleanup={handleCleanup}
            isJuliana={isJuliana}
            formatCurrency={formatCurrency}
          />
        ) : (
          <VendedorDashboard
            user={user}
            orders={orders}
            financialData={financialData}
            chartData={chartData}
            chartPeriod={chartPeriod}
            setChartPeriod={setChartPeriod}
            chartProductFilter={chartProductFilter}
            setChartProductFilter={setChartProductFilter}
            prodProductFilter={prodProductFilter}
            setProdProductFilter={setProdProductFilter}
            PROD_PRODUCT_OPTIONS={PROD_PRODUCT_OPTIONS}
            produtosProducao={produtosProducao}
            totalProducao={totalProducao}
            formatCurrency={formatCurrency}
          />
        )
      ) : (
        <section className="container mx-auto px-4 py-12 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
            <h2 className="text-2xl font-display font-bold mb-4">Fa\u00E7a login para acessar o dashboard</h2>
            <p className="text-muted-foreground mb-6">Acesse sua conta de revendedor para ver vendas, pedidos e relat\u00F3rios.</p>
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
