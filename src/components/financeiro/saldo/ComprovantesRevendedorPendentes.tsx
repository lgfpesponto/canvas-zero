import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, FileText, CheckCircle2, XCircle, Building2, User, Upload, Archive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  fetchComprovantesPendentes, aprovarComprovante, reprovarComprovante,
  descartarComprovantesHistorico,
  type RevendedorComprovante,
} from '@/lib/revendedorSaldo';
import { ComprovanteViewer } from '@/components/financeiro/ComprovanteViewer';
import { EnviarComprovanteDialog } from './EnviarComprovanteDialog';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';

interface Props {
  /** Quando o admin aprova/reprova, recarrega quem mostra esse componente. */
  onChanged?: () => void;
  /** Esconde o cartão se não tem nenhum pendente (útil pra aba A Receber). */
  hideWhenEmpty?: boolean;
  /** Título customizado do card. */
  title?: string;
  /** Mostra o botão "Enviar comprovante de revendedor" (admin master). */
  showAdminUpload?: boolean;
}

export const ComprovantesRevendedorPendentes = ({
  onChanged, hideWhenEmpty, title = 'Comprovantes a entrar (revendedores)', showAdminUpload,
}: Props) => {
  const { toast } = useToast();
  const [pendentes, setPendentes] = useState<RevendedorComprovante[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [reprovarTarget, setReprovarTarget] = useState<RevendedorComprovante | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviarOpen, setEnviarOpen] = useState(false);
  const reloadTimer = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const p = await fetchComprovantesPendentes();
      setPendentes(p);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Realtime: atualiza a lista assim que qualquer revendedor envia/edita um comprovante
  useEffect(() => {
    const scheduleReload = () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => { load(); }, 400);
    };
    const channel = supabase
      .channel('revendedor_comprovantes_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'revendedor_comprovantes' },
        () => scheduleReload()
      )
      .subscribe();
    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);


  const totalPendente = useMemo(
    () => pendentes.reduce((s, c) => s + Number(c.valor || 0), 0),
    [pendentes]
  );

  const handleAprovar = async (c: RevendedorComprovante) => {
    setActionId(c.id);
    try {
      const result: any = await aprovarComprovante(c.id);
      const baixadas = result?.baixas_realizadas || 0;
      const tipo = result?.tipo_a_receber === 'empresa' ? 'Empresa' : 'Fornecedor';
      toast({
        title: 'Comprovante aprovado!',
        description: `Lançado em A Receber (${tipo}). ${baixadas > 0 ? `${baixadas} pedido(s) quitado(s).` : 'Saldo creditado.'}`,
      });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Erro ao aprovar', description: e.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleReprovar = async () => {
    if (!reprovarTarget) return;
    if (!motivo.trim()) { toast({ title: 'Motivo obrigatório', variant: 'destructive' }); return; }
    setActionId(reprovarTarget.id);
    try {
      await reprovarComprovante(reprovarTarget.id, motivo.trim());
      toast({ title: 'Comprovante reprovado.' });
      setReprovarTarget(null);
      setMotivo('');
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  if (hideWhenEmpty && !loading && pendentes.length === 0 && !showAdminUpload) return null;

  return (
    <>
      <Card id="comprovantes-revendedor" className={pendentes.length > 0 ? 'border-destructive border-2' : ''}>
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-2">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {pendentes.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {pendentes.length} aguardando · Total {formatCurrency(totalPendente)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showAdminUpload && (
              <Button size="sm" variant="outline" onClick={() => setEnviarOpen(true)}>
                <Upload size={14} className="mr-1" /> Enviar comprovante de revendedor
              </Button>
            )}
            {pendentes.length > 0 && (
              <Badge variant="destructive" className="text-base px-3 py-1">{pendentes.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum comprovante de revendedor aguardando aprovação.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Revendedor</TableHead>
                    <TableHead>Data pgto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Pago para</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Obs.</TableHead>
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
                      <TableCell className="text-xs max-w-[180px]">
                        <div className="font-medium truncate">
                          {c.pagador_nome || <span className="text-muted-foreground italic">Não identificado</span>}
                        </div>
                        {c.pagador_documento && (
                          <div className="text-muted-foreground font-mono text-[10px]">{c.pagador_documento}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.tipo_detectado === 'empresa' ? (
                          <Badge variant="default" className="gap-1"><Building2 size={10} /> Empresa</Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1"><User size={10} /> Fornecedor</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
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
                            {actionId === c.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <><CheckCircle2 size={14} className="mr-1" /> Confirmar</>
                            )}
                          </Button>
                          <Button
                            size="sm" variant="destructive"
                            onClick={() => setReprovarTarget(c)}
                            disabled={actionId === c.id}
                          >
                            <XCircle size={14} />
                          </Button>
                        </div>
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

      <AlertDialog open={!!reprovarTarget} onOpenChange={(o) => { if (!o) { setReprovarTarget(null); setMotivo(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar comprovante</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da reprovação. Ele será exibido para o revendedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo (obrigatório)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
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

      {showAdminUpload && (
        <EnviarComprovanteDialog
          open={enviarOpen}
          onOpenChange={setEnviarOpen}
          onSaved={() => { load(); onChanged?.(); }}
        />
      )}
    </>
  );
};
