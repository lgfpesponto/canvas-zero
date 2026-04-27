import { useEffect, useMemo, useState } from 'react';
import { Loader2, Eye, X } from 'lucide-react';
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
  fetchSaldosTodos, fetchComprovantesPendentes, fetchVendedoresUsuarios,
  type RevendedorSaldo,
} from '@/lib/revendedorSaldo';
import { DetalhesRevendedorDrawer } from './DetalhesRevendedorDrawer';
import { ComprovantesRevendedorPendentes } from './ComprovantesRevendedorPendentes';
import { ComprovantesPorRevendedor } from './ComprovantesPorRevendedor';
import { LoadingValue } from '@/components/ui/LoadingValue';

const FinanceiroSaldoRevendedor = () => {
  const { toast } = useToast();
  const [saldos, setSaldos] = useState<RevendedorSaldo[] | null>(null);
  const [pendentesCount, setPendentesCount] = useState<number | null>(null);
  const [vendedoresUsuarios, setVendedoresUsuarios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalheVendedor, setDetalheVendedor] = useState<RevendedorSaldo | null>(null);
  const [filtroVendedor, setFiltroVendedor] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, vs] = await Promise.all([
        fetchSaldosTodos(),
        fetchComprovantesPendentes(),
        fetchVendedoresUsuarios(),
      ]);
      setSaldos(s);
      setPendentesCount(p.length);
      setVendedoresUsuarios(vs);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /** Lista de vendedores no select: usuários cadastrados como vendedor +
   *  qualquer vendedor que já tenha saldo (caso o usuário não exista mais). */
  const vendedoresOptions = useMemo(() => {
    const set = new Set<string>(vendedoresUsuarios);
    (saldos || []).forEach(s => { if (s.vendedor) set.add(s.vendedor); });
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [vendedoresUsuarios, saldos]);

  const saldoFiltrado = useMemo(
    () => (saldos || []).find(s => s.vendedor === filtroVendedor) || null,
    [saldos, filtroVendedor]
  );

  /** Totais dos cards: do filtrado (se houver) ou da soma geral. */
  const totals = useMemo(() => {
    if (filtroVendedor) {
      return {
        recebido: Number(saldoFiltrado?.total_recebido || 0),
        utilizado: Number(saldoFiltrado?.total_utilizado || 0),
        saldoTotal: Number(saldoFiltrado?.saldo_disponivel || 0),
      };
    }
    const list = saldos || [];
    return {
      recebido: list.reduce((s, r) => s + Number(r.total_recebido || 0), 0),
      utilizado: list.reduce((s, r) => s + Number(r.total_utilizado || 0), 0),
      saldoTotal: list.reduce((s, r) => s + Number(r.saldo_disponivel || 0), 0),
    };
  }, [saldos, filtroVendedor, saldoFiltrado]);

  const saldosTabela = useMemo(() => {
    const list = saldos || [];
    return filtroVendedor
      ? list.filter(s => s.vendedor === filtroVendedor)
      : list;
  }, [saldos, filtroVendedor]);

  return (
    <div className="space-y-6">
      {/* Filtro único de vendedor — controla cards, tabela e lista de comprovantes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[260px]">
              <Label>Filtrar por vendedor</Label>
              <Select value={filtroVendedor || '__all__'} onValueChange={(v) => setFiltroVendedor(v === '__all__' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="__all__">Todos os vendedores</SelectItem>
                  {vendedoresOptions.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filtroVendedor && (
              <Button variant="outline" size="sm" onClick={() => setFiltroVendedor('')}>
                <X size={14} className="mr-1" /> Limpar filtro
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {filtroVendedor
                ? `Mostrando dados de ${filtroVendedor}.`
                : 'Selecione um vendedor para ver seus comprovantes e dar baixa manual.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo (atualizam conforme filtro) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total recebido</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              <LoadingValue loading={loading} hasData={saldos !== null} size={20}>
                {formatCurrency(totals.recebido)}
              </LoadingValue>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total utilizado</CardTitle></CardHeader>
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
              {filtroVendedor ? 'Saldo disponível' : 'Saldo disponível total'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              <LoadingValue loading={loading} hasData={saldos !== null} size={20}>
                {formatCurrency(totals.saldoTotal)}
              </LoadingValue>
            </p>
          </CardContent>
        </Card>
        <Card className={(pendentesCount ?? 0) > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Comprovantes pendentes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              <LoadingValue loading={loading} hasData={pendentesCount !== null} size={20}>
                {pendentesCount ?? 0}
              </LoadingValue>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comprovantes pendentes (geral) */}
      <ComprovantesRevendedorPendentes
        onChanged={load}
        title="Comprovantes aguardando aprovação"
        showAdminUpload
      />

      {/* Lista de comprovantes do vendedor filtrado (só aparece quando filtra) */}
      {filtroVendedor && (
        <ComprovantesPorRevendedor
          vendedor={filtroVendedor}
          saldoVendedor={saldoFiltrado}
          onChanged={load}
        />
      )}

      {/* Saldo por vendedor (filtra junto) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filtroVendedor ? `Saldo de ${filtroVendedor}` : 'Saldo por vendedor'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && saldos === null ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : saldosTabela.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {filtroVendedor
                ? 'Esse vendedor ainda não tem movimentos de saldo.'
                : 'Nenhum movimento registrado ainda.'}
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
