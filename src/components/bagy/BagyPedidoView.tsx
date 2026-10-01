import { MessageCircle, MapPin, RefreshCw, FileText, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const brl = (n: unknown) => {
  const v = Number(n ?? 0);
  return (isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const fmtDate = (s?: string | null) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(s);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};
const fmtDoc = (d?: string | null) => {
  const x = String(d || '').replace(/\D/g, '');
  if (x.length === 11) return x.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (x.length === 14) return x.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d || '';
};
const fmtPhone = (p?: string | null) => {
  const x = String(p || '').replace(/\D/g, '');
  if (x.length === 11) return x.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (x.length === 10) return x.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return p || '';
};
const fmtCep = (c?: string | null) => String(c || '').replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BagyPedidoView({ pedido, nota, statusLabel, onOpenNota, onOpenTracking }: { pedido: any; nota?: any; statusLabel?: string; onOpenNota?: () => void; onOpenTracking?: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fresh, setFresh] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const sync = async () => {
    setSyncing(true); setSyncErr(null);
    const { data, error } = await supabase.functions.invoke('bagy-order-refresh', { body: { pedido_id: pedido.id } });
    if (error || data?.error) setSyncErr(data?.error || error?.message || 'Falha');
    else if (data?.payload) setFresh(data.payload);
    setSyncing(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { sync(); }, [pedido.id]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pl: any = fresh || pedido.payload || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(pl.items) ? pl.items : [];
  const cust = pl.customer || {};
  const addr = pl.address || pedido.endereco || {};
  const ship = pl.shipping || {};
  const pay = pl.payment || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discounts: any[] = Array.isArray(pl.discounts) ? pl.discounts : [];
  const tagsRaw = pl.tags;
  const tags: string[] = Array.isArray(tagsRaw)
    ? tagsRaw.map((t: unknown) => (typeof t === 'string' ? t : (t as { name?: string })?.name || '')).filter(Boolean)
    : typeof tagsRaw === 'string' ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const nome = [cust.first_name, cust.last_name].filter(Boolean).join(' ') || pedido.cliente_nome || '—';
  const phone = cust.phone || pedido.cliente_whats;
  const waNum = String(phone || '').replace(/\D/g, '');
  const freteOriginal = Number(ship.price_cost ?? 0);
  const fretePago = Number(ship.price ?? pedido.frete ?? 0);
  const enderecoTxt = [addr.street, addr.number].filter(Boolean).join(', ') + (addr.district || addr.neighborhood ? ` - ${addr.district || addr.neighborhood}` : '');
  const mapsQ = encodeURIComponent(`${enderecoTxt}, ${addr.city || ''} - ${addr.state || ''}, ${addr.zipcode || ''}`);
  const entrega = ship.delivery_time != null && pl.created_at ? new Date(new Date(String(pl.created_at).replace(' ', 'T')).getTime() + Number(ship.delivery_time) * 86400000) : null;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-bold">Pedido #{pedido.numero_bagy}</span>
          <span className="ml-2 text-xs text-muted-foreground">{fmtDate(pl.created_at || pedido.bagy_created_at || pedido.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={sync} disabled={syncing} title="Atualizar da Bagy" className="text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {syncErr && <div className="text-xs text-destructive">{syncErr}</div>}

      {(nota || pedido.tracking_code) && (
        <div className="grid sm:grid-cols-2 gap-2">
          {nota && (
            <button type="button" onClick={onOpenNota} className="flex items-center gap-2 rounded border bg-card px-3 py-2 text-left hover:bg-accent/40">
              <FileText size={16} className="text-primary shrink-0" />
              <div className="min-w-0">
                <div className="font-medium">NF-e nº {nota.numero} · {nota.status}</div>
                {nota.chave_acesso && <div className="text-[10px] font-mono text-muted-foreground truncate">{nota.chave_acesso}</div>}
              </div>
            </button>
          )}
          {pedido.tracking_code && (
            <button type="button" onClick={onOpenTracking} className="flex items-center gap-2 rounded border bg-card px-3 py-2 text-left hover:bg-accent/40">
              <ShoppingCart size={16} className="text-primary shrink-0" />
              <div className="min-w-0">
                <div className="font-medium">{ship.alias || ship.name || pedido.metodo_envio || 'Transporte'}</div>
                <div className="text-xs font-mono text-muted-foreground truncate">{pedido.tracking_code}</div>
              </div>
            </button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 rounded border bg-card p-3">
          <div className="divide-y">
            {items.map((it, i) => {
              const brinde = Number(it.price ?? 0) <= 0;
              return (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{it.name}</span>
                    {it.variation && <span className="text-xs text-muted-foreground"> · {it.variation}</span>}
                    {it.selling_out_of_stock && <span className="ml-1 text-[9px] font-semibold px-1 rounded bg-primary text-primary-foreground">sem estoque</span>}
                  </div>
                  <div className="text-xs w-24 text-right">{it.quantity} x {brl(it.price)}</div>
                  <div className="w-20 text-right font-medium">{brinde ? 'Brinde' : brl(it.total)}</div>
                </div>
              );
            })}
            {items.length === 0 && <div className="py-1.5 text-muted-foreground">Sem itens.</div>}
            <div className="flex justify-between py-1"><span>Subtotal</span><span>{brl(pl.subtotal)}</span></div>
            <div className="flex justify-between py-1"><span>Frete</span><span>{freteOriginal > fretePago && <s className="text-xs text-muted-foreground mr-1">{brl(freteOriginal)}</s>}{brl(fretePago)}</span></div>
            {Number(pl.discount ?? pedido.desconto ?? 0) > 0 && (
              <div className="flex justify-between py-1 text-destructive">
                <span>Desconto{discounts.map((d, i) => <span key={i} className="text-xs text-muted-foreground"> · {d.code || d.name}</span>)}</span>
                <span>-{brl(pl.discount ?? pedido.desconto)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 font-semibold"><span>Total</span><span>{brl(pl.total ?? pedido.total)}</span></div>
          </div>
        </div>

        <div className="rounded border bg-card p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-primary">{nome}</span>
            {waNum && <a href={`https://wa.me/55${waNum}`} target="_blank" rel="noreferrer" className="text-primary"><MessageCircle size={16} /></a>}
          </div>
          <div className="text-xs">{fmtDoc(cust.doc || pedido.cliente_doc)} {phone && `· ${fmtPhone(phone)}`}</div>
          <div className="text-xs truncate">{cust.email || pedido.cliente_email}</div>
          <div className="text-xs pt-1 border-t">{enderecoTxt}{addr.detail || addr.complement ? ` (${addr.detail || addr.complement})` : ''} — {addr.city}/{addr.state} {fmtCep(addr.zipcode)}
            <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQ}`} target="_blank" rel="noreferrer" className="ml-1 text-primary inline-flex items-center"><MapPin size={12} /></a>
          </div>
          <div className="text-xs pt-1 border-t">
            Pagamento: {pay.name || pedido.pagamento || pay.method || '—'}{pay.parcels > 1 ? ` · ${pay.parcels}x` : ''}
          </div>
          <div className="text-xs">Frete: {ship.alias || ship.name || pedido.metodo_envio || '—'}{entrega ? ` · entrega ${entrega.toLocaleDateString('pt-BR')}` : ''}</div>
          {pl.note && <div className="text-xs pt-1 border-t">Obs.: {pl.note}</div>}
          <div className="flex flex-wrap gap-1 pt-1 border-t">
            {tags.length > 0 ? tags.map(t => <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{t}</span>)
              : <span className="text-xs text-muted-foreground">Sem tags</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
