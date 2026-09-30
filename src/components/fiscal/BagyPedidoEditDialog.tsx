import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const num = (s: unknown) => Number(String(s ?? '').replace(',', '.')) || 0;
const dig = (s: unknown) => String(s ?? '').replace(/\D/g, '');

const Campo = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}><label className="mb-1 block text-xs font-medium text-foreground/80">{label}</label>{children}</div>
);

export function BagyPedidoEditDialog({ pedidoId, open, onOpenChange, onSaved }: {
  pedidoId: string; open: boolean; onOpenChange: (v: boolean) => void; onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<any>(null);
  const [end, setEnd] = useState<any>({});
  const [itens, setItens] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [a, b] = await Promise.all([
        supabase.from('bagy_pedidos').select('*').eq('id', pedidoId).maybeSingle(),
        supabase.from('bagy_pedido_itens').select('id, nome_produto, variacao_nome, sku, tamanho, cor, quantidade, preco_unit, ncm, status').eq('pedido_id', pedidoId).order('created_at'),
      ]);
      setP(a.data); setEnd((a.data?.endereco as any) || {}); setItens(b.data || []);
      setLoading(false);
    })();
  }, [open, pedidoId]);

  const buscarCep = async () => {
    const cep = dig(end.zipcode); if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(x => x.json());
      if (!r.erro) setEnd((e: any) => ({ ...e, street: r.logradouro || e.street, district: r.bairro || e.district, city: r.localidade, state: r.uf, city_ibge_id: r.ibge }));
    } catch { /* ignore */ }
  };

  const setItem = (i: number, patch: any) => setItens(a => a.map((x, k) => k === i ? { ...x, ...patch } : x));
  const subtotal = itens.reduce((s, it) => s + num(it.quantidade) * num(it.preco_unit), 0);
  const total = Math.round((subtotal + num(p?.frete) - num(p?.desconto)) * 100) / 100;

  const salvar = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('bagy_pedidos').update({
        cliente_nome: p.cliente_nome, cliente_doc: p.cliente_doc, cliente_email: p.cliente_email, cliente_whats: p.cliente_whats,
        endereco: end, pagamento: p.pagamento, metodo_envio: p.metodo_envio,
        tracking_code: p.tracking_code, tracking_url: p.tracking_url,
        frete: num(p.frete), desconto: num(p.desconto), total,
      }).eq('id', pedidoId);
      if (error) throw error;
      for (const it of itens) {
        const { error: e2 } = await supabase.from('bagy_pedido_itens').update({
          nome_produto: it.nome_produto, variacao_nome: it.variacao_nome, sku: it.sku, tamanho: it.tamanho, cor: it.cor,
          quantidade: Math.max(1, Math.round(num(it.quantidade))), preco_unit: num(it.preco_unit), ncm: dig(it.ncm) || null,
          status: it.status,
        }).eq('id', it.id);
        if (e2) throw e2;
      }
      toast.success('Pedido atualizado no portal.');
      onSaved?.(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message || 'Falha ao salvar.'); }
    finally { setSaving(false); }
  };

  const f = (k: string, label: string, className = '') => (
    <Campo label={label} className={className}><Input value={p?.[k] ?? ''} onChange={e => setP({ ...p, [k]: e.target.value })} /></Campo>
  );
  const e = (k: string, label: string, className = '', extra: any = {}) => (
    <Campo label={label} className={className}><Input value={end?.[k] ?? ''} onChange={ev => setEnd({ ...end, [k]: ev.target.value })} {...extra} /></Campo>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" onClick={ev => ev.stopPropagation()}>
        <DialogHeader><DialogTitle>Editar pedido {p ? `RC-${p.numero_bagy}` : ''}</DialogTitle></DialogHeader>
        {loading || !p ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : (
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-bold">Cliente</h3>
              <div className="grid gap-3 md:grid-cols-4">
                {f('cliente_nome', 'Nome / Razão social', 'md:col-span-2')}
                {f('cliente_doc', 'CPF/CNPJ')}
                {f('cliente_whats', 'WhatsApp')}
                {f('cliente_email', 'E-mail', 'md:col-span-2')}
                {f('pagamento', 'Forma de pagamento', 'md:col-span-2')}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-bold">Endereço</h3>
              <div className="grid gap-3 md:grid-cols-4">
                {e('zipcode', 'CEP', '', { onBlur: buscarCep })}
                {e('street', 'Logradouro', 'md:col-span-2')}
                {e('number', 'Número')}
                {e('detail', 'Complemento')}
                {e('district', 'Bairro')}
                {e('city', 'Município')}
                {e('state', 'UF')}
                {e('city_ibge_id', 'Código IBGE')}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-bold">Itens</h3>
              <div className="space-y-2">
                {itens.map((it, i) => (
                  <div key={it.id} className="grid grid-cols-2 gap-2 rounded-md border p-2 md:grid-cols-4">
                    <Campo label="Produto" className="md:col-span-2"><Input value={it.nome_produto ?? ''} onChange={ev => setItem(i, { nome_produto: ev.target.value })} /></Campo>
                    <Campo label="Variação"><Input value={it.variacao_nome ?? ''} onChange={ev => setItem(i, { variacao_nome: ev.target.value })} /></Campo>
                    <Campo label="SKU"><Input value={it.sku ?? ''} onChange={ev => setItem(i, { sku: ev.target.value })} /></Campo>
                    <Campo label="Tamanho"><Input value={it.tamanho ?? ''} onChange={ev => setItem(i, { tamanho: ev.target.value })} /></Campo>
                    <Campo label="Cor"><Input value={it.cor ?? ''} onChange={ev => setItem(i, { cor: ev.target.value })} /></Campo>
                    <Campo label="Qtd"><Input inputMode="numeric" value={it.quantidade ?? ''} onChange={ev => setItem(i, { quantidade: ev.target.value })} /></Campo>
                    <Campo label="Valor unit."><Input inputMode="decimal" value={it.preco_unit ?? ''} onChange={ev => setItem(i, { preco_unit: ev.target.value })} /></Campo>
                    <Campo label="NCM"><Input value={it.ncm ?? ''} onChange={ev => setItem(i, { ncm: ev.target.value })} /></Campo>
                    <Campo label="Situação" className="md:col-span-2"><Input value={it.status ?? ''} onChange={ev => setItem(i, { status: ev.target.value })} /></Campo>
                  </div>
                ))}
              </div>
            </section>
            <section className="grid gap-3 md:grid-cols-4">
              {f('metodo_envio', 'Método de envio', 'md:col-span-2')}
              {f('frete', 'Frete')}
              {f('desconto', 'Desconto')}
              {f('tracking_code', 'Código de rastreio')}
              {f('tracking_url', 'Link de rastreio', 'md:col-span-3')}
              <Campo label="Total" className="md:col-span-2"><Input disabled value={total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /></Campo>
              <Campo label="Erro registrado" className="md:col-span-2"><Textarea disabled value={p.erro ?? ''} /></Campo>
            </section>
            <p className="text-xs text-muted-foreground">As alterações ficam salvas no portal e são usadas na nota fiscal. A Bagy não é alterada.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={saving || !p} onClick={salvar}>{saving && <Loader2 size={14} className="mr-1 animate-spin" />} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
