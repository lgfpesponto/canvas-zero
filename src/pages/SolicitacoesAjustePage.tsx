import { Fragment, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Check, X, Search, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrderById } from '@/hooks/useOrderById';
import { getOrderFinalValue } from '@/lib/order-logic';
import { EXTRA_PRODUCT_NAME_MAP } from '@/lib/extrasConfig';

type Row = {
  id: string;
  order_id: string;
  vendedor: string;
  numero: string;
  valor_atual: number;
  valor_solicitado: number;
  desconto_solicitado: number | null;
  motivo: string;
  status: 'pendente' | 'aprovado' | 'negado' | 'visto';
  resposta_admin: string | null;
  decidido_em: string | null;
  created_at: string;
};

const fmt = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const descontoDe = (r: Row) => Number(r.desconto_solicitado ?? r.valor_solicitado ?? 0);

function OrderInlinePreview({ orderId }: { orderId: string }) {
  const { order, loading } = useOrderById(orderId);
  if (loading) return <div className="p-4 text-center text-xs text-muted-foreground"><Loader2 className="inline animate-spin h-4 w-4" /></div>;
  if (!order) return <div className="p-4 text-center text-xs text-muted-foreground">Pedido não encontrado.</div>;
  const total = getOrderFinalValue(order);
  const desconto = Number((order as any).desconto || 0);
  const subtotal = total + desconto;
  const extraLabel = order.tipoExtra ? (EXTRA_PRODUCT_NAME_MAP[order.tipoExtra] || order.tipoExtra) : null;
  const detalhes = (order as any).extraDetalhes || {};

  return (
    <div className="p-4 bg-muted/30 border-t space-y-3 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <div><span className="text-muted-foreground">Nº </span><b>{order.numero}</b></div>
        <div><span className="text-muted-foreground">Vendedor: </span>{order.vendedor}</div>
        {(order as any).cliente && <div><span className="text-muted-foreground">Cliente: </span>{(order as any).cliente}</div>}
        <div><span className="text-muted-foreground">Status: </span><Badge variant="secondary">{order.status}</Badge></div>
        {extraLabel && <div><span className="text-muted-foreground">Tipo: </span>{extraLabel}</div>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {order.modelo && <div><b>Modelo:</b> {order.modelo}</div>}
        {order.tamanho && <div><b>Tamanho:</b> {order.tamanho}</div>}
        {order.quantidade && <div><b>Qtd:</b> {order.quantidade}</div>}
        {(order as any).bordado && <div><b>Bordado:</b> {(order as any).bordado}</div>}
        {(order as any).corCano && <div><b>Cor Cano:</b> {(order as any).corCano}</div>}
        {(order as any).corGaspea && <div><b>Cor Gáspea:</b> {(order as any).corGaspea}</div>}
        {(order as any).solado && <div><b>Solado:</b> {(order as any).solado}</div>}
        {(order as any).bico && <div><b>Bico:</b> {(order as any).bico}</div>}
      </div>
      {detalhes && Object.keys(detalhes).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Ver todos os detalhes</summary>
          <pre className="mt-2 bg-background p-2 rounded border max-h-48 overflow-auto text-[11px]">{JSON.stringify(detalhes, null, 2)}</pre>
        </details>
      )}
      {(order as any).observacaoEntrega && (
        <div className="text-xs">
          <b>Observação de entrega:</b> {(order as any).observacaoEntrega}
        </div>
      )}
      <div className="flex items-center gap-6 pt-2 border-t">
        <div><span className="text-muted-foreground text-xs">Subtotal: </span><b>{fmt(subtotal)}</b></div>
        {desconto > 0 && <div><span className="text-muted-foreground text-xs">Desconto atual: </span><b className="text-destructive">−{fmt(desconto)}</b></div>}
        <div><span className="text-muted-foreground text-xs">Total: </span><b className="text-primary text-base">{fmt(total)}</b></div>
      </div>
    </div>
  );
}

export default function SolicitacoesAjustePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pendente' | 'decidido' | 'todos'>('pendente');
  const [busca, setBusca] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectRow, setRejectRow] = useState<Row | null>(null);
  const [rejectMsg, setRejectMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('order_ajuste_solicitacoes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = rows.filter(r => {
    if (filter === 'pendente' && r.status !== 'pendente') return false;
    if (filter === 'decidido' && !['aprovado', 'negado', 'visto'].includes(r.status)) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return r.numero.toLowerCase().includes(q) || r.vendedor.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAprovar = async (id: string) => {
    setActionId(id);
    const { error } = await supabase.rpc('aprovar_ajuste_solicitacao' as any, { _solicitacao_id: id });
    setActionId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Ajuste aprovado e aplicado ao pedido');
    void load();
  };

  const handleRecusarConfirm = async () => {
    if (!rejectRow) return;
    setActionId(rejectRow.id);
    const { error } = await supabase.rpc('recusar_ajuste_solicitacao' as any, {
      _solicitacao_id: rejectRow.id,
      _resposta: rejectMsg.trim() || null,
    });
    setActionId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Solicitação recusada — vendedor notificado');
    setRejectRow(null); setRejectMsg('');
    void load();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold">Solicitações de Ajuste de Preço</h1>
        <Badge variant="secondary">{rows.filter(r => r.status === 'pendente').length} pendentes</Badge>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="decidido">Decididas</TabsTrigger>
              <TabsTrigger value="todos">Todas</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por número ou vendedor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin inline-block" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma solicitação.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6"></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Desconto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const isPendente = r.status === 'pendente';
                const isExpanded = expandedId === r.id;
                const statusColor = r.status === 'aprovado' ? 'bg-emerald-600 hover:bg-emerald-600' : r.status === 'negado' ? 'bg-destructive hover:bg-destructive' : '';
                return (
                  <Fragment key={r.id}>
                    <TableRow className={!isPendente ? 'bg-muted/20' : ''}>
                      <TableCell>
                        <button onClick={() => setExpandedId(isExpanded ? null : r.id)} className="text-muted-foreground hover:text-foreground">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</TableCell>
                      <TableCell>{r.vendedor}</TableCell>
                      <TableCell>
                        <button onClick={() => setExpandedId(isExpanded ? null : r.id)} className="text-primary hover:underline font-mono text-sm">
                          {r.numero}
                        </button>
                        <Link to={`/pedido/${r.order_id}`} className="ml-2 text-muted-foreground hover:text-primary inline-block" title="Abrir pedido completo">
                          <ExternalLink size={12} />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmt(descontoDe(r))}</TableCell>
                      <TableCell className="max-w-[280px] text-xs">{r.motivo}</TableCell>
                      <TableCell>
                        <Badge variant={isPendente ? 'secondary' : 'default'} className={statusColor}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isPendente && (
                          <div className="flex items-center gap-1 justify-end">
                            <Button size="sm" onClick={() => handleAprovar(r.id)} disabled={actionId === r.id} className="h-7 bg-emerald-600 hover:bg-emerald-700">
                              {actionId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check size={14} className="mr-1" /> OK</>}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => { setRejectRow(r); setRejectMsg(''); }} disabled={actionId === r.id} className="h-7">
                              <X size={14} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <OrderInlinePreview orderId={r.order_id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) setRejectRow(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar solicitação</DialogTitle>
            <DialogDescription>
              Opcional: escreva uma resposta para o vendedor. Ele receberá uma notificação.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={rejectMsg} onChange={(e) => setRejectMsg(e.target.value)}
            placeholder="Motivo da recusa (opcional)..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRecusarConfirm} disabled={actionId === rejectRow?.id}>
              {actionId === rejectRow?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
