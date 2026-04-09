import { useAuth } from '@/contexts/AuthContext';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Clock } from 'lucide-react';

const statusColors: Record<string, string> = {
  'Em aberto': 'bg-yellow-100 text-yellow-800',
  'Entregue': 'bg-green-100 text-green-800',
  'Pago': 'bg-green-100 text-green-800',
  'Expedição': 'bg-blue-100 text-blue-800',
};

const TrackOrderPage = () => {
  const { isLoggedIn } = useAuth();
  const { orders, loading } = useOrdersQuery({ enabled: isLoggedIn });
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-display font-bold mb-2">Faça login para ver seus pedidos</h2>
          <button onClick={() => navigate('/login')} className="orange-gradient text-primary-foreground px-6 py-2 rounded-lg font-bold">LOGIN</button>
        </div>
      </div>
    );
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold mb-6">Acompanhe seus Pedidos</h1>

        {loading && <p className="text-center text-muted-foreground py-8">Carregando pedidos...</p>}

        <div className="space-y-4">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/pedido/${order.id}`}
                className="block bg-card rounded-xl p-5 western-shadow hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-display font-bold text-lg">{order.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.modelo} — Tam. {order.tamanho}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(order.preco * order.quantidade)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} /> {order.diasRestantes > 0 ? `${order.diasRestantes} dias restantes` : 'Concluído'}
                      </p>
                    </div>
                    <Eye size={18} className="text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {!loading && orders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum pedido encontrado.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TrackOrderPage;
