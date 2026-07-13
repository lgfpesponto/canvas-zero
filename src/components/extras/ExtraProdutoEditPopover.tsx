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
import { EXTRA_SCHEMA } from '@/lib/extraProductSchema';

interface Props {
  produto: ExtraProdutoDB;
}

export default function ExtraProdutoEditPopover({ produto }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(produto.nome);
  const [precoBase, setPrecoBase] = useState<string>(produto.preco_base?.toString() ?? '');
  const [precoLabel, setPrecoLabel] = useState(produto.preco_label);
  const [leadTimeDias, setLeadTimeDias] = useState<string>(String(produto.lead_time_dias ?? 1));
  const [variacoes, setVariacoes] = useState<ExtraVariacoes>(produto.variacoes || {});

  const updateMut = useUpdateExtraProduto();
  const deleteMut = useDeleteExtraProduto();
  const schema = EXTRA_SCHEMA[produto.id];

  useEffect(() => {
    if (!open) return;
    setNome(produto.nome);
    setPrecoBase(produto.preco_base?.toString() ?? '');
    setPrecoLabel(produto.preco_label);
    setLeadTimeDias(String(produto.lead_time_dias ?? 1));
    // Pré-popula grupos conhecidos com defaults quando vazio, para o admin
    // conseguir editar preços sem precisar clicar "+ variação" antes.
    const seeded = { ...(produto.variacoes || {}) };
    const defaults: Record<string, { nome: string; preco: number }[]> = {
      qual_sola: [
        { nome: 'Preta borracha', preco: 25 },
        { nome: 'De cor borracha', preco: 40 },
        { nome: 'De couro', preco: 60 },
      ],
      troca_gaspea: [
        { nome: 'Sim', preco: 35 },
        { nome: 'Não', preco: 0 },
      ],
      vai_canivete: [
        { nome: 'Sim', preco: 30 },
        { nome: 'Não', preco: 0 },
      ],
      vai_faca: [
        { nome: 'Sim', preco: 35 },
        { nome: 'Não', preco: 0 },
      ],
    };
    for (const f of EXTRA_SCHEMA[produto.id]?.fields || []) {
      if (f.source === 'variacoes' && (!seeded[f.group] || seeded[f.group].length === 0) && defaults[f.group]) {
        seeded[f.group] = defaults[f.group];
      }
    }
    setVariacoes(seeded);
  }, [open, produto]);

  const salvar = async () => {
    try {
      await updateMut.mutateAsync({
        id: produto.id,
        nome: nome.trim(),
        preco_base: precoBase === '' ? null : parseFloat(precoBase) || 0,
        preco_label: precoLabel.trim(),
        variacoes,
        lead_time_dias: Math.max(1, parseInt(leadTimeDias, 10) || 1),
      } as any);
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

  const addItem = (group: string) => {
    setVariacoes(prev => ({ ...prev, [group]: [...(prev[group] || []), { nome: '', preco: 0, foto_url: '' }] }));
  };
  const updateItem = (group: string, idx: number, patch: Partial<{ nome: string; preco: number; foto_url: string }>) => {
    setVariacoes(prev => ({
      ...prev,
      [group]: (prev[group] || []).map((v, i) => i === idx ? { ...v, ...patch } : v),
    }));
  };
  const removeItem = (group: string, idx: number) => {
    setVariacoes(prev => ({ ...prev, [group]: (prev[group] || []).filter((_, i) => i !== idx) }));
  };


  const showBasePrice = schema?.basePriceEditable !== false;
  const fields = schema?.fields || [];

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
          {showBasePrice && (
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
          )}
          <div className="space-y-1">
            <Label className="text-xs">Rótulo de preço</Label>
            <Input value={precoLabel} onChange={e => setPrecoLabel(e.target.value)} className="h-8" />
          </div>
        </div>

        {!showBasePrice && (
          <p className="text-[11px] text-muted-foreground italic">
            Preço deste produto vem das variações abaixo (não tem preço base fixo).
          </p>
        )}

        {fields.length === 0 && (
          <p className="text-[11px] italic text-muted-foreground border-t pt-2">
            Este produto não tem campos com variações — apenas nome e preço.
          </p>
        )}

        {fields.map(field => {
          if (field.source === 'shared') {
            return (
              <div key={field.key} className="border rounded p-2 space-y-1">
                <span className="text-[11px] font-semibold">{field.label}</span>
                <p className="text-[10px] text-muted-foreground italic">
                  Herdado de {field.sharedList === 'TIPOS_COURO' || field.sharedList === 'CORES_COURO'
                    ? 'Ficha da Bota'
                    : 'Configurações'}
                  {' '}— editar em Configurações {'>'} Ficha da Bota para impactar todos os campos.
                </p>
              </div>
            );
          }
          const group = field.group;
          const items = variacoes[group] || [];
          return (
            <div key={field.key} className="border rounded p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold">{field.label}</span>
                <Button size="sm" variant="ghost" onClick={() => addItem(group)} className="h-6 px-1 text-[11px]">
                  <Plus className="h-3 w-3" /> variação
                </Button>
              </div>
              <div className="space-y-1">
                {items.length === 0 && (
                  <p className="text-[11px] italic text-muted-foreground">Nenhuma variação — usará valores padrão do formulário.</p>
                )}
                {items.map((v, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Input
                        value={v.nome}
                        onChange={e => updateItem(group, i, { nome: e.target.value })}
                        placeholder="nome"
                        className="h-6 text-[11px] flex-1 px-1"
                      />
                      <Input
                        type="number" step="0.01"
                        value={v.preco}
                        onChange={e => updateItem(group, i, { preco: parseFloat(e.target.value) || 0 })}
                        placeholder="R$"
                        className="h-6 text-[11px] w-16 px-1"
                        title="preço adicional / unitário"
                      />
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                        title="excluir variação"
                        onClick={() => removeItem(group, i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      value={v.foto_url || ''}
                      onChange={e => updateItem(group, i, { foto_url: e.target.value })}
                      placeholder="URL da foto (opcional)"
                      className="h-6 text-[10px] px-1"
                    />
                  </div>
                ))}

              </div>
            </div>
          );
        })}

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
