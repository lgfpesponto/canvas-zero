import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useUpdateExtraProduto, useDeleteExtraProduto,
  type ExtraProdutoDB, type ExtraVariacoes,
} from '@/hooks/useExtraProdutos';

interface Props {
  produto: ExtraProdutoDB;
}

const VARIACAO_LABELS: Record<string, string> = {
  cor_tira: 'Cor da tira',
  tipo_metal: 'Tipo de metal',
  cor_brilho: 'Cor do brilho',
  itens: 'Itens (metais)',
  formato_bico: 'Formato do bico',
  faixas: 'Faixas de preço',
};

export default function ExtraProdutoEditPopover({ produto }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(produto.nome);
  const [precoBase, setPrecoBase] = useState<string>(produto.preco_base?.toString() ?? '');
  const [precoLabel, setPrecoLabel] = useState(produto.preco_label);
  const [variacoes, setVariacoes] = useState<ExtraVariacoes>(produto.variacoes || {});
  const [novaCategoria, setNovaCategoria] = useState('');

  const updateMut = useUpdateExtraProduto();
  const deleteMut = useDeleteExtraProduto();

  useEffect(() => {
    if (!open) return;
    setNome(produto.nome);
    setPrecoBase(produto.preco_base?.toString() ?? '');
    setPrecoLabel(produto.preco_label);
    setVariacoes(produto.variacoes || {});
    setNovaCategoria('');
  }, [open, produto]);

  const salvar = async () => {
    try {
      await updateMut.mutateAsync({
        id: produto.id,
        nome: nome.trim(),
        preco_base: precoBase === '' ? null : parseFloat(precoBase) || 0,
        preco_label: precoLabel.trim(),
        variacoes,
      });
      toast.success('Produto atualizado');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    }
  };

  const excluir = async () => {
    try {
      await deleteMut.mutateAsync(produto.id);
      toast.success('Produto excluído');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    }
  };

  const addVariacaoItem = (cat: string) => {
    setVariacoes(prev => ({ ...prev, [cat]: [...(prev[cat] || []), { nome: '', preco: 0 }] }));
  };
  const updateVarItem = (cat: string, idx: number, patch: Partial<{ nome: string; preco: number }>) => {
    setVariacoes(prev => ({
      ...prev,
      [cat]: (prev[cat] || []).map((v, i) => i === idx ? { ...v, ...patch } : v),
    }));
  };
  const removeVarItem = (cat: string, idx: number) => {
    setVariacoes(prev => ({ ...prev, [cat]: (prev[cat] || []).filter((_, i) => i !== idx) }));
  };
  const addCategoria = () => {
    const slug = novaCategoria.trim().toLowerCase().replace(/\s+/g, '_');
    if (!slug) return;
    if (variacoes[slug]) { toast.error('Categoria já existe'); return; }
    setVariacoes(prev => ({ ...prev, [slug]: [] }));
    setNovaCategoria('');
  };
  const removeCategoria = (cat: string) => {
    setVariacoes(prev => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  };

  const categorias = Object.keys(variacoes);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" size="icon" variant="ghost"
          className="h-6 w-6 opacity-70 hover:opacity-100"
          title="editar produto"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-[80vh] overflow-y-auto space-y-3"
        align="end"
        onClick={e => e.stopPropagation()}
      >
        <div className="space-y-1">
          <Label className="text-xs">Nome</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Preço base (R$)</Label>
            <Input
              type="number" step="0.01"
              value={precoBase}
              placeholder="vazio = variável"
              onChange={e => setPrecoBase(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rótulo de preço</Label>
            <Input value={precoLabel} onChange={e => setPrecoLabel(e.target.value)} className="h-8" />
          </div>
        </div>

        <div className="border-t pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Variações</Label>
          </div>
          {categorias.length === 0 && (
            <p className="text-[11px] italic text-muted-foreground">
              Este produto não tem variações internas.
            </p>
          )}
          {categorias.map(cat => (
            <div key={cat} className="border rounded p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold">
                  {VARIACAO_LABELS[cat] || cat}
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => addVariacaoItem(cat)} className="h-6 px-1 text-[11px]">
                    <Plus className="h-3 w-3" /> item
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeCategoria(cat)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                {(variacoes[cat] || []).map((v, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      value={v.nome}
                      onChange={e => updateVarItem(cat, i, { nome: e.target.value })}
                      placeholder="nome"
                      className="h-6 text-[11px] flex-1 px-1"
                    />
                    <Input
                      type="number" step="0.01"
                      value={v.preco}
                      onChange={e => updateVarItem(cat, i, { preco: parseFloat(e.target.value) || 0 })}
                      placeholder="R$"
                      className="h-6 text-[11px] w-16 px-1"
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeVarItem(cat, i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <Input
              value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)}
              placeholder="nova categoria (ex.: tipo_metal)"
              className="h-7 text-[11px] flex-1"
            />
            <Button size="sm" variant="outline" onClick={addCategoria} className="h-7 text-[11px]">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" className="h-7 text-[11px]">
                <Trash2 className="h-3 w-3 mr-1" /> excluir produto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir "{produto.nome}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  O produto será removido do banco e sumirá da lista. Pedidos antigos que já usaram este extra permanecem intactos. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setOpen(false)}>fechar</Button>
            <Button size="sm" className="h-7 text-[11px]" onClick={salvar} disabled={updateMut.isPending}>
              salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
