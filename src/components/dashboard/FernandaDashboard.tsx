import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import SpecializedReports from '@/components/SpecializedReports';
import SoladoBoard from '@/components/SoladoBoard';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const FernandaDashboard = () => {
  const { allOrders } = useAuth();

  const solaCouroOrders = useMemo(() => allOrders.filter(o =>
    !o.tipoExtra &&
    ['couro reta', 'couro carrapeta', 'couro carrapeta com espaço espora', 'couro carrapeta com espaço de espora']
      .some(s => (o.solado || '').toLowerCase() === s)
  ), [allOrders]);

  const solaRusticaOrders = useMemo(() => allOrders.filter(o =>
    !o.tipoExtra && (o.solado || '').toLowerCase() === 'rústica'
  ), [allOrders]);

  const viraColoridaOrders = useMemo(() => allOrders.filter(o =>
    !o.tipoExtra && ['rosa', 'preta'].some(c => (o.corVira || '').toLowerCase() === c)
  ), [allOrders]);

  return (
    <section className="container mx-auto px-4 py-8">
      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
        <SpecializedReports reports={['escalacao', 'forro', 'palmilha', 'forma', 'pesponto', 'metais', 'bordados', 'corte', 'expedicao', 'extras_cintos']} />
      </motion.div>
      <div className="mt-8 space-y-6">
        <SoladoBoard title="Pedidos com sola de couro" orders={solaCouroOrders} storageKey="dismissed_sola_couro" />
        <SoladoBoard title="Pedidos com sola rústica" orders={solaRusticaOrders} storageKey="dismissed_sola_rustica" />
        <SoladoBoard title="Pedidos com vira colorida" orders={viraColoridaOrders} storageKey="dismissed_vira_colorida" />
      </div>
    </section>
  );
};

export default FernandaDashboard;
