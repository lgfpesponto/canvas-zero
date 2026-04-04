import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Grid3X3 } from 'lucide-react';
import { TAMANHOS } from '@/lib/orderFieldsConfig';

export interface GradeItem {
  tamanho: string;
  quantidade: number;
}

interface GradeEstoqueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroPedidoBase: string;
  onConfirm: (items: GradeItem[]) => void;
  initialItems?: GradeItem[];
}

const GradeEstoque = ({ open, onOpenChange, numeroPedidoBase, onConfirm, initialItems }: GradeEstoqueProps) => {
  const [items, setItems] = useState<GradeItem[]>(initialItems?.length ? initialItems : [{ tamanho: '', quantidade: 1 }]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(initialItems?.length ? initialItems : [{ tamanho: '', quantidade: 1 }]);
      setShowPreview(false);
    }
  }, [open]);

  const addRow = () => setItems(prev => [...prev, { tamanho: '', quantidade: 1 }]);

  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof GradeItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Sort and flatten for preview
  const sortedItems = useMemo(() => {
    return [...items]
      .filter(i => i.tamanho && i.quantidade > 0)
      .sort((a, b) => Number(a.tamanho) - Number(b.tamanho));
  }, [items]);

  const totalPedidos = useMemo(() => sortedItems.reduce((sum, i) => sum + i.quantidade, 0), [sortedItems]);

  // Generate preview of order numbers
  const previewNumbers = useMemo(() => {
    const numbers: { tamanho: string; numero: string }[] = [];
    let seq = 1;
    for (const item of sortedItems) {
      for (let i = 0; i < item.quantidade; i++) {
        numbers.push({ tamanho: item.tamanho, numero: `${numeroPedidoBase}${seq}` });
        seq++;
      }
    }
    return numbers;
  }, [sortedItems, numeroPedidoBase]);

  const handleNext = () => {
    const valid = items.filter(i => i.tamanho && i.quantidade > 0);
    if (valid.length === 0) return;
    // Check for duplicate sizes
    const sizes = valid.map(i => i.tamanho);
    if (new Set(sizes).size !== sizes.length) {
      return; // duplicates not allowed
    }
    setShowPreview(true);
  };

  const handleConfirm = () => {
    onConfirm(sortedItems);
    setShowPreview(false);
    setItems([{ tamanho: '', quantidade: 1 }]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setItems([{ tamanho: '', quantidade: 1 }]);
    onOpenChange(false);
  };

  const usedSizes = items.map(i => i.tamanho).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleCancel(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 size={20} />
            {showPreview ? 'Pré-visualização da Grade' : 'Gerar Grade de Estoque'}
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Número base: <span className="font-bold text-foreground">{numeroPedidoBase}</span></p>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_100px_40px] gap-2 text-sm font-semibold">
                <span>Tamanho</span>
                <span>Quantidade</span>
                <span></span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_100px_40px] gap-2 items-center">
                  <select
                    value={item.tamanho}
                    onChange={e => updateItem(idx, 'tamanho', e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none"
                  >
                    <option value="">Selecione</option>
                    {TAMANHOS.map(t => (
                      <option key={t} value={t} disabled={usedSizes.includes(t) && item.tamanho !== t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={e => updateItem(idx, 'quantidade', Math.max(1, Number(e.target.value)))}
                    className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none w-full"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={items.length <= 1}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full">
              <Plus size={14} /> Adicionar tamanho
            </Button>

            <div className="bg-muted rounded-lg p-3 text-sm">
              <span className="font-semibold">Total de pedidos:</span> {totalPedidos}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">Cancelar</Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={sortedItems.length === 0}
                className="flex-1 orange-gradient text-primary-foreground hover:opacity-90"
              >
                Avançar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm"><span className="font-semibold">Pedido base:</span> {numeroPedidoBase}</p>
              <div className="border-t border-border pt-2 space-y-1">
                {sortedItems.map(item => (
                  <div key={item.tamanho} className="flex justify-between text-sm">
                    <span>Tamanho {item.tamanho}</span>
                    <span className="font-semibold">{item.quantidade} {item.quantidade === 1 ? 'pedido' : 'pedidos'}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total de pedidos</span>
                <span className="text-primary">{totalPedidos}</span>
              </div>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver números dos pedidos</summary>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5 bg-muted rounded-lg p-3">
                {previewNumbers.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{p.numero}</span>
                    <span className="text-muted-foreground">Tam. {p.tamanho}</span>
                  </div>
                ))}
              </div>
            </details>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowPreview(false)} className="flex-1">Voltar</Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="flex-1 orange-gradient text-primary-foreground hover:opacity-90"
              >
                Confirmar geração da grade
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GradeEstoque;
