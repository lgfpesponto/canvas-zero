import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronDown, Download, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { PRODUCTION_STATUSES } from '@/contexts/AuthContext';
import type { Order } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';

interface SoladoBoardProps {
  title: string;
  orders: Order[];
  storageKey: string;
}

const SoladoBoard = ({ title, orders, storageKey }: SoladoBoardProps) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...dismissedIds]));
  }, [dismissedIds, storageKey]);

  const visibleOrders = useMemo(() => {
    return orders
      .filter(o => !dismissedIds.has(o.id))
      .filter(o => statusFilter.size === 0 || statusFilter.has(o.status));
  }, [orders, dismissedIds, statusFilter]);

  const dismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const dismissSelected = useCallback(() => {
    setDismissedIds(prev => new Set([...prev, ...selectedIds]));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const buildDescription = (o: Order) => {
    return [o.tamanho, o.genero, o.solado, o.formatoBico, o.corSola, o.corVira, o.forma]
      .filter(Boolean)
      .join(' | ');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(title, 14, 18);
    doc.setFontSize(9);
    let y = 28;
    visibleOrders.forEach((o, i) => {
      if (y > 270) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${o.numero}`, 14, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      doc.text(`Vendedor: ${o.vendedor}`, 18, y); y += 4;
      doc.text(`Solado: ${buildDescription(o)}`, 18, y, { maxWidth: 170 }); y += 5;
      doc.text(`Data: ${o.dataCriacao} | Progresso: ${o.status} | Prazo: ${o.diasRestantes > 0 ? `${o.diasRestantes}d úteis` : '✓'}`, 18, y);
      y += 8;
    });
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const uniqueStatuses = useMemo(() => {
    const s = new Set(orders.filter(o => !dismissedIds.has(o.id)).map(o => o.status));
    return PRODUCTION_STATUSES.filter(st => s.has(st));
  }, [orders, dismissedIds]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 western-shadow">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-display font-bold">{title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button onClick={dismissSelected} className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1">
              <Check size={14} /> Marcar feito ({selectedIds.size})
            </button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-primary/10 transition-colors flex items-center gap-1">
                <Filter size={14} /> Progresso {statusFilter.size > 0 && `(${statusFilter.size})`} <ChevronDown size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 max-h-60 overflow-y-auto">
              {uniqueStatuses.map(st => (
                <label key={st} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                  <Checkbox checked={statusFilter.has(st)} onCheckedChange={(checked) => {
                    setStatusFilter(prev => { const n = new Set(prev); checked ? n.add(st) : n.delete(st); return n; });
                  }} />
                  {st}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          <button onClick={exportPDF} className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1">
            <Download size={14} /> Gerar relatório
          </button>
        </div>
      </div>

      {visibleOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido encontrado.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {visibleOrders.map(o => (
            <div key={o.id} className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 text-sm">
              <Checkbox
                checked={selectedIds.has(o.id)}
                onCheckedChange={() => toggleSelect(o.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{o.numero}</span>
                  <span className="text-muted-foreground">— {o.vendedor}</span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5 break-words">{buildDescription(o)}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">{o.dataCriacao}</span>
                  <span className="px-2 py-0.5 rounded-full bg-background text-xs font-bold">{o.status}</span>
                  <span className="text-xs text-muted-foreground">{o.diasRestantes > 0 ? `${o.diasRestantes}d úteis` : '✓'}</span>
                </div>
              </div>
              <button
                onClick={() => dismiss(o.id)}
                className="px-2 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0"
              >
                Feito
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">{visibleOrders.length} pedido{visibleOrders.length !== 1 ? 's' : ''}</p>
    </motion.div>
  );
};

export default SoladoBoard;
