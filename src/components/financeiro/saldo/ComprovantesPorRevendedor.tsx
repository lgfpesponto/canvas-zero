import { useMemo, useState } from 'react';
import { Loader2, FileText, CheckCircle2, XCircle, Clock, MinusCircle, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import {
  marcarComprovanteUtilizado,
  type RevendedorComprovante, type RevendedorSaldo,
} from '@/lib/revendedorSaldo';
import { ComprovanteViewer } from '@/components/financeiro/ComprovanteViewer';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';

interface Props {
  /** Vendedor selecionado no filtro do topo. */
  vendedor: string;
  /** Saldo do vendedor selecionado (vindo do pai), pra calcular pré-baixa. */
  saldoVendedor: RevendedorSaldo | null;
  /** Comprovantes já filtrados (período + tipo) vindos do pai. */
  comprovantes: RevendedorComprovante[];
  /** Indica se o pai ainda está carregando os dados. */
  loading?: boolean;
  /** Disparado quando uma baixa manual é feita, pra recarregar saldos no pai. */
  onChanged?: () => void;
}

const StatusBadge = ({ status }: { status: RevendedorComprovante['status'] }) => {
  if (status === 'pendente') return <Badge variant="outline" className="gap-1"><Clock size={12} /> Pendente</Badge>;
  if (status === 'aprovado') return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 size={12} /> Aprovado</Badge>;
  if (status === 'reprovado') return <Badge variant="destructive" className="gap-1"><XCircle size={12} /> Reprovado</Badge>;
  return <Badge variant="secondary" className="gap-1"><Archive size={12} /> Utilizado</Badge>;
};

export const ComprovantesPorRevendedor = ({
  vendedor, saldoVendedor, comprovantes, loading = false, onChanged,
}: Props) => {
  const { toast } = useToast();
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [baixaTarget, setBaixaTarget] = useState<RevendedorComprovante | null>(null);
  const [baixaMotivo, setBaixaMotivo] = useState('');
  const [baixaSaving, setBaixaSaving] = useState(false);

  const handleBaixaManual = async () => {
    if (!baixaTarget) return;
    if (!baixaMotivo.trim()) {
      toast({ title: 'Motivo obrigatório', variant: 'destructive' });
      return;
    }
    setBaixaSaving(true);
    try {
      await marcarComprovanteUtilizado(baixaTarget.id, baixaMotivo.trim());
      toast({
        title: 'Baixa manual feita!',
        description: `R$ ${baixaTarget.valor.toFixed(2)} debitados do saldo de ${baixaTarget.vendedor}.`,
      });
      setBaixaTarget(null);
      setBaixaMotivo('');
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setBaixaSaving(false);
    }
  };

  const totalAprovado = useMemo(
    () => comprovantes.filter(c => c.status === 'aprovado').reduce((s, c) => s + Number(c.valor || 0), 0),
    [comprovantes]
  );
  const totalUtilizado = useMemo(
    () => comprovantes.filter(c => c.status === 'utilizado').reduce((s, c) => s + Number(c.valor || 0), 0),
    [comprovantes]
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comprovantes de {vendedor}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lista todos os comprovantes deste vendedor. Use "Dar baixa" em comprovantes
            aprovados quando o pagamento já foi utilizado fora do sistema (ex.: sistema antigo).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            {saldoVendedor && (
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <div className="text-xs text-muted-foreground">Saldo disponível</div>
                <div className="font-bold text-primary">{formatCurrency(Number(saldoVendedor.saldo_disponivel))}</div>
              </div>
            )}
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">Aprovado (lista)</div>
              <div className="font-bold">{formatCurrency(totalAprovado)}</div>
            </div>
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">Já utilizado (lista)</div>
              <div className="font-bold">{formatCurrency(totalUtilizado)}</div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : comprovantes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Esse vendedor ainda não tem comprovantes.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Data pgto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago para</TableHead>
                    <TableHead>Observação / Motivo</TableHead>
                    <TableHead>Anexo</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprovantes.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-xs">{formatDateBR(c.data_pagamento)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(Number(c.valor))}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-xs max-w-[180px]">
                        <div className="font-medium truncate">
                          {c.pagador_nome || <span className="text-muted-foreground italic">—</span>}
                        </div>
                        {c.pagador_documento && (
                          <div className="text-muted-foreground font-mono text-[10px]">{c.pagador_documento}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                        {(c.status === 'reprovado' || c.status === 'utilizado') && c.motivo_reprovacao ? (
                          <span className={c.status === 'reprovado' ? 'text-destructive' : ''}>
                            {c.motivo_reprovacao}
                          </span>
                        ) : (c.observacao || '—')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setViewerPath(c.comprovante_url)}>
                          <FileText size={14} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === 'aprovado' ? (
                          <Button size="sm" variant="outline" onClick={() => setBaixaTarget(c)}>
                            <MinusCircle size={14} className="mr-1" /> Dar baixa
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ComprovanteViewer
        path={viewerPath}
        open={!!viewerPath}
        onOpenChange={(o) => { if (!o) setViewerPath(null); }}
      />

      <AlertDialog
        open={!!baixaTarget}
        onOpenChange={(o) => { if (!o && !baixaSaving) { setBaixaTarget(null); setBaixaMotivo(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar baixa manual no comprovante</AlertDialogTitle>
            <AlertDialogDescription>
              {baixaTarget && (
                <>
                  Esta ação vai <strong>debitar {formatCurrency(Number(baixaTarget.valor))}</strong> do saldo
                  de <strong>{baixaTarget.vendedor}</strong> e marcar o comprovante como
                  <strong> utilizado</strong>. Use quando o pagamento já foi usado fora do sistema.
                  {saldoVendedor && (
                    <span className="block mt-2 text-xs">
                      Saldo atual: {formatCurrency(Number(saldoVendedor.saldo_disponivel))}
                      {' → '}saldo após baixa:
                      {' '}{formatCurrency(Number(saldoVendedor.saldo_disponivel) - Number(baixaTarget.valor))}
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Motivo da baixa (obrigatório)</Label>
            <Textarea
              placeholder="Ex.: Comprovante já utilizado no sistema antigo para quitação de pedidos."
              value={baixaMotivo}
              onChange={(e) => setBaixaMotivo(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={baixaSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBaixaManual} disabled={baixaSaving}>
              {baixaSaving ? (
                <><Loader2 className="animate-spin mr-1" size={14} /> Processando...</>
              ) : 'Confirmar baixa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
