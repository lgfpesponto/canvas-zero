import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface EstoqueRow {
  id: string;
  nome: string;
  sku_base: string;
  tamanho: string;
  quantidade: number;
  preco: number;
  foto_url: string | null;
  ficha_snapshot: Record<string, any>;
  ativo: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  produtoNome: string | null;
  rows: EstoqueRow[]; // todas as linhas (tamanhos) do produto
  onSaved?: () => void;
}

type DraftRow = {
  id?: string;        // existente
  tamanho: string;
  quantidade: number;
  remove?: boolean;   // marcado para excluir
  isNew?: boolean;
};

function stripSizeSuffix(sku: string): string {
  return sku.replace(/-[^-]+$/, '');
}

const EstoqueGradeEditor = ({ open, onClose, produtoNome, rows, onSaved }: Props) => {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [newTam, setNewTam] = useState('');
  const [newQtd, setNewQtd] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const skuRoot = useMemo(() => {
    if (rows.length === 0) return '';
    return stripSizeSuffix(rows[0].sku_base);
  }, [rows]);

  const template = rows[0];

  useEffect(() => {
    if (open) {
      setDrafts(rows.map(r => ({ id: r.id, tamanho: r.tamanho, quantidade: r.quantidade })));
      setNewTam('');
      setNewQtd(1);
    }
  }, [open, rows]);

  const handleAdd = () => {
    const tam = newTam.trim();
    if (!tam) { toast.error('Informe o tamanho.'); return; }
    if (drafts.some(d => !d.remove && d.tamanho === tam)) {
      toast.error('Esse tamanho já está na grade.');
      return;
    }
    setDrafts(prev => [...prev, { tamanho: tam, quantidade: Math.max(0, newQtd | 0), isNew: true }]);
    setNewTam('');
    setNewQtd(1);
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      // DELETEs
      const toDelete = drafts.filter(d => d.remove && d.id).map(d => d.id!) as string[];
      if (toDelete.length > 0) {
        const { error } = await supabase.from('estoque_produtos' as any).delete().in('id', toDelete);
        if (error) throw error;
      }
      // UPDATEs (existentes não-removidos)
      const updates = drafts.filter(d => d.id && !d.remove);
      for (const u of updates) {
        const orig = rows.find(r => r.id === u.id);
        if (!orig) continue;
        if (orig.quantidade === u.quantidade) continue;
        const { error } = await supabase.from('estoque_produtos' as any)
          .update({ quantidade: Math.max(0, u.quantidade | 0) })
          .eq('id', u.id!);
        if (error) throw error;
      }
      // INSERTs
      const inserts = drafts.filter(d => d.isNew && !d.remove).map(d => ({
        nome: template.nome,
        sku_base: `${skuRoot}-${d.tamanho}`,
        tamanho: d.tamanho,
        quantidade: Math.max(0, d.quantidade | 0),
        preco: template.preco,
        foto_url: template.foto_url,
        ficha_snapshot: template.ficha_snapshot || {},
        ativo: true,
      }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('estoque_produtos' as any).insert(inserts);
        if (error) throw error;
      }
      toast.success('Grade atualizada.');
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar grade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar grade — {produtoNome}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          SKU base: <span className="font-mono">{skuRoot}-&lt;tamanho&gt;</span>
        </p>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {drafts.map((d, idx) => (
            <div
              key={(d.id || 'new') + '-' + idx}
              className={`flex items-center gap-2 p-2 rounded border ${d.remove ? 'opacity-40 border-destructive/40 bg-destructive/5' : 'border-border bg-muted/40'}`}
            >
              <div className="w-16">
                <label className="text-[10px] text-muted-foreground">Tamanho</label>
                <Input
                  value={d.tamanho}
                  disabled={!d.isNew || d.remove}
                  onChange={e => setDrafts(prev => prev.map((x, i) => i === idx ? { ...x, tamanho: e.target.value } : x))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground">Quantidade</label>
                <Input
                  type="number"
                  min={0}
                  value={d.quantidade}
                  disabled={d.remove}
                  onChange={e => setDrafts(prev => prev.map((x, i) => i === idx ? { ...x, quantidade: Math.max(0, parseInt(e.target.value) || 0) } : x))}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                variant={d.remove ? 'outline' : 'destructive'}
                onClick={() => setDrafts(prev => {
                  if (prev[idx].isNew) return prev.filter((_, i) => i !== idx);
                  return prev.map((x, i) => i === idx ? { ...x, remove: !x.remove } : x);
                })}
                title={d.remove ? 'Desfazer remoção' : 'Remover tamanho'}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2 pt-2 border-t border-border">
          <div className="w-20">
            <label className="text-[10px] text-muted-foreground">Novo tam.</label>
            <Input value={newTam} onChange={e => setNewTam(e.target.value)} className="h-8 text-xs" placeholder="ex: 39" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Quantidade</label>
            <Input type="number" min={0} value={newQtd} onChange={e => setNewQtd(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-xs" />
          </div>
          <Button size="sm" onClick={handleAdd}><Plus size={14} /> Adicionar</Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar grade'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EstoqueGradeEditor;
