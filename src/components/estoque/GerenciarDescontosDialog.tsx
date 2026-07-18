import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Percent, Trash2, Search, Plus } from 'lucide-react';
import { useDescontosAtivos, type EstoqueDesconto } from '@/lib/estoqueDescontos';

interface ProdutoOpt {
  key: string;
  nome: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  produtos: ProdutoOpt[];
  currentUserId?: string;
}

const GerenciarDescontosDialog = ({ open, onClose, produtos, currentUserId }: Props) => {
  const { descontos } = useDescontosAtivos();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'pct' | 'fixo'>('pct');
  const [valor, setValor] = useState('');
  const [escopo, setEscopo] = useState<'todos' | 'produtos'>('todos');
  const [selProd, setSelProd] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(p => p.nome.toLowerCase().includes(q));
  }, [produtos, busca]);

  const reset = () => {
    setNome(''); setTipo('pct'); setValor(''); setEscopo('todos'); setSelProd(new Set()); setBusca('');
  };

  const criar = async () => {
    const v = Number(String(valor).replace(',', '.'));
    if (!nome.trim()) { toast.error('Nome obrigatório'); return; }
    if (!isFinite(v) || v <= 0) { toast.error('Valor inválido'); return; }
    if (escopo === 'produtos' && selProd.size === 0) { toast.error('Selecione ao menos 1 produto'); return; }

    setBusy(true);
    const { data, error } = await supabase
      .from('estoque_descontos' as any)
      .insert({
        nome: nome.trim(),
        tipo,
        valor: v,
        escopo,
        ativo: true,
        criado_por: currentUserId ?? null,
      } as any)
      .select('id')
      .single();
    if (error) { toast.error(error.message); setBusy(false); return; }

    if (escopo === 'produtos') {
      const rows = [...selProd].map(k => ({ desconto_id: (data as any).id, produto_grupo_key: k }));
      const { error: e2 } = await supabase.from('estoque_desconto_produtos' as any).insert(rows as any);
      if (e2) { toast.error(e2.message); setBusy(false); return; }
    }

    toast.success('Desconto criado');
    reset();
    setBusy(false);
  };

  const excluir = async (d: EstoqueDesconto) => {
    if (!confirm(`Excluir desconto "${d.nome}"?`)) return;
    const { error } = await supabase.from('estoque_descontos' as any).delete().eq('id', d.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Desconto removido');
  };

  const toggleProd = (k: string) => {
    setSelProd(prev => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  const fmtValor = (d: EstoqueDesconto) =>
    d.tipo === 'pct' ? `${d.valor}% off` : `R$ ${d.valor.toFixed(2).replace('.', ',')} off`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent size={16} /> Descontos do estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Ativos */}
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Descontos ativos</div>
            {descontos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum desconto ativo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {descontos.map(d => (
                  <div key={d.id} className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full pl-3 pr-1 py-1 border border-primary/30">
                    <span className="text-xs font-semibold">Desconto: {d.nome} · {fmtValor(d)} · {d.escopo === 'todos' ? 'todos' : `${d.produtos.length} produto(s)`}</span>
                    <button type="button" onClick={() => excluir(d)} className="h-6 w-6 rounded-full hover:bg-primary/20 flex items-center justify-center" title="Excluir">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Novo */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-xs font-bold uppercase text-muted-foreground">Novo desconto</div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px] gap-2">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Black Friday" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="pct">% off</option>
                  <option value="fixo">R$ off</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder={tipo === 'pct' ? '15' : '50'} className="h-9 text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Aplicar em</Label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setEscopo('todos')} className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${escopo === 'todos' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}`}>
                  Todos os produtos
                </button>
                <button type="button" onClick={() => setEscopo('produtos')} className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${escopo === 'produtos' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}`}>
                  Produtos selecionados
                </button>
              </div>
            </div>

            {escopo === 'produtos' && (
              <div className="border rounded-md p-2 bg-muted/30 max-h-64 overflow-y-auto">
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto…" className="h-8 text-xs pl-7" />
                </div>
                {filtered.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic p-2">Nenhum produto.</p>
                ) : (
                  <div className="space-y-1">
                    {filtered.map(p => (
                      <label key={p.key} className="flex items-center gap-2 text-xs hover:bg-muted/60 rounded px-2 py-1 cursor-pointer">
                        <Checkbox checked={selProd.has(p.key)} onCheckedChange={() => toggleProd(p.key)} />
                        <span className="flex-1 truncate">{p.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{selProd.size} selecionado(s)</p>
              </div>
            )}

            <Button onClick={criar} disabled={busy} className="w-full orange-gradient text-primary-foreground">
              <Plus size={14} /> Criar desconto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GerenciarDescontosDialog;
