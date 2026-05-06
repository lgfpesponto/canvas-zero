import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Download, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfirmPrint } from '@/components/common/ConfirmPrintDialog';
import { ReportConfirmSummary, fmtPeriodo } from '@/components/common/ReportConfirmSummary';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Row = {
  id: string;
  tipo: string;
  data: string;
  hora: string;
  ts: string;
  usuario: string;
  order_id: string | null;
  numero: string | null;
  vendedor: string | null;
  cliente: string | null;
  status_atual: string | null;
  descricao: string;
  justificativa: string;
  afetou_valor: boolean;
  detalhes: any;
};

const TIPOS: { value: string; label: string }[] = [
  { value: 'alteracao_pedido', label: 'Alteração em pedido' },
  { value: 'mudanca_status', label: 'Mudança de status' },
  { value: 'saldo_entrada_comprovante', label: 'Saldo: entrada comprovante' },
  { value: 'saldo_baixa_pedido', label: 'Saldo: baixa em pedido' },
  { value: 'saldo_estorno', label: 'Saldo: estorno' },
  { value: 'saldo_ajuste_admin', label: 'Saldo: ajuste admin' },
  { value: 'pedido_excluido', label: 'Pedido excluído' },
  { value: 'aviso_sistema', label: 'Aviso de sistema' },
];

const TIPO_LABEL: Record<string, string> = TIPOS.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {},
);

const TIPO_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  alteracao_pedido: 'default',
  mudanca_status: 'secondary',
  saldo_entrada_comprovante: 'outline',
  saldo_baixa_pedido: 'outline',
  saldo_estorno: 'destructive',
  saldo_ajuste_admin: 'outline',
  pedido_excluido: 'destructive',
  aviso_sistema: 'secondary',
};

