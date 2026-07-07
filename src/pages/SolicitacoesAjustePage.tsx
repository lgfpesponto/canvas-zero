import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, Search, ExternalLink } from 'lucide-react';
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
  desconto_solicitado: number | null;
  motivo: string;
  status: 'pendente' | 'aprovado' | 'negado' | 'visto';
  resposta_admin: string | null;
  decidido_em: string | null;
  created_at: string;
};

const fmt = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const descontoDe = (r: Row) => Number(r.desconto_solicitado ?? r.valor_solicitado ?? 0);

export default function SolicitacoesAjustePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pendente' | 'visto' | 'todos'>('pendente');
  const [busca, setBusca] = useState('');
  const [okId, setOkId] = useState<string | null>(null);

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
    if (filter === 'visto' && !['visto', 'aprovado', 'negado'].includes(r.status)) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return r.numero.toLowerCase().includes(q) || r.vendedor.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOk = async (id: string) => {
    setOkId(id);
    const { error } = await supabase.rpc('marcar_ajuste_visto' as any, { _id: id });
    setOkId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Solicitação marcada como vista — vendedor notificado');
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
              <TabsTrigger value="visto">Vistas</TabsTrigger>
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
                <TableHead className="text-right">Desconto solicitado</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const isPendente = r.status === 'pendente';
                const isVisto = !isPendente;
                return (
                  <TableRow key={r.id} className={isVisto ? 'bg-emerald-50/40' : ''}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</TableCell>
                    <TableCell>{r.vendedor}</TableCell>
                    <TableCell>
                      <Link to={`/pedido/${r.order_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                        {r.numero} <ExternalLink size={12} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(descontoDe(r))}</TableCell>
                    <TableCell className="max-w-[320px] text-xs">{r.motivo}</TableCell>
                    <TableCell>
                      <Badge variant={isPendente ? 'secondary' : 'default'} className={isVisto ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
                        {isPendente ? 'pendente' : 'visto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isPendente && (
                        <Button size="sm" onClick={() => handleOk(r.id)} disabled={okId === r.id}>
                          {okId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><CheckCircle2 size={14} className="mr-1" /> OK</>)}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
