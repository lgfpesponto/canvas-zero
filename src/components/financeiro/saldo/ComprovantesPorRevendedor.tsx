import { useEffect, useMemo, useState } from 'react';
import { Loader2, FileText, CheckCircle2, XCircle, Clock, MinusCircle, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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
  fetchComprovantes, marcarComprovanteUtilizado,
  type RevendedorComprovante, type RevendedorSaldo,
} from '@/lib/revendedorSaldo';
import { ComprovanteViewer } from '@/components/financeiro/ComprovanteViewer';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';

interface Props {
  /** Lista de revendedores disponíveis (vinda dos saldos do admin). */
  saldos: RevendedorSaldo[] | null;
  /** Disparado quando uma baixa manual é feita, pra recarregar saldos no pai. */
  onChanged?: () => void;
}

const StatusBadge = ({ status }: { status: RevendedorComprovante['status'] }) => {
  if (status === 'pendente') return <Badge variant="outline" className="gap-1"><Clock size={12} /> Pendente</Badge>;
  if (status === 'aprovado') return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 size={12} /> Aprovado</Badge>;
  if (status === 'reprovado') return <Badge variant="destructive" className="gap-1"><XCircle size={12} /> Reprovado</Badge>;
  return <Badge variant="secondary" className="gap-1"><Archive size={12} /> Utilizado</Badge>;
};

export const ComprovantesPorRevendedor = ({ saldos, onChanged }: Props) => {
  const { toast } = useToast();
  const [vendedor, setVendedor] = useState<string>('');
  const [comprovantes, setComprovantes] = useState<RevendedorComprovante[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [baixaTarget, setBaixaTarget] = useState<RevendedorComprovante | null>(null);
  const [baixaMotivo, setBaixaMotivo] = useState('');
  const [baixaSaving, setBaixaSaving] = useState(false);

  const vendedoresOptions = useMemo(() => {
    return (saldos || [])
      .map(s => s.vendedor)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [saldos]);

  const saldoSelecionado = useMemo(
    () => (saldos || []).find(s => s.vendedor === vendedor) || null,
    [saldos, vendedor]
  );

  const loadComprovantes = async (v: string) => {
    if (!v) { setComprovantes([]); return; }
    setLoading(true);
    try {
      const list = await fetchComprovantes(v);
      setComprovantes(list);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar comprovantes', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComprovantes(vendedor); }, [vendedor]);

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
      await loadComprovantes(vendedor);
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
          <CardTitle className="text-lg">Comprovantes por vendedor</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filtre por vendedor para ver todos os comprovantes e dar baixa manual em comprovantes aprovados
            (use quando o pagamento já foi usado fora do sistema, ex.: sistema antigo).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[260px]">
              <Label>Vendedor</Label>
              <Select value={vendedor} onValueChange={setVendedor}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {vendedoresOptions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum vendedor disponível</div>
                  ) : vendedoresOptions.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {saldoSelecionado && (
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Saldo disponível</div>
                  <div className="font-bold text-primary">{formatCurrency(Number(saldoSelecionado.saldo_disponivel))}</div>
                </div>
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Aprovado (lista)</div>
                  <div className="font-bold">{formatCurrency(totalAprovado)}</div>
                </div>
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Já utilizado (lista)</div>
                  <div className="font-bold">{formatCurrency(totalUtilizado)}</div>
                </div>
              </div>
            )}
          </div>

          {!vendedor ? (
            <p className="text-sm text-muted-foreground py-4">Escolha um vendedor para ver os comprovantes.</p>
          ) : loading ? (
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
                  {saldoSelecionado && (
                    <span className="block mt-2 text-xs">
                      Saldo atual: {formatCurrency(Number(saldoSelecionado.saldo_disponivel))}
                      {' → '}saldo após baixa:
                      {' '}{formatCurrency(Number(saldoSelecionado.saldo_disponivel) - Number(baixaTarget.valor))}
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
