import { Button } from '@/components/ui/button';
import { ExternalLink, MessageCircle, MapPin } from 'lucide-react';

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

const ETAPAS = ['Pagamento aprovado', 'Separar ou Produzir', 'Faturar', 'Despachar', 'Marcar como entregue'];
function etapaAtual(status: string, fulfillment?: string, payment?: string): number {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver') || s.includes('entreg')) return 5;
  if (s.includes('ship') || s.includes('despach') || s.includes('sent')) return 4;
  if (s.includes('invoic') || s.includes('fatur')) return 3;
  if (s.includes('separ') || s.includes('produ') || s.includes('approved') || s.includes('aprov') || payment === 'paid' || s === 'open') return 1;
  return 0;
}

const Card = ({ title, right, children, className = '' }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border bg-card p-4 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BagyPedidoView({ pedido }: { pedido: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pl: any = pedido.payload || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(pl.items) ? pl.items : [];
  const cust = pl.customer || {};
  const addr = pl.address || pedido.endereco || {};
  const ship = pl.shipping || {};
  const pay = pl.payment || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discounts: any[] = Array.isArray(pl.discounts) ? pl.discounts : [];
  const utm = pl.extra?.utm || {};
  const tagsRaw = pl.tags;
  const tags: string[] = Array.isArray(tagsRaw)
    ? tagsRaw.map((t: unknown) => (typeof t === 'string' ? t : (t as { name?: string })?.name || '')).filter(Boolean)
    : typeof tagsRaw === 'string' ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const nome = [cust.first_name, cust.last_name].filter(Boolean).join(' ') || pedido.cliente_nome || '—';
  const phone = cust.phone || pedido.cliente_whats;
  const waNum = String(phone || '').replace(/\D/g, '');
  const freteOriginal = Number(ship.price_cost ?? 0);
  const fretePago = Number(ship.price ?? pedido.frete ?? 0);
  const etapa = etapaAtual(pedido.status_bagy, pl.fulfillment_status, pl.payment_status);
  const enderecoTxt = [addr.street, addr.number].filter(Boolean).join(', ') + (addr.district || addr.neighborhood ? ` - ${addr.district || addr.neighborhood}` : '');
  const mapsQ = encodeURIComponent(`${enderecoTxt}, ${addr.city || ''} - ${addr.state || ''}, ${addr.zipcode || ''}`);
  const statusUrl = pl.token ? `https://7estrivos.com.br/pedido/${pl.token}` : null;
  const embarque = ship.shipment_time != null && pl.created_at ? new Date(new Date(String(pl.created_at).replace(' ', 'T')).getTime() + Number(ship.shipment_time) * 86400000) : null;
  const entrega = ship.delivery_time != null && pl.created_at ? new Date(new Date(String(pl.created_at).replace(' ', 'T')).getTime() + Number(ship.delivery_time) * 86400000) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Pedido #{pedido.numero_bagy}</h2>
        <p className="text-xs text-muted-foreground">Criado em {fmtDate(pl.created_at || pedido.bagy_created_at || pedido.created_at)} via loja virtual</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Resumo do pedido">
            <div className="divide-y">
              {items.map((it, i) => {
                const brinde = Number(it.price ?? 0) <= 0;
                return (
                  <div key={i} className="flex items-center gap-3 py-3">
                    {it.image ? <img src={it.image} alt="" className="w-16 h-16 object-cover rounded" /> : <div className="w-16 h-16 rounded bg-muted" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{it.name}</div>
                      {it.variation && <div className="text-xs text-muted-foreground">{it.variation}</div>}
                    </div>
                    <div className="text-sm w-36">
                      <div><span className="text-primary">{it.quantity} x</span> {brl(it.price)}</div>
                      {it.selling_out_of_stock && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500 text-white">Venda sem estoque</span>}
                    </div>
                    <div className="w-24 text-right font-medium">{brinde ? 'Brinde' : brl(it.total)}</div>
                  </div>
                );
              })}
              {items.length === 0 && <div className="py-3 text-sm text-muted-foreground">Sem itens no pedido original.</div>}
              <div className="flex justify-between py-3"><span>Subtotal</span><span className="font-medium">{brl(pl.subtotal)}</span></div>
              <div className="flex justify-between py-3 items-end">
                <span>Frete</span>
                <span className="text-right">
                  {freteOriginal > fretePago && <div className="text-xs line-through text-muted-foreground">{brl(freteOriginal)}</div>}
                  <div className="font-medium">{brl(fretePago)}</div>
                </span>
              </div>
              {Number(pl.discount ?? pedido.desconto ?? 0) > 0 && (
                <div className="flex justify-between py-3 text-destructive">
                  <span>Descontos{discounts.map((d, i) => <div key={i} className="text-xs text-muted-foreground">{d.type === 'coupon' ? 'Cupom de desconto' : 'Desconto'} {d.code || d.name}</div>)}</span>
                  <span className="font-medium">-{brl(pl.discount ?? pedido.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 text-lg font-semibold text-green-700"><span>Total</span><span>{brl(pl.total ?? pedido.total)}</span></div>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card title="Pagamento">
              <div className="text-lg font-semibold text-green-700">{brl(pl.total ?? pedido.total)}</div>
              <div className="text-xs text-muted-foreground">{pay.name || pedido.pagamento || pay.method || '—'}{pay.parcels > 1 ? ` · ${pay.parcels}x` : ''}</div>
            </Card>
            <Card title="Frete" right={<span className="text-destructive font-medium">{brl(fretePago)}</span>}>
              <div className="text-sm space-y-1">
                <div>{ship.alias || ship.name || pedido.metodo_envio || '—'}</div>
                {embarque && <div>Embarque: {embarque.toLocaleDateString('pt-BR')}</div>}
                {entrega && <div>Entrega: {entrega.toLocaleDateString('pt-BR')}</div>}
                {pedido.tracking_code && <div>Rastreio: <span className="font-mono">{pedido.tracking_code}</span></div>}
              </div>
            </Card>
            <Card title="Cliente" right={waNum ? <a href={`https://wa.me/55${waNum}`} target="_blank" rel="noreferrer" className="text-green-600"><MessageCircle size={18} /></a> : null}>
              <div className="text-sm space-y-1">
                <div className="font-medium text-primary">{nome}</div>
                <div className="text-xs">{fmtDoc(cust.doc || pedido.cliente_doc)}</div>
                <div>{cust.email || pedido.cliente_email}</div>
                {phone && <div className="text-primary">{fmtPhone(phone)}</div>}
              </div>
            </Card>
            <Card title="Endereço">
              <div className="text-sm space-y-1">
                <div className="font-medium">{addr.receiver || nome}</div>
                <div>{enderecoTxt}{addr.detail || addr.complement ? ` (${addr.detail || addr.complement})` : ''}</div>
                <div className="text-muted-foreground">{addr.city} / {addr.state} - {fmtCep(addr.zipcode)}</div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQ}`} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><MapPin size={14} /> Ver no mapa</a>
              </div>
            </Card>
          </div>

          <Card title="Histórico">
            <div className="border-l-2 pl-4 space-y-3">
              {pl.note && <div><div className="font-medium">Observação do cliente</div><div className="text-sm">{pl.note}</div></div>}
              <div>
                <div className="font-medium">{pl.payment_status === 'paid' || etapa >= 1 ? 'Aprovado' : 'Criado'}</div>
                <div className="text-sm">Gerado automaticamente pelo sistema</div>
                <div className="text-xs text-muted-foreground">{fmtDate(pl.created_at)}</div>
              </div>
              {pl.canceled_at && <div><div className="font-medium text-destructive">Cancelado</div><div className="text-xs text-muted-foreground">{fmtDate(pl.canceled_at)}</div></div>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Status" right={<span className="text-xs text-muted-foreground">{pedido.status_bagy}</span>}>
            <ol className="space-y-3">
              {ETAPAS.map((e, i) => {
                const n = i + 1;
                const done = n <= etapa;
                return (
                  <li key={e} className="flex items-center gap-3">
                    <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm border ${done ? 'bg-green-700 text-white border-green-700' : 'bg-card'}`}>{n}</span>
                    <div>
                      <div className={done ? 'font-medium' : 'text-primary'}>{e}</div>
                      {n === 1 && done && <div className="text-xs text-muted-foreground">em {fmtDate(pl.created_at)}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {statusUrl && (
            <Card title="Link de status do pedido">
              <p className="text-sm text-muted-foreground mb-3">Com o link do pedido o cliente poderá acompanhar o status sem precisar fazer login.</p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" asChild><a href={statusUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} className="mr-1" /> Abrir status do pedido</a></Button>
                {waNum && (
                  <Button className="w-full bg-green-700 hover:bg-green-800 text-white" asChild>
                    <a href={`https://wa.me/55${waNum}?text=${encodeURIComponent(`Acompanhe seu pedido: ${statusUrl}`)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} className="mr-1" /> Enviar por WhatsApp</a>
                  </Button>
                )}
              </div>
            </Card>
          )}

          <Card title="Tags">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">{tags.map(t => <span key={t} className="text-xs font-medium px-2 py-1 rounded bg-primary text-primary-foreground">{t}</span>)}</div>
            ) : <div className="text-sm text-muted-foreground">Nenhuma tag recebida da Bagy.</div>}
          </Card>

          <Card title="Resumo da conversão">
            <dl className="text-sm divide-y">
              {[['IP', pl.extra?.customer_ip], ['UTM Medium', utm.utm_medium], ['UTM Source', utm.utm_source], ['UTM Campaign', utm.utm_campaign]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 gap-2"><dt>{k}</dt><dd className="text-xs text-muted-foreground break-all text-right">{v || '—'}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
