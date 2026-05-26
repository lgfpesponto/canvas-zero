import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, FileText, Filter, RefreshCw, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { dbRowToOrder } from '@/lib/order-logic';
import { ensurePriceCache } from '@/lib/priceCache';
import { buildCobrancaPdfDoc, buildCobrancaFileName } from '@/lib/cobrancaPdf';
import { registrarPdfSnapshot } from '@/lib/pdfHistorico';

const TIPO_LABEL: Record<string, string> = {
  cobranca: 'Cobrança',
  expedicao: 'Expedição',
  corte: 'Corte',
  bordados: 'Bordados',
  metais: 'Metais',
  forro: 'Forro',
  forma: 'Forma',
  palmilha: 'Palmilha',
  pesponto: 'Pesponto',
  escalacao: 'Escalação',
  extras_cintos: 'Extras/Cintos',
  comissao_bordado: 'Comissão Bordado',
};

interface Snapshot {
  id: string;
  tipo: string;
  gerado_em: string;
  gerado_por_nome: string | null;
  filtros: Record<string, unknown>;
  order_ids: string[];
  totais: { qtd_pedidos?: number; qtd_produtos?: number; valor_total?: number };
  storage_path: string | null;
  arquivo_kb: number | null;
  nome_arquivo: string | null;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function describeFiltros(s: Snapshot): string {
  const f = s.filtros || {};
  const parts: string[] = [];
  if (typeof f.vendedor === 'string' && f.vendedor !== 'todos') parts.push(`Vend: ${f.vendedor}`);
  if (Array.isArray(f.status) && f.status.length) parts.push(`Status: ${(f.status as string[]).join('/')}`);
  if (Array.isArray(f.progresso) && (f.progresso as unknown[]).length) parts.push(`Progresso: ${(f.progresso as string[]).join('/')}`);
  if (typeof f.tipo_produto === 'string') parts.push(`Tipo: ${f.tipo_produto}`);
  if (typeof f.data_de === 'string' && f.data_de) parts.push(`De: ${f.data_de}`);
  if (typeof f.data_ate === 'string' && f.data_ate) parts.push(`Até: ${f.data_ate}`);
  return parts.join(' • ') || '—';
}

export default function HistoricoPdfTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [diasFilter, setDiasFilter] = useState<string>('30');
  const [openSnap, setOpenSnap] = useState<Snapshot | null>(null);
  const [snapDetalhes, setSnapDetalhes] = useState<any[] | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const dias = parseInt(diasFilter, 10);
      const since = new Date();
      since.setDate(since.getDate() - dias);
      let q = supabase
        .from('pdf_snapshots')
        .select('*')
        .gte('gerado_em', since.toISOString())
        .order('gerado_em', { ascending: false })
        .limit(500);
      if (tipoFilter !== 'todos') q = q.eq('tipo', tipoFilter);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as any);
    } catch (e: any) {
      toast.error('Erro ao carregar histórico: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [tipoFilter, diasFilter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.gerado_por_nome || '').toLowerCase().includes(s) ||
      (r.nome_arquivo || '').toLowerCase().includes(s) ||
      JSON.stringify(r.filtros || {}).toLowerCase().includes(s)
    );
  }, [rows, search]);

  const handleDownload = async (s: Snapshot) => {
    if (!s.storage_path) return;
    try {
      const { data, error } = await supabase.storage
        .from('financeiro')
        .createSignedUrl(s.storage_path, 60);
      if (error || !data?.signedUrl) throw error || new Error('URL inválida');
      window.open(data.signedUrl, '_blank');
    } catch (e: any) {
      toast.error('Erro ao gerar link: ' + (e?.message || e));
    }
  };

  const openDetalhes = async (s: Snapshot) => {
    setOpenSnap(s);
    setSnapDetalhes(null);
    if (!s.order_ids?.length) return;
    setLoadingSnap(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, numero, cliente, vendedor, status, preco, quantidade, desconto')
        .in('id', s.order_ids);
      if (error) throw error;
      setSnapDetalhes(data || []);
    } catch (e: any) {
      toast.error('Erro ao carregar pedidos: ' + (e?.message || e));
    } finally {
      setLoadingSnap(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <FileText className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="text-sm text-foreground">
            Histórico mantido por <strong>90 dias</strong>. Apenas PDFs de <strong>Cobrança</strong> têm o arquivo guardado;
            os demais salvam apenas o resumo (lista de pedidos + totais) para auditoria.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por usuário, arquivo, vendedor..."
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={diasFilter} onValueChange={setDiasFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> atualizar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Filtros</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Gerado por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum PDF no período.</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDateTime(s.gerado_em)}</TableCell>
                  <TableCell>
                    <Badge variant={s.tipo === 'cobranca' ? 'default' : 'outline'} className="text-xs">
                      {TIPO_LABEL[s.tipo] || s.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground" title={describeFiltros(s)}>
                    {describeFiltros(s)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{s.totais?.qtd_pedidos ?? s.order_ids?.length ?? 0}</TableCell>
                  <TableCell className="text-right text-sm">
                    {typeof s.totais?.valor_total === 'number' ? formatCurrency(s.totais.valor_total) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.gerado_por_nome || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openDetalhes(s)} className="h-8 gap-1">
                        <Eye className="h-3.5 w-3.5" /> snapshot
                      </Button>
                      {s.storage_path && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(s)} className="h-8 gap-1">
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!openSnap} onOpenChange={(o) => { if (!o) setOpenSnap(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Snapshot: {openSnap && (TIPO_LABEL[openSnap.tipo] || openSnap.tipo)} —{' '}
              {openSnap && formatDateTime(openSnap.gerado_em)}
            </DialogTitle>
          </DialogHeader>
          {openSnap && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <strong>Filtros:</strong> {describeFiltros(openSnap)}
              </div>
              <div className="text-xs text-muted-foreground">
                <strong>Totais salvos:</strong>{' '}
                {openSnap.totais?.qtd_pedidos ?? '—'} pedidos
                {typeof openSnap.totais?.valor_total === 'number' && ` • ${formatCurrency(openSnap.totais.valor_total)}`}
              </div>
              <div className="max-h-[60vh] overflow-auto rounded border">
                {loadingSnap ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Carregando pedidos...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Status atual</TableHead>
                        <TableHead className="text-right">Valor atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(snapDetalhes || []).map((p: any) => {
                        const valor = Math.max(0, (p.preco || 0) * (p.quantidade || 1) - (p.desconto || 0));
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">{p.numero}</TableCell>
                            <TableCell className="text-sm">{p.cliente || '—'}</TableCell>
                            <TableCell className="text-sm">{p.vendedor || '—'}</TableCell>
                            <TableCell className="text-sm">{p.status}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(valor)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {(!snapDetalhes || snapDetalhes.length === 0) && (
                        <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Sem pedidos.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Os valores acima refletem o estado <strong>atual</strong> dos pedidos. Diferenças em relação aos totais salvos
                indicam alterações feitas após a geração do PDF.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
