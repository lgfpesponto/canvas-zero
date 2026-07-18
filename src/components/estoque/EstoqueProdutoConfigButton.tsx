import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Minus, Plus, RefreshCw } from 'lucide-react';

interface ProdutoTam {
  id: string;
  nome: string;
  sku_base: string;
  tamanho: string;
  quantidade: number;
  preco: number;
  foto_url: string | null;
}

interface Props {
  produto: ProdutoTam;
  grupo?: ProdutoTam[];
  onDone?: () => void;
}

const EstoqueProdutoConfigButton = ({ produto, grupo, onDone }: Props) => {
  const [open, setOpen] = useState(false);
  const items = grupo && grupo.length > 0 ? grupo : [produto];
  const [nome, setNome] = useState(produto.nome);
  const [foto, setFoto] = useState(produto.foto_url || '');
  const [rows, setRows] = useState(() => items.map(t => ({
    id: t.id,
    tamanho: t.tamanho,
    sku_base: t.sku_base,
    quantidade: t.quantidade,
    preco: Number(t.preco || 0),
    delta: 0,
  })));
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(produto.nome);
      setFoto(produto.foto_url || '');
      setRows(items.map(t => ({
        id: t.id,
        tamanho: t.tamanho,
        sku_base: t.sku_base,
        quantidade: t.quantidade,
        preco: Number(t.preco || 0),
        delta: 0,
      })));
      setMotivo('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const salvarTudo = async () => {
    setBusy(true);
    try {
      for (const r of rows) {
        const original = items.find(i => i.id === r.id);
        const { error } = await (supabase.rpc as any)('editar_produto_estoque', {
          _produto_id: r.id,
          _nome: nome,
          _foto_url: foto,
          _preco: r.preco || 0,
          _sku_base: r.sku_base,
          _preco_desconto: null,
          _limpar_desconto: true,
        });
        if (error) { toast.error(`Tam ${r.tamanho}: ${error.message}`); setBusy(false); return; }
        if (original && original.sku_base.trim() !== r.sku_base.trim()) {
          supabase.functions.invoke('bagy-stock-sync', { body: { retry_produto_id: r.id } }).catch(() => {});
        }
      }
      for (const r of rows) {
        if (r.delta !== 0) {
          const { error } = await (supabase.rpc as any)('ajustar_estoque_manual', {
            _produto_id: r.id,
            _delta: r.delta,
            _motivo: motivo || null,
          });
          if (error) { toast.error(`Ajuste tam ${r.tamanho}: ${error.message}`); setBusy(false); return; }
          supabase.functions.invoke('bagy-stock-sync', { body: { retry_produto_id: r.id } }).catch(() => {});
        }
      }
      toast.success('Produto atualizado.');
      onDone?.();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const redescobrir = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('bagy-stock-sync', {
      body: { retry_produto_id: id, force_rediscover: true },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Redescoberta enviada.');
    onDone?.();
  };

  const updateRow = (id: string, field: 'sku_base' | 'quantidade' | 'preco' | 'delta', value: string | number) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (field === 'sku_base') return { ...r, sku_base: String(value) };
      return { ...r, [field]: Number(value) };
    }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Configurar produto (admin)"
        className="h-6 w-6 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition"
      >
        <Settings size={12} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Configurar produto</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="border border-border rounded-md p-3 space-y-2">
              <div className="text-xs font-bold text-muted-foreground uppercase">Dados do produto (afeta todos os tamanhos)</div>
              <div>
                <label className="text-xs font-semibold block mb-1">Nome</label>
                <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8 text-xs" />
                <p className="text-[10px] text-muted-foreground mt-1">Renomear aqui atualiza todos os tamanhos deste produto — não cria um novo.</p>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Foto (URL)</label>
                <Input value={foto} onChange={e => setFoto(e.target.value)} className="h-8 text-xs" />
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Descontos agora são gerenciados no botão "Adicionar desconto" acima (aplicam ao produto inteiro).
              </p>
            </div>

            <div className="border border-border rounded-md p-3 space-y-2">
              <div className="text-xs font-bold text-muted-foreground uppercase">Tamanhos ({rows.length})</div>
              <div className="grid grid-cols-[40px_1fr_90px_120px_32px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                <span>Tam</span>
                <span>SKU</span>
                <span>Preço</span>
                <span>Qtd (± ajuste)</span>
                <span></span>
              </div>
              {rows.map(r => (
                <div key={r.id} className="grid grid-cols-[40px_1fr_90px_120px_32px] gap-2 items-center">
                  <span className="font-bold">{r.tamanho}</span>
                  <Input value={r.sku_base} onChange={e => updateRow(r.id, 'sku_base', e.target.value)} className="h-7 text-xs font-mono" />
                  <Input type="number" step="0.01" value={r.preco} onChange={e => updateRow(r.id, 'preco', e.target.value)} className="h-7 text-xs" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs w-6 text-right">{r.quantidade}</span>
                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateRow(r.id, 'delta', r.delta - 1)}><Minus size={10} /></Button>
                    <Input type="number" value={r.delta} onChange={e => updateRow(r.id, 'delta', e.target.value)} className="h-6 text-xs text-center px-1 w-12" />
                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateRow(r.id, 'delta', r.delta + 1)}><Plus size={10} /></Button>
                  </div>
                  <button type="button" onClick={() => redescobrir(r.id)} title="Redescobrir na Bagy" className="h-7 w-7 rounded-md bg-muted hover:bg-primary/20 flex items-center justify-center" disabled={busy}>
                    <RefreshCw size={12} />
                  </button>
                </div>
              ))}
              <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo dos ajustes de quantidade (opcional)" className="h-8 text-xs" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
            <Button onClick={salvarTudo} disabled={busy} className="orange-gradient text-primary-foreground">
              {busy ? 'Salvando…' : 'Salvar tudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EstoqueProdutoConfigButton;
