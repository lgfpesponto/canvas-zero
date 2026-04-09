import { useAuth } from '@/contexts/AuthContext';
import { useOrdersQuery } from '@/hooks/useOrdersQuery';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download } from 'lucide-react';
import jsPDF from 'jspdf';

const PIECE_FIELDS = [
  { key: 'tamanho', label: 'Tamanho' },
  { key: 'solado', label: 'Solado' },
  { key: 'formatoBico', label: 'Formato do Bico' },
  { key: 'corVira', label: 'Cor da Vira' },
  { key: 'couroGaspea', label: 'Couro Gáspea' },
  { key: 'couroCano', label: 'Couro Cano' },
  { key: 'couroTaloneira', label: 'Couro Taloneira' },
  { key: 'bordadoCano', label: 'Bordado Cano' },
  { key: 'bordadoGaspea', label: 'Bordado Gáspea' },
  { key: 'bordadoTaloneira', label: 'Bordado Taloneira' },
  { key: 'corLinha', label: 'Cor Linha' },
  { key: 'corBorrachinha', label: 'Cor Borrachinha' },
  { key: 'metais', label: 'Metais' },
];

const PiecesReportPage = () => {
  const { isAdmin } = useAuth();
  const { orders, loading } = useOrdersQuery({ enabled: isAdmin });
  const navigate = useNavigate();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const toggleField = (key: string) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const groupedData = useMemo(() => {
    if (selectedFields.length === 0) return [];
    const groups: Record<string, { combo: Record<string, string>; count: number; totalQty: number }> = {};
    orders.forEach(order => {
      const combo: Record<string, string> = {};
      selectedFields.forEach(f => {
        combo[f] = (order as any)[f] || '';
      });
      const key = JSON.stringify(combo);
      if (!groups[key]) {
        groups[key] = { combo, count: 0, totalQty: 0 };
      }
      groups[key].count++;
      groups[key].totalQty += order.quantidade;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [orders, selectedFields]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório por Peças — 7ESTRIVOS', 14, 20);
    doc.setFontSize(10);
    doc.text(`Campos: ${selectedFields.map(f => PIECE_FIELDS.find(p => p.key === f)?.label).join(', ')}`, 14, 28);

    let y = 38;
    groupedData.forEach((g, i) => {
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.`, 14, y);
      doc.setFont('helvetica', 'normal');
      const parts = selectedFields.map(f => `${PIECE_FIELDS.find(p => p.key === f)?.label}: ${g.combo[f]}`);
      doc.text(parts.join(' | '), 22, y, { maxWidth: 170 });
      y += 5;
      doc.text(`Pedidos: ${g.count} | Quantidade total: ${g.totalQty}`, 22, y);
      y += 8;
    });

    doc.save('relatorio-pecas.pdf');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="text-3xl font-display font-bold mb-6">Relatório por Peças</h1>

        {loading && <p className="text-center text-muted-foreground py-4">Carregando pedidos...</p>}

        <div className="bg-card rounded-xl p-6 western-shadow mb-6">
          <p className="text-sm font-semibold mb-3">Selecione os campos para agrupar:</p>
          <div className="flex flex-wrap gap-2">
            {PIECE_FIELDS.map(f => (
              <button
                key={f.key}
                onClick={() => toggleField(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedFields.includes(f.key) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {selectedFields.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{groupedData.length} combinações encontradas</p>
              <button onClick={exportPDF} className="orange-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                <Download size={16} /> EXPORTAR PDF
              </button>
            </div>

            <div className="space-y-3">
              {groupedData.map((g, i) => (
                <div key={i} className="bg-card rounded-xl p-4 western-shadow">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                    {selectedFields.map(f => (
                      <div key={f} className="flex justify-between text-sm py-0.5">
                        <span className="text-muted-foreground">{PIECE_FIELDS.find(p => p.key === f)?.label}:</span>
                        <span className="font-semibold">{g.combo[f] || '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 pt-2 border-t border-border/50 text-sm">
                    <span className="font-bold">{g.count} pedido{g.count > 1 ? 's' : ''}</span>
                    <span className="text-muted-foreground">Qtd total: {g.totalQty}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PiecesReportPage;
