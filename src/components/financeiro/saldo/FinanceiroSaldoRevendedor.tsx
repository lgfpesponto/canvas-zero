import { useEffect, useMemo, useState } from 'react';
import { Loader2, Eye, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import {
  fetchSaldosTodos,
  fetchComprovantesTodos, fetchMovimentosTodos,
  type RevendedorSaldo, type RevendedorComprovante, type RevendedorMovimento,
  type ComprovanteStatus,
} from '@/lib/revendedorSaldo';
import { fetchVendedoresList } from '@/components/financeiro/financeiroHelpers';
import { DetalhesRevendedorDrawer } from './DetalhesRevendedorDrawer';
import { ComprovantesRevendedorPendentes } from './ComprovantesRevendedorPendentes';
import { ComprovantesPorRevendedor } from './ComprovantesPorRevendedor';
import { LoadingValue } from '@/components/ui/LoadingValue';
import { PedidosAbatidosCard } from './PedidosAbatidosCard';

type PeriodoOption = 'mes' | '30d' | 'todos';
type TipoOption = 'todos' | ComprovanteStatus;

const FinanceiroSaldoRevendedor = () => {
  const { toast } = useToast();
  const [saldos, setSaldos] = useState<RevendedorSaldo[] | null>(null);
  const [comprovantes, setComprovantes] = useState<RevendedorComprovante[]>([]);
  const [movimentos, setMovimentos] = useState<RevendedorMovimento[]>([]);
  const [vendedoresLista, setVendedoresLista] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalheVendedor, setDetalheVendedor] = useState<RevendedorSaldo | null>(null);

  // Filtros padronizados
  const [filterPeriodo, setFilterPeriodo] = useState<PeriodoOption>('mes');
  const [filterVendedor, setFilterVendedor] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<TipoOption>('todos');

  const load = async () => {
    setLoading(true);
    try {
      const [s, c, m, vs] = await Promise.all([
        fetchSaldosTodos(),
        fetchComprovantesTodos(),
        fetchMovimentosTodos(),
        fetchVendedoresList(),
      ]);
      setSaldos(s);
      setComprovantes(c);
      setMovimentos(m);
      setVendedoresLista(vs);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /** Início do intervalo do período (null = sem corte). */
  const periodoStart = useMemo<Date | null>(() => {
    const now = new Date();
    if (filterPeriodo === 'mes') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (filterPeriodo === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  }, [filterPeriodo]);

  const dentroDoPeriodo = (iso: string) => {
    if (!periodoStart) return true;
    return new Date(iso) >= periodoStart;
  };

  /** Vendedores no select: lista vinda de orders + qualquer um com saldo histórico. */
  const vendedoresOptions = useMemo(() => {
    const set = new Set<string>(vendedoresLista);
    (saldos || []).forEach(s => { if (s.vendedor) set.add(s.vendedor); });
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [vendedoresLista, saldos]);

  /** Comprovantes que passam pelos filtros (período + vendedor + tipo). */
  const comprovantesFiltrados = useMemo(() => {
    return comprovantes.filter(c => {
      if (!dentroDoPeriodo(c.created_at)) return false;
      if (filterVendedor !== 'todos' && c.vendedor !== filterVendedor) return false;
      if (filterTipo !== 'todos' && c.status !== filterTipo) return false;
      return true;
    });
  }, [comprovantes, periodoStart, filterVendedor, filterTipo]);

  /** Movimentos que passam pelos filtros de período + vendedor (Tipo só afeta comprovantes). */
  const movimentosFiltrados = useMemo(() => {
    return movimentos.filter(m => {
      if (!dentroDoPeriodo(m.created_at)) return false;
      if (filterVendedor !== 'todos' && m.vendedor !== filterVendedor) return false;
      return true;
    });
  }, [movimentos, periodoStart, filterVendedor]);

  /** Cards: Recebido / Utilizado vêm dos movimentos do período;
   *  Saldo disponível é sempre o snapshot atual (cumulativo). */
  const totals = useMemo(() => {
    const recebido = movimentosFiltrados
      .filter(m => m.tipo === 'entrada_comprovante')
      .reduce((s, m) => s + Number(m.valor || 0), 0);
    const utilizado = movimentosFiltrados
      .filter(m => m.tipo === 'baixa_pedido')
      .reduce((s, m) => s + Number(m.valor || 0), 0);
    const saldoSnapshot = (saldos || [])
      .filter(s => filterVendedor === 'todos' || s.vendedor === filterVendedor)
      .reduce((acc, s) => acc + Number(s.saldo_disponivel || 0), 0);
    const pendentes = comprovantesFiltrados.filter(c => c.status === 'pendente').length;
    return { recebido, utilizado, saldoSnapshot, pendentes };
  }, [movimentosFiltrados, comprovantesFiltrados, saldos, filterVendedor]);

  const saldoFiltrado = useMemo(
    () => (saldos || []).find(s => s.vendedor === filterVendedor) || null,
    [saldos, filterVendedor]
  );

  /** Tabela "Saldo por vendedor" — só inclui quem tem movimento no período. */
  const saldosTabela = useMemo(() => {
    const list = saldos || [];
    const filtrados = filterVendedor === 'todos'
      ? list
      : list.filter(s => s.vendedor === filterVendedor);
    if (!periodoStart) return filtrados;
    const vendedoresComMovimentoNoPeriodo = new Set(movimentosFiltrados.map(m => m.vendedor));
    return filtrados.filter(s => vendedoresComMovimentoNoPeriodo.has(s.vendedor));
  }, [saldos, filterVendedor, movimentosFiltrados, periodoStart]);

  const periodoLabel = filterPeriodo === 'mes'
    ? 'mês atual'
    : filterPeriodo === '30d' ? 'últimos 30 dias' : 'todos os períodos';

  return (
    <div className="space-y-6">
      {/* Toolbar de filtros (padrão A Receber) */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2"><Filter size={16} className="text-muted-foreground" /></div>
        <div>
          <Label className="text-xs">Período</Label>
          <Select value={filterPeriodo} onValueChange={(v: any) => setFilterPeriodo(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês atual</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Vendedor</Label>
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="todos">Todos</SelectItem>
              {vendedoresOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={filterTipo} onValueChange={(v: any) => setFilterTipo(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
              <SelectItem value="utilizado">Utilizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de resumo (atualizam conforme filtros) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recebido ({periodoLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              <LoadingValue loading={loading} hasData={saldos !== null} size={20}>
                {formatCurrency(totals.recebido)}
              </LoadingValue>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Utilizado ({periodoLabel})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              <LoadingValue loading={loading} hasData={saldos !== null} size={20}>
                {formatCurrency(totals.utilizado)}
              </LoadingValue>
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">
              {filterVendedor === 'todos' ? 'Saldo disponível total' : 'Saldo disponível'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              <LoadingValue loading={loading} hasData={saldos !== null} size={20}>
                {formatCurrency(totals.saldoSnapshot)}
              </LoadingValue>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">saldo atual (cumulativo)</p>
          </CardContent>
        </Card>
        <Card className={totals.pendentes > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Comprovantes pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              <LoadingValue loading={loading} hasData={saldos !== null} size={20}>
                {totals.pendentes}
              </LoadingValue>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comprovantes pendentes (geral, não filtrado) */}
      <ComprovantesRevendedorPendentes
        onChanged={load}
        title="Comprovantes aguardando aprovação"
        showAdminUpload
      />

      {/* Lista de comprovantes (só com vendedor específico) */}
      {filterVendedor !== 'todos' && (
        <ComprovantesPorRevendedor
          vendedor={filterVendedor}
          saldoVendedor={saldoFiltrado}
          comprovantes={comprovantesFiltrados}
          loading={loading}
          onChanged={load}
        />
      )}

      {/* Saldo por vendedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filterVendedor !== 'todos' ? `Saldo de ${filterVendedor}` : 'Saldo por vendedor'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && saldos === null ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : saldosTabela.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum movimento no período selecionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Utilizado</TableHead>
                  <TableHead className="text-right">Saldo disponível</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saldosTabela
                  .slice()
                  .sort((a, b) => Number(b.saldo_disponivel) - Number(a.saldo_disponivel))
                  .map(s => (
                    <TableRow key={s.vendedor}>
                      <TableCell className="font-medium">{s.vendedor}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(s.total_recebido))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(s.total_utilizado))}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(Number(s.saldo_disponivel))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setDetalheVendedor(s)}>
                          <Eye size={14} /> Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DetalhesRevendedorDrawer
        open={!!detalheVendedor}
        onOpenChange={(o) => { if (!o) setDetalheVendedor(null); }}
        saldo={detalheVendedor}
        onChanged={load}
      />
    </div>
  );
};

export default FinanceiroSaldoRevendedor;
