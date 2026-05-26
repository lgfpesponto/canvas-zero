import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, XCircle, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Row = {
  id: string;
  order_id: string;
  vendedor: string;
  numero: string;
  valor_atual: number;
  valor_solicitado: number;
  motivo: string;
  status: 'pendente' | 'aprovado' | 'negado';
  resposta_admin: string | null;
  decidido_em: string | null;
  created_at: string;
};

const fmt = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SolicitacoesAjustePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pendente' | 'aprovado' | 'negado' | 'todos'>('pendente');
  const [busca, setBusca] = useState('');
  const [decidir, setDecidir] = useState<{ row: Row; aprovar: boolean } | null>(null);
  const [resposta, setResposta] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (filter !== 'todos' && r.status !== filter) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return r.numero.toLowerCase().includes(q) || r.vendedor.toLowerCase().includes(q);
    }
    return true;
  });

  const confirmDecisao = async () => {
    if (!decidir) return;
    setSaving(true);
    const { error } = await supabase.rpc('decidir_ajuste_solicitacao', {
      _id: decidir.row.id, _aprovar: decidir.aprovar, _resposta: resposta || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(decidir.aprovar ? 'Aprovado e aplicado ao pedido' : 'Solicitação negada');
    setDecidir(null); setResposta('');
    void load();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold">Solicitações de Ajuste de Valor</h1>
        <Badge variant="secondary">{rows.filter(r => r.status === 'pendente').length} pendentes</Badge>
      </div>

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="aprovado">Aprovadas</TabsTrigger>
              <TabsTrigger value="negado">Negadas</TabsTrigger>
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
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Valor atual</TableHead>
                <TableHead className="text-right">Valor solicitado</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const delta = Number(r.valor_solicitado) - Number(r.valor_atual);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</TableCell>
                    <TableCell>{r.vendedor}</TableCell>
                    <TableCell>
                      <Link to={`/pedido/${r.order_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                        {r.numero} <ExternalLink size={12} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{fmt(r.valor_atual)}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">{fmt(r.valor_solicitado)}</div>
                      <div className={`text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta >= 0 ? '+' : ''}{fmt(delta)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px] text-xs">{r.motivo}{r.resposta_admin && <div className="text-muted-foreground italic mt-1">Resposta: {r.resposta_admin}</div>}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'pendente' ? 'secondary' : r.status === 'aprovado' ? 'default' : 'destructive'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pendente' && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="default" onClick={() => { setDecidir({ row: r, aprovar: true }); setResposta(''); }}>
                            <CheckCircle2 size={14} className="mr-1" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setDecidir({ row: r, aprovar: false }); setResposta(''); }}>
                            <XCircle size={14} className="mr-1" /> Negar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!decidir} onOpenChange={(o) => { if (!o) setDecidir(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decidir?.aprovar ? 'Aprovar ajuste' : 'Negar ajuste'}</DialogTitle>
            <DialogDescription>
              {decidir && (
                <>Pedido <b>{decidir.row.numero}</b> de <b>{decidir.row.vendedor}</b>: {fmt(decidir.row.valor_atual)} → <b>{fmt(decidir.row.valor_solicitado)}</b>.
                {decidir.aprovar ? ' O valor será aplicado imediatamente.' : ''}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder={decidir?.aprovar ? 'Observação (opcional)' : 'Motivo da negativa (recomendado)'}
            value={resposta} onChange={(e) => setResposta(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecidir(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={confirmDecisao} disabled={saving} variant={decidir?.aprovar ? 'default' : 'destructive'}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
