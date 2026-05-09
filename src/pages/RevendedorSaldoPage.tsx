import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, CheckCircle2, XCircle, Clock } from 'lucide-react';
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
  fetchComprovantes,
  type RevendedorComprovante,
} from '@/lib/revendedorSaldo';
import { EnviarComprovanteDialog } from '@/components/financeiro/saldo/EnviarComprovanteDialog';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';
import { supabase } from '@/integrations/supabase/client';

const RevendedorSaldoPage = () => {
  const { loading: accessLoading, isAdminMaster, canSeeComprovantesView, vendedorName } = useFinanceiroSaldoAccess();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [comprovantes, setComprovantes] = useState<RevendedorComprovante[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviarOpen, setEnviarOpen] = useState(false);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const reloadTimer = useRef<number | null>(null);

  useEffect(() => {
    if (accessLoading) return;
    if (!isAdminMaster && !canSeeComprovantesView) {
      navigate('/', { replace: true });
    }
  }, [accessLoading, isAdminMaster, canSeeComprovantesView, navigate]);

  const reload = async () => {
    if (!vendedorName) return;
    setLoading(true);
    try {
      const c = await fetchComprovantes(vendedorName);
      setComprovantes(c);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (vendedorName) reload(); }, [vendedorName]);

  // Realtime: atualiza a lista assim que a Juliana aprovar/reprovar
  useEffect(() => {
    if (!vendedorName) return;
    const scheduleReload = () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => { reload(); }, 400);
    };
    const channel = supabase
      .channel(`revendedor_comprovantes_${vendedorName}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'revendedor_comprovantes', filter: `vendedor=eq.${vendedorName}` },
        () => scheduleReload()
      )
      .subscribe();
    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [vendedorName]);

  if (accessLoading) return null;
  if (!isAdminMaster && !canSeeComprovantesView) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Comprovantes</h1>
          <p className="text-sm text-muted-foreground mt-1">{vendedorName}</p>
        </div>
        <Button size="lg" onClick={() => setEnviarOpen(true)}>
          <Upload size={18} /> Enviar comprovante
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meus comprovantes enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : comprovantes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Você ainda não enviou nenhum comprovante. Clique em "Enviar comprovante" acima.
            </p>
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
                    <TableCell className="text-right font-semibold">{formatCurrency(c.valor)}</TableCell>
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
                      {c.comprovante_url ? (
                        <Button size="sm" variant="ghost" onClick={() => setViewerPath(c.comprovante_url)}>
                          <FileText size={14} />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
