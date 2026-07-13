import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, AlertTriangle, CheckCircle2, Pencil } from 'lucide-react';
import type { Order } from '@/contexts/AuthContext';

interface Props {
  order: Order;
}

const EstoqueAdminPanel = ({ order }: Props) => {
  const [editing, setEditing] = useState(false);
  const [sku, setSku] = useState(order.skuEstoque || '');
  const [nome, setNome] = useState(order.nomeProdutoEstoque || order.modelo || '');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const canCriar = !order.estoqueBaixado
    && order.status === 'Baixa Estoque'
    && (order.skuEstoque?.trim() || sku.trim())
    && (order.nomeProdutoEstoque?.trim() || nome.trim());

  const handleSaveMeta = async () => {
    if (!sku.trim()) { toast.error('Informe o SKU.'); return; }
    if (!nome.trim()) { toast.error('Informe o nome do produto.'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('orders')
      .update({ sku_estoque: sku.trim(), nome_produto_estoque: nome.trim() })
      .eq('id', order.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('SKU e nome salvos.');
    setEditing(false);
    // recarrega
    setTimeout(() => window.location.reload(), 400);
  };

  const handleCriarEstoque = async () => {
    setCreating(true);
    const { data, error } = await (supabase.rpc as any)('criar_estoque_produto', { _order_id: order.id });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Estoque criado/abastecido com sucesso!');
    supabase.functions.invoke('bagy-stock-sync', { body: { retry_unsynced: true } }).catch(() => {});
    setTimeout(() => window.location.reload(), 500);
  };

  if (order.estoqueBaixado) {
    return (
      <div className="mb-3 p-3 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center gap-2 text-sm">
        <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400" />
        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
          Estoque já criado para este pedido. A etapa não pode mais ser alterada (apenas exclusão).
        </span>
      </div>
    );
  }

  return (
    <div className="mb-3 p-3 border border-primary/30 bg-primary/5 rounded-lg space-y-2 text-sm">
      <div className="flex items-center gap-2 font-semibold text-primary">
        <Package size={16} /> Pedido de Estoque
      </div>

      {editing ? (
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold mb-1 block">SKU *</label>
            <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="ex: bota-country-marrom-38" className="h-8 text-xs font-mono" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Nome do produto *</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do produto" className="h-8 text-xs" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setSku(order.skuEstoque || ''); setNome(order.nomeProdutoEstoque || order.modelo || ''); }}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveMeta} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="text-xs space-y-0.5">
            <div><span className="text-muted-foreground">SKU: </span><span className="font-mono font-semibold">{order.skuEstoque || <span className="text-destructive">não definido</span>}</span></div>
            <div><span className="text-muted-foreground">Produto: </span><span className="font-semibold">{order.nomeProdutoEstoque || <span className="text-destructive">não definido</span>}</span></div>
            <div><span className="text-muted-foreground">Tamanho: </span><span className="font-semibold">{order.tamanho}</span> · <span className="text-muted-foreground">Qtd: </span><span className="font-semibold">{order.quantidade}</span></div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={12} /> Editar
          </Button>
        </div>
      )}

      {!order.skuEstoque && !editing && (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded p-2">
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          <span>Sem SKU não é possível criar estoque. Preencha pelo botão "Editar".</span>
        </div>
      )}

      {order.status === 'Baixa Estoque' && (
        <Button
          size="sm"
          className="w-full orange-gradient text-primary-foreground"
          onClick={handleCriarEstoque}
          disabled={!canCriar || creating || editing}
        >
          {creating ? 'Criando…' : 'Criar estoque deste pedido'}
        </Button>
      )}
      {order.status !== 'Baixa Estoque' && (
        <p className="text-xs text-muted-foreground">
          Mova o pedido para a etapa <span className="font-semibold">"Baixa Estoque"</span> para habilitar a criação no estoque.
        </p>
      )}
    </div>
  );
};

export default EstoqueAdminPanel;
