import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Eye } from 'lucide-react';
import FernandaDashboard from '@/components/dashboard/FernandaDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import VendedorDashboard from '@/components/dashboard/VendedorDashboard';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const Index = () => {
  const { isLoggedIn, role, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen" />;
  }
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  if (role === 'bordado') {
    return <Navigate to="/bordado" replace />;
  }

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

      {/* Dashboard by role */}
      {authLoading ? (
        <section className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Carregando...
        </section>
      ) : isLoggedIn ? (
        role === 'admin_producao' ? (
          <FernandaDashboard />
        ) : role === 'admin_master' ? (
          <AdminDashboard />
        ) : (
          <VendedorDashboard />
        )
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
