import { useEffect, useMemo, useState } from 'react';
import { Loader2, FileText, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import {
  fetchSaldosTodos, fetchComprovantesPendentes, aprovarComprovante, reprovarComprovante,
  type RevendedorSaldo, type RevendedorComprovante,
} from '@/lib/revendedorSaldo';
import { ComprovanteViewer } from '@/components/financeiro/ComprovanteViewer';
import { DetalhesRevendedorDrawer } from './DetalhesRevendedorDrawer';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';

const FinanceiroSaldoRevendedor = () => {
  const { toast } = useToast();
  const [saldos, setSaldos] = useState<RevendedorSaldo[]>([]);
  const [pendentes, setPendentes] = useState<RevendedorComprovante[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [reprovarTarget, setReprovarTarget] = useState<RevendedorComprovante | null>(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [detalheVendedor, setDetalheVendedor] = useState<RevendedorSaldo | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([fetchSaldosTodos(), fetchComprovantesPendentes()]);
      setSaldos(s);
      setPendentes(p);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const recebido = saldos.reduce((s, r) => s + Number(r.total_recebido || 0), 0);
    const utilizado = saldos.reduce((s, r) => s + Number(r.total_utilizado || 0), 0);
    const saldoTotal = saldos.reduce((s, r) => s + Number(r.saldo_disponivel || 0), 0);
    return { recebido, utilizado, saldoTotal };
  }, [saldos]);

  const handleAprovar = async (c: RevendedorComprovante) => {
    setActionId(c.id);
    try {
      const result: any = await aprovarComprovante(c.id);
      const baixadas = result?.baixas_realizadas || 0;
      toast({
        title: 'Comprovante aprovado!',
        description: baixadas > 0 ? `${baixadas} pedido(s) quitado(s) automaticamente.` : 'Saldo creditado.',
      });
      load();
    } catch (e: any) {
      toast({ title: 'Erro ao aprovar', description: e.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleReprovar = async () => {
    if (!reprovarTarget) return;
    if (!motivoReprovacao.trim()) { toast({ title: 'Motivo obrigatório', variant: 'destructive' }); return; }
    setActionId(reprovarTarget.id);
    try {
      await reprovarComprovante(reprovarTarget.id, motivoReprovacao.trim());
      toast({ title: 'Comprovante reprovado.' });
      setReprovarTarget(null);
      setMotivoReprovacao('');
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total recebido</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totals.recebido)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total utilizado</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.utilizado)}</p></CardContent>
        </Card>
        <Card className="border-primary border-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">Saldo disponível total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totals.saldoTotal)}</p></CardContent>
        </Card>
        <Card className={pendentes.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Comprovantes pendentes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{pendentes.length}</p></CardContent>
        </Card>
      </div>

      {/* Comprovantes pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comprovantes aguardando aprovação</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum comprovante pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Revendedor</TableHead>
                  <TableHead>Data pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead>Anexo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{c.vendedor}</TableCell>
                    <TableCell className="text-xs">{formatDateBR(c.data_pagamento)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(Number(c.valor))}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {c.observacao || '—'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setViewerPath(c.comprovante_url)}>
                        <FileText size={14} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm" variant="default"
                          onClick={() => handleAprovar(c)}
                          disabled={actionId === c.id}
                        >
                          {actionId === c.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                          Aprovar
                        </Button>
                        <Button
                          size="sm" variant="destructive"
                          onClick={() => setReprovarTarget(c)}
                          disabled={actionId === c.id}
                        >
                          <XCircle size={14} /> Reprovar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      <ComprovanteViewer
        path={viewerPath}
        open={!!viewerPath}
        onOpenChange={(o) => { if (!o) setViewerPath(null); }}
      />

      <DetalhesRevendedorDrawer
        open={!!detalheVendedor}
        onOpenChange={(o) => { if (!o) setDetalheVendedor(null); }}
        saldo={detalheVendedor}
        onChanged={load}
      />

      <AlertDialog open={!!reprovarTarget} onOpenChange={(o) => { if (!o) { setReprovarTarget(null); setMotivoReprovacao(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar comprovante</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da reprovação. Ele será exibido para o revendedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo (obrigatório)"
            value={motivoReprovacao}
            onChange={(e) => setMotivoReprovacao(e.target.value)}
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReprovar} disabled={!!actionId}>
              {actionId ? <Loader2 className="animate-spin" /> : 'Reprovar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinanceiroSaldoRevendedor;
