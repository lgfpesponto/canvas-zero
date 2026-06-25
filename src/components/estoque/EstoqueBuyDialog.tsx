import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Package, Trash2, AlertCircle } from 'lucide-react';

interface EstoqueRow {
  id: string;
  nome: string;
  sku_base: string;
  tamanho: string;
  quantidade: number;
  preco: number;
  foto_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  produto: {
    nome: string;
    foto_url: string | null;
    preco: number;
    tamanhos: EstoqueRow[];
  } | null;
  onSuccess: () => void;
  vendedores?: string[]; // admin pode escolher
}

interface Line {
  produto_id: string;
  tamanho: string;
  sku_base: string;
  disponivel: number;
  quantidade: number;
  preco_unit: number;
  erro?: string;
}

const EstoqueBuyDialog = ({ open, onClose, produto, onSuccess, vendedores = [] }: Props) => {
  const { user, isAdmin } = useAuth();
  const [linhas, setLinhas] = useState<Line[]>([]);
  const [vendedor, setVendedor] = useState('');
  const [cliente, setCliente] = useState('');
  const [whats, setWhats] = useState('');
  const [numero, setNumero] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && produto) {
      const primeiroDisp = produto.tamanhos.find(t => t.quantidade > 0);
      setLinhas(primeiroDisp ? [{
        produto_id: primeiroDisp.id,
        tamanho: primeiroDisp.tamanho,
        sku_base: primeiroDisp.sku_base,
        disponivel: primeiroDisp.quantidade,
        quantidade: 1,
        preco_unit: primeiroDisp.preco,
      }] : []);
      setVendedor(user?.nomeCompleto || '');
      setCliente('');
      setWhats('');
      setNumero('');
    }
  }, [open, produto, user]);

  const total = useMemo(() => linhas.reduce((s, l) => s + (l.preco_unit * l.quantidade), 0), [linhas]);

  if (!produto) return null;

  const addLinha = () => {
    // sugere próximo tamanho disponível ainda não na lista
    const usados = new Set(linhas.map(l => l.produto_id));
    const prox = produto.tamanhos.find(t => !usados.has(t.id) && t.quantidade > 0);
    if (!prox) { toast.info('Sem mais tamanhos disponíveis.'); return; }
    setLinhas(prev => [...prev, {
      produto_id: prox.id, tamanho: prox.tamanho, sku_base: prox.sku_base,
      disponivel: prox.quantidade, quantidade: 1, preco_unit: prox.preco,
    }]);
  };

  const updateLinha = (idx: number, patch: Partial<Line>) => {
    setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, ...patch, erro: undefined } : l));
  };

  const changeTamanho = (idx: number, produto_id: string) => {
    const t = produto.tamanhos.find(x => x.id === produto_id);
    if (!t) return;
    updateLinha(idx, {
      produto_id: t.id, tamanho: t.tamanho, sku_base: t.sku_base,
      disponivel: t.quantidade, preco_unit: t.preco,
      quantidade: Math.min(linhas[idx].quantidade || 1, t.quantidade),
    });
  };

  const removeLinha = (idx: number) => setLinhas(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!vendedor.trim()) { toast.error('Vendedor obrigatório.'); return; }
    if (!numero.trim()) { toast.error('Informe o nº do pedido.'); return; }
    if (linhas.length === 0) { toast.error('Adicione pelo menos um tamanho.'); return; }
    for (const l of linhas) {
      if (l.quantidade <= 0) { toast.error(`Quantidade inválida para tam ${l.tamanho}.`); return; }
      if (l.quantidade > l.disponivel) { toast.error(`Tam ${l.tamanho}: disponível ${l.disponivel}.`); return; }
      if (l.preco_unit <= 0) { toast.error(`Preço inválido tam ${l.tamanho}.`); return; }
    }

    setSubmitting(true);
    const items = linhas.map(l => ({
      produto_id: l.produto_id,
      quantidade: l.quantidade,
      preco_unit: l.preco_unit,
      descricao: produto.nome,
    }));

    const { data, error } = await (supabase.rpc as any)('comprar_estoque', {
      _items: items,
      _vendedor: vendedor.trim(),
      _cliente: cliente.trim(),
      _whatsapp: whats.trim(),
      _numero_pedido: numero.trim(),
    });
    setSubmitting(false);

    if (error) {
      const msg = error.message || '';
      // Parse ESTOQUE_INSUFICIENTE:<sku>:<tamanho>:<disponivel>
      const m = msg.match(/ESTOQUE_INSUFICIENTE:([^:]+):([^:]+):(\d+)/);
      if (m) {
        const [, skuErr, tamErr, dispStr] = m;
        const disp = parseInt(dispStr) || 0;
        setLinhas(prev => prev.map(l => (
          l.sku_base === skuErr && l.tamanho === tamErr
            ? { ...l, disponivel: disp, quantidade: Math.min(l.quantidade, disp), erro: `Acabou de ser vendido por outro vendedor — restam ${disp}` }
            : l
        )));
        toast.error(`Estoque esgotado para tam ${tamErr}. Restam ${disp}.`);
        return;
      }
      if (msg.includes('NUMERO_DUPLICADO')) {
        toast.error('Nº de pedido já existe. Use outro.');
        return;
      }
      toast.error(msg);
      return;
    }

    toast.success(`Pedido ${data?.numero} criado com sucesso!`);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} /> Comprar do Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header produto */}
          <div className="flex gap-3 items-center bg-muted p-3 rounded-lg">
            {produto.foto_url ? (
              <img src={produto.foto_url} alt={produto.nome} className="w-16 h-16 object-cover rounded" />
            ) : (
              <div className="w-16 h-16 rounded bg-background flex items-center justify-center"><Package size={20} /></div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{produto.nome}</h4>
              <p className="text-xs text-muted-foreground">Preço base: {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>

          {/* Vendedor / cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vendedor *</Label>
              {isAdmin && vendedores.length > 0 ? (
                <select
                  className="w-full h-9 px-2 rounded border border-border bg-background text-sm"
                  value={vendedor}
                  onChange={e => setVendedor(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <Input value={vendedor} onChange={e => setVendedor(e.target.value)} className="h-9 text-sm" disabled={!isAdmin} />
              )}
            </div>
            <div>
              <Label className="text-xs">Nº do pedido *</Label>
              <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="7E-AAAA0001" className="h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Input value={cliente} onChange={e => setCliente(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <Input value={whats} onChange={e => setWhats(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Linhas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tamanhos *</Label>
              <Button size="sm" variant="outline" type="button" onClick={addLinha}>+ tamanho</Button>
            </div>
            {linhas.map((l, idx) => (
              <div key={idx} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-center bg-muted/50 p-2 rounded">
                  <div className="col-span-3">
                    <select
                      className="w-full h-8 px-1 rounded border border-border bg-background text-xs"
                      value={l.produto_id}
                      onChange={e => changeTamanho(idx, e.target.value)}
                    >
                      {produto.tamanhos.map(t => (
                        <option key={t.id} value={t.id} disabled={t.quantidade === 0}>
                          {t.tamanho} ({t.quantidade} disp.)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      max={l.disponivel}
                      value={l.quantidade}
                      onChange={e => updateLinha(idx, { quantidade: Math.max(1, Math.min(l.disponivel, parseInt(e.target.value) || 1)) })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      step="0.01"
                      value={l.preco_unit}
                      onChange={e => updateLinha(idx, { preco_unit: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs"
                      placeholder="Preço unit."
                    />
                  </div>
                  <div className="col-span-2 text-xs text-right font-semibold">
                    {(l.preco_unit * l.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="col-span-1 text-right">
                    {linhas.length > 1 && (
                      <button type="button" onClick={() => removeLinha(idx)} className="text-destructive hover:opacity-70">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {l.erro && (
                  <div className="flex items-center gap-1 text-xs text-destructive ml-1">
                    <AlertCircle size={12} /> {l.erro}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center border-t pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold text-primary">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="orange-gradient text-primary-foreground">
              {submitting ? 'Processando…' : 'Finalizar compra'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstoqueBuyDialog;
