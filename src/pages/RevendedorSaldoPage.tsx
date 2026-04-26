import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, FileText, CheckCircle2, XCircle, Clock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import { useFinanceiroSaldoAccess } from '@/hooks/useFinanceiroSaldoAccess';
import {
  fetchSaldoVendedor, fetchComprovantes, fetchPedidosCobrados, fetchBaixasVendedor,
  type RevendedorSaldo, type RevendedorComprovante,
} from '@/lib/revendedorSaldo';
import { ComprovanteViewer } from '@/components/financeiro/ComprovanteViewer';
import { EnviarComprovanteDialog } from '@/components/financeiro/saldo/EnviarComprovanteDialog';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';
import { supabase } from '@/integrations/supabase/client';

const RevendedorSaldoPage = () => {
  const { loading: accessLoading, isAdminMaster, canSeeRevendedorView, vendedorName } = useFinanceiroSaldoAccess();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [saldo, setSaldo] = useState<RevendedorSaldo | null>(null);
  const [comprovantes, setComprovantes] = useState<RevendedorComprovante[]>([]);
  const [totalPendente, setTotalPendente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enviarOpen, setEnviarOpen] = useState(false);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const reloadTimer = useRef<number | null>(null);

  useEffect(() => {
    if (accessLoading) return;
    if (!isAdminMaster && !canSeeRevendedorView) {
      navigate('/', { replace: true });
    }
  }, [accessLoading, isAdminMaster, canSeeRevendedorView, navigate]);

  const reload = async () => {
    if (!vendedorName) return;
    setLoading(true);
    try {
      const [s, c, p, b] = await Promise.all([
        fetchSaldoVendedor(vendedorName),
        fetchComprovantes(vendedorName),
        fetchPedidosCobrados(vendedorName),
        fetchBaixasVendedor(vendedorName),
      ]);
      setSaldo(s);
      setComprovantes(c);
      const baixasSet = new Set(b.map(x => x.order_id));
      const pendente = p
        .filter(x => !baixasSet.has(x.id))
        .reduce((sum, x) => sum + (x.preco || 0) * (x.quantidade || 1), 0);
      const saldoDisp = Number(s?.saldo_disponivel || 0);
      setTotalPendente(Math.max(0, pendente - saldoDisp));
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (vendedorName) reload(); }, [vendedorName]);

  if (accessLoading) return null;
  if (!isAdminMaster && !canSeeRevendedorView) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Meu Saldo</h1>
          <p className="text-sm text-muted-foreground mt-1">{vendedorName}</p>
        </div>
        <Button size="lg" onClick={() => setEnviarOpen(true)}>
          <Upload size={18} /> Enviar comprovante
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total enviado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(saldo?.total_recebido || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Já utilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(saldo?.total_utilizado || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-1">
              <Wallet size={14} /> Saldo disponível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(saldo?.saldo_disponivel || 0)}</p>
          </CardContent>
        </Card>
        <Card className={totalPendente > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">A pagar (pedidos cobrados)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPendente)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Meus comprovantes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Meus comprovantes enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : comprovantes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Você ainda não enviou nenhum comprovante.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observação / Motivo</TableHead>
                  <TableHead className="text-right">Anexo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comprovantes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDateBR(c.data_pagamento)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.valor)}</TableCell>
                    <TableCell>
                      {c.status === 'pendente' && <Badge variant="outline" className="gap-1"><Clock size={12} /> Pendente</Badge>}
                      {c.status === 'aprovado' && <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 size={12} /> Aprovado</Badge>}
                      {c.status === 'reprovado' && <Badge variant="destructive" className="gap-1"><XCircle size={12} /> Reprovado</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                      {c.status === 'reprovado' && c.motivo_reprovacao ? (
                        <span className="text-destructive">Motivo: {c.motivo_reprovacao}</span>
                      ) : (c.observacao || '—')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setViewerPath(c.comprovante_url)}>
                        <FileText size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EnviarComprovanteDialog
        open={enviarOpen}
        onOpenChange={setEnviarOpen}
        vendedor={vendedorName}
        onSaved={reload}
      />
      <ComprovanteViewer
        path={viewerPath}
        open={!!viewerPath}
        onOpenChange={(o) => { if (!o) setViewerPath(null); }}
      />
    </div>
  );
};

export default RevendedorSaldoPage;
