import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { generateCommissionPDF } from '@/lib/pdfGenerators';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmPrint } from '@/components/common/ConfirmPrintDialog';
import { ReportConfirmSummary } from '@/components/common/ReportConfirmSummary';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const COMMISSION_PER_SALE = 10;
const MONTHLY_GOAL = 60;

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface Order {
  id: string;
  numero: string;
  dataCriacao: string;
  tipoExtra?: string | null;
  quantidade: number;
  status?: string;
  cliente?: string;
  vendedor?: string;
}

interface CommissionPanelProps {
  orders: Order[];
}

const CommissionPanel = ({ orders }: CommissionPanelProps) => {
  const { user } = useAuth();
  const isRanchoChique = user?.nomeCompleto === 'Rancho Chique';
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Build available months from orders + current month
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonth);
    orders.forEach(o => {
      if (o.dataCriacao) {
        const parts = o.dataCriacao.split('-');
        if (parts.length >= 2) months.add(`${parts[0]}-${parts[1]}`);
      }
    });
    return [...months].sort().reverse();
  }, [orders, currentMonth]);

  // Filter qualifying orders for selected month
  const qualifyingOrders = useMemo(() => {
    const EXCLUDED_PREFIXES = ['TROCA', 'REFAZENDO', 'ERRO', 'INFLUENCER'];
    const isExcluded = (numero: string) => EXCLUDED_PREFIXES.some(p => numero.toUpperCase().startsWith(p));
    return orders.filter(o => {
      // Must be in selected month
      if (!o.dataCriacao?.startsWith(selectedMonth)) return false;
      // Exclude special orders
      if (isExcluded(o.numero)) return false;
      // Exclude canceled orders
      if (o.status === 'Cancelado') return false;
      // Bota (ficha producao normal), Bota Pronta Entrega, or Regata
      const tipo = o.tipoExtra;
      return !tipo || tipo === 'bota_pronta_entrega' || tipo === 'regata';
    }).sort((a, b) => {
      // Sort by date ascending
      if (a.dataCriacao < b.dataCriacao) return -1;
      if (a.dataCriacao > b.dataCriacao) return 1;
      return 0;
    });
  }, [orders, selectedMonth]);

  const vendas = qualifyingOrders.length;
  const metaBatida = vendas >= MONTHLY_GOAL;
  const comissao = metaBatida ? vendas * COMMISSION_PER_SALE : 0;
  const progresso = Math.min((vendas / MONTHLY_GOAL) * 100, 100);

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const { askPrint, dialog: confirmPrintDialog } = useConfirmPrint();
  const handleGeneratePDF = () => {
    askPrint({
      title: 'Gerar Relatório de Comissão?',
      description: (
        <ReportConfirmSummary
          intro={`Resumo de comissão de ${formatMonthLabel(selectedMonth)}.`}
          destaque={{ label: 'Vendas qualificadas', value: qualifyingOrders.length }}
          linhas={[
            { label: 'Meta mensal', value: `${MONTHLY_GOAL} vendas` }, 
            { label: 'Meta atingida', value: metaBatida ? 'Sim' : 'Não' },
            { label: 'Comissão calculada', value: formatCurrency(comissao) },
          ]}
          nota={metaBatida ? undefined : 'Sem meta batida, comissão será R$ 0 mas o PDF lista as vendas do mês.'}
        />
      ),
      confirmLabel: 'Gerar PDF',
      run: () => generateCommissionPDF(qualifyingOrders, formatMonthLabel(selectedMonth), { userName: user?.nomeCompleto || '' }),
    });
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={2} className="bg-card rounded-xl p-6 western-shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <DollarSign className="text-primary" size={22} /> Comissão Mensal
        </h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecionar mês" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map(m => (
              <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-muted rounded-lg p-4 mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vendas no mês</p>
        <p className="text-3xl font-bold text-primary mt-1">
          {vendas} {vendas === 1 ? 'venda' : 'vendas'}
        </p>
        {metaBatida && (
          <p className="text-sm text-muted-foreground mt-1">
            Comissão: {formatCurrency(comissao)}
          </p>
        )}
      </div>

      <Progress value={progresso} className="h-3" />
      <p className="text-xs text-muted-foreground mt-2">
        {vendas} de {MONTHLY_GOAL} vendas para a meta
      </p>

      <div className="mt-3">
        {metaBatida ? (
          <p className="text-sm font-semibold text-primary">
            🎉 Meta batida! Comissão atual: {formatCurrency(comissao)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Faltam {MONTHLY_GOAL - vendas} vendas para bater a meta
          </p>
        )}
      </div>

      {isRanchoChique && qualifyingOrders.length > 0 && (
        <div className="mt-4 border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>#</span>
            <span>Pedido</span>
            <span>Cliente</span>
            <span>Data</span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-border">
            {qualifyingOrders.map((o, i) => {
              const [y, m, d] = (o.dataCriacao || '').split('-');
              const dataBR = y && m && d ? `${d}/${m}/${y.slice(2)}` : o.dataCriacao;
              return (
                <div key={o.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-3 py-1.5 text-xs items-center">
                  <span className="text-muted-foreground">{i + 1}</span>
                  <span className="font-mono">{o.numero}</span>
                  <span className="truncate" title={o.cliente || ''}>{o.cliente || '—'}</span>
                  <span className="text-muted-foreground tabular-nums">{dataBR}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button onClick={handleGeneratePDF} variant="outline" className="mt-4 w-full flex items-center gap-2">
        <FileText size={16} /> Gerar relatório de comissão
      </Button>
      {confirmPrintDialog}
    </motion.div>
  );
};

export default CommissionPanel;
