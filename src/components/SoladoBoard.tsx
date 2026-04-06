import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckSquare, ChevronDown, Download, Filter, Maximize2, Square } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PRODUCTION_STATUSES } from '@/contexts/AuthContext';
import type { Order } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';

interface SoladoBoardProps {
  title: string;
  orders: Order[];
  storageKey: string;
}

interface BlockData {
  badge: string;
  description: string;
  sizes: { tamanho: string; quantidade: number }[];
}

const estimateBlockHeight = (block: BlockData): number => {
  const cols = block.sizes.length;
  const rows = Math.ceil(cols / 14);
  return 22 + rows * 16;
};

const drawBlockLayout = (doc: jsPDF, startY: number, mx: number, block: BlockData): number => {
  const pw = doc.internal.pageSize.getWidth() - mx * 2;
  let y = startY;

  // Badge + description header
  doc.setFillColor(40, 40, 40);
  const badgeW = doc.getTextWidth(block.badge) + 8;
  doc.roundedRect(mx, y, badgeW, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(block.badge, mx + 4, y + 5);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  doc.text(block.description, mx + badgeW + 4, y + 5, { maxWidth: pw - badgeW - 8 });
  y += 10;

  // Size/quantity grid
  const maxCols = 14;
  const colW = pw / maxCols;
  const rows = Math.ceil(block.sizes.length / maxCols);

  for (let row = 0; row < rows; row++) {
    const startIdx = row * maxCols;
    const rowSizes = block.sizes.slice(startIdx, startIdx + maxCols);

    // TAM. row
    doc.setFillColor(220, 220, 220);
    doc.rect(mx, y, pw, 7, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('TAM.', mx + 1, y + 5);
    rowSizes.forEach((s, i) => {
      const x = mx + (i + 1) * colW;
      doc.setTextColor(40, 40, 40);
      doc.text(String(s.tamanho), x + colW / 2, y + 5, { align: 'center' });
      doc.setDrawColor(200, 200, 200);
      doc.line(x, y, x, y + 14);
    });
    doc.rect(mx, y, pw, 7);
    y += 7;

    // QTD. row
    doc.setFillColor(245, 245, 245);
    doc.rect(mx, y, pw, 7, 'F');
    doc.setTextColor(80, 80, 80);
    doc.text('QTD.', mx + 1, y + 5);
    rowSizes.forEach((s, i) => {
      const x = mx + (i + 1) * colW;
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(String(s.quantidade), x + colW / 2, y + 5, { align: 'center' });
    });
    doc.rect(mx, y, pw, 7);
    y += 9;
  }

  return y;
};

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

  const toggleSelectAll = useCallback(() => {
    const allVisible = visibleOrders.map(o => o.id);
    const allSelected = allVisible.every(id => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(allVisible));
  }, [visibleOrders, selectedIds]);

  const allSelected = visibleOrders.length > 0 && visibleOrders.every(o => selectedIds.has(o.id));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      // If yyyy-mm-dd or yyyy/mm/dd
      if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    }
    return dateStr;
  };

  const buildDescriptionLines = (o: Order) => {
    const line1 = [
      { label: 'Tamanho', value: o.tamanho },
      { label: 'Gênero', value: o.genero },
      { label: 'Tipo', value: o.solado },
      { label: 'Formato', value: o.formatoBico },
    ].filter(p => p.value);
    const line2 = [
      { label: 'Cor', value: o.corSola },
      { label: 'Vira', value: o.corVira },
      { label: 'Forma', value: o.forma },
    ].filter(p => p.value);
    return { line1, line2 };
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const mx = 10;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Group orders by sole configuration
    const groups = new Map<string, { badge: string; description: string; sizes: Map<string, number> }>();
    visibleOrders.forEach(o => {
      const key = [o.solado, o.formatoBico, o.corSola, o.corVira].filter(Boolean).join(' | ');
      if (!groups.has(key)) {
        groups.set(key, {
          badge: title.toUpperCase().replace('PEDIDOS COM ', ''),
          description: key,
          sizes: new Map(),
        });
      }
      const g = groups.get(key)!;
      const tam = o.tamanho || '?';
      g.sizes.set(tam, (g.sizes.get(tam) || 0) + (o.quantidade || 1));
    });

    const blocks: BlockData[] = Array.from(groups.values()).map(g => ({
      badge: g.badge,
      description: g.description,
      sizes: Array.from(g.sizes.entries())
        .map(([tamanho, quantidade]) => ({ tamanho, quantidade }))
        .sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
    }));

    const totalPares = blocks.reduce((sum, b) => sum + b.sizes.reduce((s, sz) => s + sz.quantidade, 0), 0);

    // Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, mx, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dateStr}  |  Total: ${totalPares} par${totalPares !== 1 ? 'es' : ''}`, mx, 20);

    let y = 28;
    blocks.forEach(block => {
      const h = estimateBlockHeight(block);
      if (y + h > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 14;
      }
      y = drawBlockLayout(doc, y, mx, block);
      y += 4;
    });

    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${dateStr.replace(/\//g, '-')}.pdf`);
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
          {visibleOrders.length > 0 && (
            <button onClick={toggleSelectAll} className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-primary/10 transition-colors flex items-center gap-1">
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          )}
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
        <div className="divide-y-2 divide-primary max-h-[400px] overflow-y-auto">
          {visibleOrders.map(o => {
            const { line1, line2 } = buildDescriptionLines(o);
            return (
              <div key={o.id} className="py-3 px-1 text-sm">
                {/* Row 1: Checkbox + Número + Vendedor */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.has(o.id)}
                    onCheckedChange={() => toggleSelect(o.id)}
                  />
                  <span className="font-bold">{o.numero}</span>
                  <span className="text-muted-foreground">— {o.vendedor}</span>
                </div>

                {/* Row 2: Descrição da sola */}
                <div className="border-t border-border mt-2 pt-2">
                  <p className="text-muted-foreground text-xs break-words">
                    {line1.map((p, i) => (
                      <span key={i}>
                        {i > 0 && <span className="mx-1">·</span>}
                        <span className="font-semibold text-foreground">{p.label}:</span> {p.value}
                      </span>
                    ))}
                  </p>
                  {line2.length > 0 && (
                    <p className="text-muted-foreground text-xs mt-0.5 break-words">
                      {line2.map((p, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1">·</span>}
                          <span className="font-semibold text-foreground">{p.label}:</span> {p.value}
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                {/* Row 3: Prazo | Status | Feito */}
                <div className="border-t border-border mt-2 flex text-xs">
                  <div className="flex-1 py-1.5 pr-2 border-r border-border">
                    <span className="text-muted-foreground">Prazo: </span>
                    <span className="font-semibold">{o.diasRestantes > 0 ? `${o.diasRestantes}d` : '✓'}</span>
                  </div>
                  <div className="flex-1 py-1.5 px-2 border-r border-border">
                    <span className="text-muted-foreground">Status: </span>
                    <span className="font-bold">{o.status}</span>
                  </div>
                  <div className="py-1 px-2 flex items-center">
                    <button
                      onClick={() => dismiss(o.id)}
                      className="px-3 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <Check size={14} /> Feito
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">{visibleOrders.length} pedido{visibleOrders.length !== 1 ? 's' : ''}</p>
    </motion.div>
  );
};

export default SoladoBoard;
