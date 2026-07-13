import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Minus, Plus } from 'lucide-react';

interface Props {
  produto: {
    id: string;
    nome: string;
    sku_base: string;
    tamanho: string;
    quantidade: number;
    preco: number;
    foto_url: string | null;
  };
  onDone?: () => void;
}

/**
 * Engrenagem de configuração do produto no estoque (só admin_master / admin_producao).
 * Permite editar nome, foto, preço, SKU e ajustar quantidade manualmente com registro em log.
 */
const EstoqueProdutoConfigButton = ({ produto, onDone }: Props) => {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(produto.nome);
  const [sku, setSku] = useState(produto.sku_base);
  const [foto, setFoto] = useState(produto.foto_url || '');
  const [preco, setPreco] = useState(String(produto.preco));
  const [delta, setDelta] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  const salvarMeta = async () => {
    setBusy(true);
    const { error } = await (supabase.rpc as any)('editar_produto_estoque', {
      _produto_id: produto.id,
      _nome: nome,
      _foto_url: foto,
      _preco: Number(preco) || 0,
      _sku_base: sku,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Produto atualizado.');
    onDone?.();
  };

  const aplicarAjuste = async () => {
    if (delta === 0) { toast.error('Informe um valor diferente de 0.'); return; }
    setBusy(true);
    const { error } = await (supabase.rpc as any)('ajustar_estoque_manual', {
      _produto_id: produto.id,
      _delta: delta,
      _motivo: motivo || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Ajuste aplicado (${delta > 0 ? '+' : ''}${delta}).`);
    setDelta(0); setMotivo('');
    onDone?.();
    setOpen(false);
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Configurar: {produto.nome} · tam {produto.tamanho}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="border border-border rounded-md p-3 space-y-2">
              <div className="text-xs font-bold text-muted-foreground uppercase">Dados do produto</div>
              <div>
                <label className="text-xs font-semibold block mb-1">Nome</label>
                <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">SKU base</label>
                  <Input value={sku} onChange={e => setSku(e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Preço</label>
                  <Input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Foto (URL)</label>
                <Input value={foto} onChange={e => setFoto(e.target.value)} className="h-8 text-xs" />
              </div>
              <Button size="sm" variant="outline" onClick={salvarMeta} disabled={busy} className="w-full">
                {busy ? 'Salvando…' : 'Salvar dados'}
              </Button>
            </div>

            <div className="border border-border rounded-md p-3 space-y-2">
              <div className="text-xs font-bold text-muted-foreground uppercase">Ajustar quantidade</div>
              <p className="text-xs text-muted-foreground">
                Atual: <strong>{produto.quantidade}</strong> un.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setDelta(d => d - 1)}><Minus size={12} /></Button>
                <Input type="number" value={delta} onChange={e => setDelta(Number(e.target.value))} className="h-8 text-xs text-center" />
                <Button size="sm" variant="outline" onClick={() => setDelta(d => d + 1)}><Plus size={12} /></Button>
              </div>
              <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo (opcional)" className="h-8 text-xs" />
              <Button size="sm" onClick={aplicarAjuste} disabled={busy || delta === 0} className="w-full orange-gradient text-primary-foreground">
                Aplicar ajuste ({delta > 0 ? '+' : ''}{delta})
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EstoqueProdutoConfigButton;