const PAGE_SIZE = 50;

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function AuditoriaTab() {
  const { toast } = useToast();
  const [de, setDe] = useState(daysAgoStr(7));
  const [ate, setAte] = useState(todayStr());
  const [usuario, setUsuario] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { askPrint, dialog: confirmPrintDialog } = useConfirmPrint();

  const filtros = useMemo(() => ({
    _de: de || null,
    _ate: ate || null,
    _usuario: usuario.trim() || null,
    _vendedor: vendedor.trim() || null,
    _numero: numero.trim() || null,
    _tipos: tipo === 'todos' ? null : [tipo],
    _busca: busca.trim() || null,
  }), [de, ate, usuario, vendedor, numero, tipo, busca]);

  async function load() {
    setLoading(true);
    try {
      const [{ data, error }, { data: cnt, error: e2 }] = await Promise.all([
        supabase.rpc('get_auditoria_alteracoes', {
          ...filtros,
          _limit: PAGE_SIZE,
          _offset: page * PAGE_SIZE,
        }),
        supabase.rpc('get_auditoria_alteracoes_count', filtros),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      setRows((data as Row[]) || []);
      setTotal(Number(cnt) || 0);
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar auditoria',
        description: err.message || String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  function aplicarFiltros() {
    setPage(0);
    load();
  }

  async function loadAllForExport(): Promise<Row[]> {
    const { data, error } = await supabase.rpc('get_auditoria_alteracoes', {
      ...filtros,
      _limit: 5000,
      _offset: 0,
    });
    if (error) throw error;
    return (data as Row[]) || [];
  }

  async function exportCSV() {
    try {
      const all = await loadAllForExport();
      const header = ['Data', 'Hora', 'Tipo', 'Usuário', 'Pedido', 'Vendedor', 'Cliente', 'Status', 'Descrição', 'Justificativa'];
      const lines = [header.join(';')];
      for (const r of all) {
        const cols = [
          r.data, r.hora, TIPO_LABEL[r.tipo] || r.tipo, r.usuario,
          r.numero || '', r.vendedor || '', r.cliente || '', r.status_atual || '',
          (r.descricao || '').replace(/[\r\n;]+/g, ' '),
          (r.justificativa || '').replace(/[\r\n;]+/g, ' '),
        ];
        lines.push(cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'));
      }
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_${de}_a_${ate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: 'Erro ao exportar CSV', description: err.message, variant: 'destructive' });
    }
  }

  async function exportPDF() {
    try {
      const all = await loadAllForExport();
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14);
      doc.text('Auditoria de Alterações — 7Estrivos', 14, 14);
      doc.setFontSize(9);
      doc.text(`Período: ${de} a ${ate}    Total: ${all.length} eventos`, 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [['Data/Hora', 'Tipo', 'Usuário', 'Pedido', 'Vendedor', 'Descrição', 'Justificativa']],
        body: all.map(r => [
          `${r.data} ${r.hora}`,
          TIPO_LABEL[r.tipo] || r.tipo,
          r.usuario,
          r.numero || '—',
          r.vendedor || '—',
          r.descricao || '',
          r.justificativa || '',
        ]),
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 32 },
          2: { cellWidth: 32 },
          3: { cellWidth: 18 },
          4: { cellWidth: 32 },
          5: { cellWidth: 80 },
          6: { cellWidth: 60 },
        },
      });
      doc.save(`auditoria_${de}_a_${ate}.pdf`);
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={de} onChange={e => setDe(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={ate} onChange={e => setAte(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo de evento</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Usuário que alterou</label>
            <Input placeholder="ex: Fernanda" value={usuario} onChange={e => setUsuario(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Vendedor do pedido</label>
            <Input placeholder="ex: Rafael Silva" value={vendedor} onChange={e => setVendedor(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Número do pedido</label>
            <Input placeholder="ex: 23468" value={numero} onChange={e => setNumero(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Buscar em descrição/justificativa</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="ex: desconto, preço, cancelado..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end gap-2 md:col-span-4">
            <Button onClick={aplicarFiltros} className="gap-1.5">
              <Search className="h-4 w-4" /> Aplicar filtros
            </Button>
            <Button variant="outline" onClick={() => load()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={exportCSV} className="gap-1.5">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => askPrint({
              title: 'Exportar Auditoria em PDF?',
              description: (
                <ReportConfirmSummary
                  intro="PDF dos eventos de auditoria conforme os filtros aplicados."
                  destaque={{ label: 'Eventos em tela', value: total }}
                  linhas={[
                    { label: 'Período', value: fmtPeriodo(de, ate) },
                    { label: 'Tipo', value: tipo === 'todos' ? 'Todos' : tipo },
                    { label: 'Número do pedido', value: numero || '—' },
                    { label: 'Usuário', value: usuario || '—' },
                    { label: 'Vendedor', value: vendedor || '—' },
                    { label: 'Busca', value: busca || '—' },
                  ]}
                />
              ),
              confirmLabel: 'Gerar PDF',
              run: () => { void exportPDF(); },
            })} className="gap-1.5">
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Data/Hora</TableHead>
                <TableHead className="w-44">Tipo</TableHead>
                <TableHead className="w-40">Usuário</TableHead>
                <TableHead className="w-24">Pedido</TableHead>
                <TableHead className="w-40">Vendedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Justificativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum evento encontrado para os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{r.data}<br />{r.hora}</TableCell>
                    <TableCell>
                      <Badge variant={TIPO_VARIANT[r.tipo] || 'outline'} className="text-[10px]">
                        {TIPO_LABEL[r.tipo] || r.tipo}
                      </Badge>
                      {r.afetou_valor && (
                        <Badge variant="outline" className="ml-1 text-[10px] border-amber-500/50 text-amber-700">
                          R$
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.usuario}</TableCell>
                    <TableCell className="text-sm font-mono">{r.numero || '—'}</TableCell>
                    <TableCell className="text-sm">{r.vendedor || '—'}</TableCell>
                    <TableCell className="text-sm">{r.descricao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.justificativa}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} eventos · página {page + 1} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>
      {confirmPrintDialog}
    </div>
  );
}
