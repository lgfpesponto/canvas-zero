import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Grid3X3, AlertTriangle } from 'lucide-react';
import { TAMANHOS } from '@/lib/orderFieldsConfig';
import { supabase } from '@/integrations/supabase/client';

export interface GradeItem {
  tamanho: string;
  quantidade: number;
  sku?: string;
}

interface GradeEstoqueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroPedidoBase: string;
  nomeProduto?: string;
  onConfirm: (items: GradeItem[]) => void;
  initialItems?: GradeItem[];
  /** quando true, SKU é obrigatório por linha (vendedor Estoque) */
  requireSku?: boolean;
  /** sugestão automática de SKU baseada em modelo+tamanho */
  suggestSkuBase?: string;
  /** Match contra produto já existente no estoque (mesmo nome) — mostra aviso */
  matchedExistingSku?: { sku: string; nome: string };
  /** Permite salvar linhas com quantidade 0 (fluxo "Estoque já criado" — pré-cadastra tamanho vazio) */
  allowQtdZero?: boolean;
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const GradeEstoque = ({ open, onOpenChange, numeroPedidoBase, nomeProduto, onConfirm, initialItems, requireSku, suggestSkuBase, matchedExistingSku, allowQtdZero }: GradeEstoqueProps) => {
  const minQtd = allowQtdZero ? 0 : 1;
  const initialQtd = allowQtdZero ? 0 : 1;
  const [items, setItems] = useState<GradeItem[]>(initialItems?.length ? initialItems : [{ tamanho: '', quantidade: 1, sku: '' }]);
  const [showPreview, setShowPreview] = useState(false);
  const [skuConflicts, setSkuConflicts] = useState<Record<string, string>>({}); // sku -> nome existente

  useEffect(() => {
    if (open) {
      setItems(initialItems?.length ? initialItems : [{ tamanho: '', quantidade: initialQtd, sku: '' }]);
      setShowPreview(false);
      setSkuConflicts({});
    }
  }, [open]);

  const addRow = () => setItems(prev => [...prev, { tamanho: '', quantidade: initialQtd, sku: '' }]);

  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof GradeItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Auto-suggest SKU quando preenche tamanho
      if (field === 'tamanho' && requireSku && !updated.sku && suggestSkuBase) {
        updated.sku = `${suggestSkuBase}-${value}`;
      }
      return updated;
    }));
  };

  // Sort and flatten for preview
  const sortedItems = useMemo(() => {
    return [...items]
      .filter(i => i.tamanho && i.quantidade >= minQtd)
      .sort((a, b) => Number(a.tamanho) - Number(b.tamanho));
  }, [items, minQtd]);

  const totalPedidos = useMemo(() => sortedItems.reduce((sum, i) => sum + i.quantidade, 0), [sortedItems]);

  // Generate preview of order numbers: base + tamanho + seq(2 digits)
  const previewNumbers = useMemo(() => {
    const numbers: { tamanho: string; numero: string; sku?: string }[] = [];
    for (const item of sortedItems) {
      for (let i = 0; i < item.quantidade; i++) {
        const seq = String(i + 1).padStart(2, '0');
        numbers.push({ tamanho: item.tamanho, numero: `${numeroPedidoBase}${item.tamanho}${seq}`, sku: item.sku });
      }
    }
    return numbers;
  }, [sortedItems, numeroPedidoBase]);

  const handleNext = async () => {
    const valid = items.filter(i => i.tamanho && i.quantidade > 0);
    if (valid.length === 0) return;
    // Check for duplicate sizes
    const sizes = valid.map(i => i.tamanho);
    if (new Set(sizes).size !== sizes.length) return;

    if (requireSku) {
      const missingSku = valid.filter(i => !i.sku?.trim());
      if (missingSku.length > 0) return;
      // SKUs iguais em tamanhos diferentes da mesma grade → bloqueia
      const skuToTam: Record<string, string> = {};
      for (const it of valid) {
        const s = it.sku!.trim();
        if (skuToTam[s] && skuToTam[s] !== it.tamanho) return; // dup
        skuToTam[s] = it.tamanho;
      }
      // Verifica conflito com estoque existente
      const skus = valid.map(i => i.sku!.trim());
      const { data: existing } = await supabase
        .from('estoque_produtos')
        .select('sku_base, nome, tamanho')
        .in('sku_base', skus);
      const conflicts: Record<string, string> = {};
      (existing || []).forEach((e: any) => {
        const matchItem = valid.find(it => it.sku!.trim() === e.sku_base);
        if (matchItem && nomeProduto && e.nome && e.nome !== nomeProduto.trim()) {
          conflicts[e.sku_base] = e.nome;
        }
      });
      setSkuConflicts(conflicts);
    }
    setShowPreview(true);
  };

  const handleConfirm = () => {
    onConfirm(sortedItems.map(i => ({ ...i, sku: i.sku?.trim() || undefined })));
    setShowPreview(false);
    setItems([{ tamanho: '', quantidade: 1, sku: '' }]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setItems([{ tamanho: '', quantidade: 1, sku: '' }]);
    onOpenChange(false);
  };

  const usedSizes = items.map(i => i.tamanho).filter(Boolean);
  const valid = items.filter(i => i.tamanho && i.quantidade > 0);
  const missingSku = requireSku ? valid.some(i => !i.sku?.trim()) : false;
  const dupSkuInGrade = (() => {
    if (!requireSku) return false;
    const map: Record<string, string> = {};
    for (const it of valid) {
      const s = (it.sku || '').trim();
      if (!s) continue;
      if (map[s] && map[s] !== it.tamanho) return true;
      map[s] = it.tamanho;
    }
    return false;
  })();

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 size={20} />
            {showPreview ? 'Pré-visualização da Grade' : 'Gerar Grade de Estoque'}
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Número base: <span className="font-bold text-foreground">{numeroPedidoBase}</span></p>
            {requireSku && (
              <p className="text-xs text-muted-foreground">
                Cada tamanho recebe um <span className="font-semibold text-foreground">SKU único</span>. Pedidos do mesmo tamanho compartilham o mesmo SKU.
              </p>
            )}
            {requireSku && matchedExistingSku && (
              <div className="text-xs bg-primary/10 border border-primary/30 text-foreground rounded-lg p-2">
                Produto <span className="font-semibold">"{matchedExistingSku.nome}"</span> já existe no estoque — SKU sugerido <span className="font-mono font-semibold">{suggestSkuBase}</span> <span className="text-muted-foreground">(editável)</span>.
              </div>
            )}



            <div className="space-y-2">
              <div className={`grid ${requireSku ? 'grid-cols-[1fr_90px_1.4fr_36px]' : 'grid-cols-[1fr_100px_40px]'} gap-2 text-sm font-semibold`}>
                <span>Tamanho</span>
                <span>Qtd.</span>
                {requireSku && <span>SKU</span>}
                <span></span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className={`grid ${requireSku ? 'grid-cols-[1fr_90px_1.4fr_36px]' : 'grid-cols-[1fr_100px_40px]'} gap-2 items-center`}>
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
                  {requireSku && (
                    <input
                      type="text"
                      value={item.sku || ''}
                      onChange={e => updateItem(idx, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none w-full font-mono"
                    />
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={items.length <= 1}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {requireSku && dupSkuInGrade && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-2 text-xs">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>SKUs iguais em tamanhos diferentes da mesma grade não são permitidos. Cada tamanho precisa de um SKU próprio.</span>
              </div>
            )}

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
                disabled={sortedItems.length === 0 || missingSku || dupSkuInGrade}
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
              {nomeProduto && <p className="text-sm"><span className="font-semibold">Produto:</span> {nomeProduto}</p>}
              <div className="border-t border-border pt-2 space-y-1">
                {sortedItems.map(item => (
                  <div key={item.tamanho} className="flex justify-between items-center text-sm gap-2">
                    <span>Tamanho {item.tamanho} {item.sku && <span className="text-xs text-muted-foreground font-mono">[{item.sku}]</span>}</span>
                    <span className="font-semibold">{item.quantidade} {item.quantidade === 1 ? 'pedido' : 'pedidos'}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total de pedidos</span>
                <span className="text-primary">{totalPedidos}</span>
              </div>
            </div>

            {Object.keys(skuConflicts).length > 0 && (
              <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300 font-semibold mb-1">
                  <AlertTriangle size={14} className="mt-0.5" /> SKU já existe no estoque
                </div>
                <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                  {Object.entries(skuConflicts).map(([sku, nome]) => (
                    <li key={sku}>• <span className="font-mono">{sku}</span> → "{nome}". Confirme se é reposição (vai somar quantidade no produto existente).</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver números dos pedidos</summary>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5 bg-muted rounded-lg p-3">
                {previewNumbers.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs gap-2">
                    <span>{p.numero}</span>
                    <span className="text-muted-foreground">Tam. {p.tamanho}{p.sku ? ` · ${p.sku}` : ''}</span>
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

export { slug as skuSlug };
export default GradeEstoque;
