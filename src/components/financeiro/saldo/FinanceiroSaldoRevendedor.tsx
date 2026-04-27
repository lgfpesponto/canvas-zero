import { useEffect, useMemo, useState } from 'react';
import { Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import {
  fetchSaldosTodos, fetchComprovantesPendentes,
  type RevendedorSaldo,
} from '@/lib/revendedorSaldo';
import { DetalhesRevendedorDrawer } from './DetalhesRevendedorDrawer';
import { ComprovantesRevendedorPendentes } from './ComprovantesRevendedorPendentes';
import { LoadingValue } from '@/components/ui/LoadingValue';

const FinanceiroSaldoRevendedor = () => {
  const { toast } = useToast();
  const [saldos, setSaldos] = useState<RevendedorSaldo[] | null>(null);
  const [pendentesCount, setPendentesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalheVendedor, setDetalheVendedor] = useState<RevendedorSaldo | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([fetchSaldosTodos(), fetchComprovantesPendentes()]);
      setSaldos(s);
      setPendentesCount(p.length);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const list = saldos || [];
    const recebido = list.reduce((s, r) => s + Number(r.total_recebido || 0), 0);
    const utilizado = list.reduce((s, r) => s + Number(r.total_utilizado || 0), 0);
    const saldoTotal = list.reduce((s, r) => s + Number(r.saldo_disponivel || 0), 0);
    return { recebido, utilizado, saldoTotal };
  }, [saldos]);

  return (
    <div className="space-y-6">
      {/* Resumo */}
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
          <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">Saldo disponível total</CardTitle></CardHeader>
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

      {/* Comprovantes pendentes (componente compartilhado com a aba A Receber) */}
      <ComprovantesRevendedorPendentes
        onChanged={load}
        title="Comprovantes aguardando aprovação"
        showAdminUpload
      />

      {/* Saldo por revendedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saldo por revendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : saldos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum movimento registrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revendedor</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Utilizado</TableHead>
                  <TableHead className="text-right">Saldo disponível</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saldos
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
