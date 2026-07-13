import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { HandHelping, Plus, Undo2, X, Search } from 'lucide-react';

interface Emprestimo {
  id: string;
  produto_id: string;
  tamanho: string;
  quantidade: number;
  vendedor_id: string | null;
  vendedor_nome: string;
  status: 'ativo' | 'devolvido';
  observacao: string | null;
  created_at: string;
}

interface Produto {
  id: string;
  nome: string;
  sku_base: string;
  tamanho: string;
  quantidade: number;
}

interface Props {
  canManage: boolean;      // admin_master ou admin_producao
  currentUserId?: string;
  currentUserNome?: string;
}

interface SelItem {
  produto_id: string;
  tamanho: string;
  produto_nome: string;
  quantidade: number;
}

const EstoqueEmprestimosPanel = ({ canManage, currentUserId, currentUserNome }: Props) => {
  const [ativos, setAtivos] = useState<Emprestimo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [vendedorId, setVendedorId] = useState('');
  const [obs, setObs] = useState('');
  const [search, setSearch] = useState('');
  const [itens, setItens] = useState<SelItem[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAtivos = async () => {
    const { data } = await supabase
      .from('estoque_emprestimos' as any)
      .select('*')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false });
    setAtivos((data as any) || []);
  };

  useEffect(() => {
    fetchAtivos();
    (async () => {
      const { data: p } = await supabase.from('estoque_produtos' as any)
        .select('id, nome, sku_base, tamanho, quantidade').eq('ativo', true).order('nome');
      setProdutos((p as any) || []);
      if (canManage) {
        const { data: v } = await supabase.from('profiles').select('id, nome_completo').order('nome_completo');
        setVendedores(((v as any) || []).map((x: any) => ({ id: x.id, nome: x.nome_completo })).filter((x: any) => x.nome));
      }
    })();
    const ch = supabase.channel('emprestimos-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_emprestimos' }, fetchAtivos)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canManage]);

  const meusEmprestimos = useMemo(
    () => ativos.filter(e => currentUserId && e.vendedor_id === currentUserId),
    [ativos, currentUserId],
  );

  const filteredProds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return produtos.slice(0, 30);
    return produtos.filter(p => p.nome.toLowerCase().includes(q) || p.sku_base.toLowerCase().includes(q)).slice(0, 30);
  }, [produtos, search]);

  const toggleItem = (p: Produto) => {
    setItens(prev => {
      const idx = prev.findIndex(i => i.produto_id === p.id && i.tamanho === p.tamanho);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { produto_id: p.id, tamanho: p.tamanho, produto_nome: p.nome, quantidade: 1 }];
    });
  };

  const setItemQtd = (produto_id: string, tamanho: string, q: number) => {
    setItens(prev => prev.map(i => (i.produto_id === produto_id && i.tamanho === tamanho ? { ...i, quantidade: Math.max(1, q) } : i)));
  };

  const handleSave = async () => {
    if (!vendedorId) { toast.error('Selecione o vendedor.'); return; }
    if (itens.length === 0) { toast.error('Selecione ao menos um produto.'); return; }
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { toast.error('Vendedor inválido.'); return; }
    setSaving(true);
    const rows = itens.map(i => ({
      produto_id: i.produto_id,
      tamanho: i.tamanho,
      quantidade: i.quantidade,
      vendedor_id: vendedorId,
      vendedor_nome: vendedor.nome,
      observacao: obs.trim() || null,
      criado_por: currentUserId,
    }));
    const { error } = await supabase.from('estoque_emprestimos' as any).insert(rows);
    setSaving(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success(`${rows.length} empréstimo(s) registrado(s).`);
    setShowDialog(false);
    setItens([]); setVendedorId(''); setObs(''); setSearch('');
    fetchAtivos();
  };

  const handleDevolver = async (id: string) => {
    if (!window.confirm('Marcar como devolvido?')) return;
    const { error } = await supabase.from('estoque_emprestimos' as any)
      .update({ status: 'devolvido', devolvido_em: new Date().toISOString(), devolvido_por: currentUserId })
      .eq('id', id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Empréstimo devolvido.');
    fetchAtivos();
  };

  return (
    <>
      {/* Badge/aviso para vendedor com empréstimos ativos */}
      {meusEmprestimos.length > 0 && !canManage && (
        <div className="mb-3 p-3 border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <HandHelping size={16} className="text-amber-700" />
            <span className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Você está com {meusEmprestimos.length} produto(s) emprestado(s):
            </span>
          </div>
          <ul className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5 pl-6 list-disc">
            {meusEmprestimos.map(e => (
              <li key={e.id}>
                {produtos.find(p => p.id === e.produto_id)?.nome || 'Produto'} — tam {e.tamanho} ({e.quantidade} un.)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Barra de ação (admins) + lista de ativos */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
            <Plus size={14} /> Adicionar emprestado
          </Button>
        )}
        {ativos.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {ativos.length} empréstimo(s) ativo(s)
          </span>
        )}
      </div>

      {ativos.length > 0 && (
        <div className="mb-6 border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-3 py-2 text-xs font-semibold flex items-center gap-2">
            <HandHelping size={14} /> Emprestados ativos
          </div>
          <div className="divide-y divide-border">
            {ativos.map(e => {
              const prod = produtos.find(p => p.id === e.produto_id);
              return (
                <div key={e.id} className="px-3 py-2 flex items-center gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{prod?.nome || 'Produto'}</div>
                    <div className="text-muted-foreground">
                      tam <strong>{e.tamanho}</strong> · qtd <strong>{e.quantidade}</strong> · com <strong>{e.vendedor_nome}</strong>
                      {e.observacao ? ` · ${e.observacao}` : ''}
                    </div>
                  </div>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => handleDevolver(e.id)}>
                      <Undo2 size={12} /> Devolvido
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Adicionar empréstimo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold mb-1 block">Vendedor</label>
              <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Buscar produto (nome ou SKU)</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-8" placeholder="digite para filtrar…" />
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
                {filteredProds.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">Nenhum produto.</p>}
                {filteredProds.map(p => {
                  const selected = itens.some(i => i.produto_id === p.id && i.tamanho === p.tamanho);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleItem(p)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 hover:bg-muted ${selected ? 'bg-primary/10' : ''}`}
                    >
                      <span className="flex-1 truncate">{p.nome}</span>
                      <span className="text-muted-foreground">tam {p.tamanho}</span>
                      <span className="text-muted-foreground">({p.quantidade} un.)</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {itens.length > 0 && (
              <div>
                <label className="text-xs font-semibold mb-1 block">Itens selecionados</label>
                <div className="space-y-1">
                  {itens.map(i => (
                    <div key={`${i.produto_id}-${i.tamanho}`} className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded">
                      <span className="flex-1 truncate">{i.produto_nome} · tam {i.tamanho}</span>
                      <Input
                        type="number"
                        min={1}
                        value={i.quantidade}
                        onChange={e => setItemQtd(i.produto_id, i.tamanho, Number(e.target.value))}
                        className="h-7 w-16 text-xs"
                      />
                      <button type="button" onClick={() => toggleItem({ id: i.produto_id, tamanho: i.tamanho } as any)} className="text-muted-foreground hover:text-destructive">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold mb-1 block">Observação (opcional)</label>
              <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="ex: evento fim de semana" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="orange-gradient text-primary-foreground">
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EstoqueEmprestimosPanel;
