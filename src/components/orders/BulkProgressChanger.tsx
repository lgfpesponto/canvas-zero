/**
 * Barra de mudança de progresso em massa com as MESMAS regras da lista
 * "Meus Pedidos": etapas válidas por tipo de produto/fluxo, justificativa
 * obrigatória (retrocesso / pausa / cancelamento), botão ERRO MONTAGEM e
 * aviso de pedidos bloqueados.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, PRODUCTION_STATUSES, EXTRAS_STATUSES, BELT_STATUSES } from '@/contexts/AuthContext';
import { requiresJustification, type JustificationKind } from '@/lib/statusRegression';
import { isTransitionAllowed } from '@/lib/statusTransitions';
import { BulkBlockedDialog, type BlockedItem } from '@/components/BulkBlockedDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SelOrder {
  id: string;
  numero: string;
  status: string;
  vendedor?: string;
  tipoExtra?: string | null;
  historico: any[];
  dataCriacao?: string;
  horaCriacao?: string;
}

interface RegressionItem {
  id: string;
  numero: string;
  current: string;
  next: string;
  desdeData: string;
  desdeHora: string;
  kind: JustificationKind;
}

interface Props {
  ids: string[];
  /** Chamado após aplicar as mudanças (limpar seleção / recarregar). */
  onDone: () => void;
  formatDateBR: (d?: string, h?: string) => string;
}

export default function BulkProgressChanger({ ids, onDone, formatDateBR }: Props) {
  const { updateOrderStatus } = useAuth();
  const [orders, setOrders] = useState<SelOrder[]>([]);
  const [selectedProgress, setSelectedProgress] = useState('');
  const [observacao, setObservacao] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [regressionItems, setRegressionItems] = useState<RegressionItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showJustify, setShowJustify] = useState(false);
  const [reason, setReason] = useState('');
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean; destino: string; blocked: BlockedItem[]; movedCount: number }>({
    open: false, destino: '', blocked: [], movedCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) { setOrders([]); return; }
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, numero, status, vendedor, tipo_extra, historico, data_criacao, hora_criacao')
        .in('id', ids);
      if (cancelled) return;
      setOrders((data || []).map((r: any) => ({
        id: r.id,
        numero: r.numero,
        status: r.status,
        vendedor: r.vendedor || undefined,
        tipoExtra: r.tipo_extra || undefined,
        historico: Array.isArray(r.historico) ? r.historico : [],
        dataCriacao: r.data_criacao || '',
        horaCriacao: r.hora_criacao || '',
      })));
    })();
    return () => { cancelled = true; };
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusList = useMemo(() => {
    const hasBelts = orders.some(o => o.tipoExtra === 'cinto');
    const hasExtras = orders.some(o => o.tipoExtra && o.tipoExtra !== 'cinto');
    const hasBotas = orders.some(o => !o.tipoExtra);
    let list = hasBelts && !hasExtras && !hasBotas ? BELT_STATUSES
      : hasExtras && !hasBelts && !hasBotas ? EXTRAS_STATUSES
      : hasBotas && !hasBelts && !hasExtras ? PRODUCTION_STATUSES
      : [...new Set([...PRODUCTION_STATUSES, ...BELT_STATUSES, ...EXTRAS_STATUSES])];
    if (orders.length === 1) {
      const o = orders[0];
      list = list.filter(s => isTransitionAllowed(o.status, s, { vendedor: o.vendedor, tipoExtra: o.tipoExtra }));
    }
    return list;
  }, [orders]);

  const reset = () => {
    setSelectedProgress('');
    setObservacao('');
    setReason('');
    setRegressionItems([]);
    setShowConfirm(false);
    setShowJustify(false);
  };

  const handleApply = async () => {
    if (!selectedProgress) { toast.error('Selecione uma etapa de produção.'); return; }
    if (selectedProgress === 'Cancelado' && !observacao.trim()) {
      toast.error('Informe o motivo do cancelamento.');
      return;
    }

    const regressions: RegressionItem[] = [];
    const normals: SelOrder[] = [];
    orders.forEach(ord => {
      const kind = requiresJustification(ord.status, selectedProgress, ord.tipoExtra);
      if (kind) {
        let desdeData = ord.dataCriacao || '';
        let desdeHora = ord.horaCriacao || '';
        for (let i = ord.historico.length - 1; i >= 0; i--) {
          const h: any = ord.historico[i];
          if (h && h.local === ord.status) {
            desdeData = h.data || desdeData;
            desdeHora = h.hora || desdeHora;
            break;
          }
        }
        regressions.push({ id: ord.id, numero: ord.numero, current: ord.status, next: selectedProgress, desdeData, desdeHora, kind });
      } else {
        normals.push(ord);
      }
    });

    const baseObs = observacao.trim();
    const blockedItems: BlockedItem[] = [];
    let applied = 0;
    if (normals.length > 0) {
      setBulkProgress({ current: 0, total: normals.length });
      try {
        for (const ord of normals) {
          try {
            await updateOrderStatus(ord.id, selectedProgress, baseObs || undefined);
            applied++;
          } catch {
            blockedItems.push({ numero: ord.numero, statusAtual: ord.status });
          }
          setBulkProgress(p => p ? { ...p, current: p.current + 1 } : p);
        }
      } finally {
        setBulkProgress(null);
      }
    }

    if (regressions.length > 0) {
      if (applied > 0) toast.success(`${applied} pedido(s) sem trava já atualizados. Resolva os ${regressions.length} travado(s).`);
      if (blockedItems.length > 0) {
        setBlockedDialog({ open: true, destino: selectedProgress, blocked: blockedItems, movedCount: applied });
      }
      setRegressionItems(regressions);
      setReason('');
      setShowConfirm(true);
      return;
    }

    if (blockedItems.length > 0) {
      setBlockedDialog({ open: true, destino: selectedProgress, blocked: blockedItems, movedCount: applied });
    } else if (applied > 0) {
      toast.success(`${applied} pedido(s) atualizado(s) para "${selectedProgress}".`);
    }
    reset();
    onDone();
  };

  const handleConfirmRegression = async () => {
    const motivo = reason.trim();
    if (motivo.length < 5) { toast.error('Justifique com pelo menos 5 caracteres.'); return; }
    const baseObs = observacao.trim();
    const prefixOf = (k: JustificationKind) =>
      k === 'cancel' ? '[CANCELAMENTO]' : k === 'pause' ? '[PAUSA]' : '[RETROCESSO]';

    let okCount = 0;
    const blocked: BlockedItem[] = [];
    setBulkProgress({ current: 0, total: regressionItems.length });
    try {
      for (const item of regressionItems) {
        const obs = `${prefixOf(item.kind)} ${motivo}${baseObs ? ` — ${baseObs}` : ''}`;
        try {
          await updateOrderStatus(item.id, selectedProgress, obs);
          okCount++;
        } catch {
          blocked.push({ numero: item.numero, statusAtual: item.current });
        }
        setBulkProgress(p => p ? { ...p, current: p.current + 1 } : p);
      }
    } finally {
      setBulkProgress(null);
    }
    if (blocked.length > 0) {
      setBlockedDialog({ open: true, destino: selectedProgress, blocked, movedCount: okCount });
    } else if (okCount > 0) {
      toast.success(`${okCount} pedido(s) atualizado(s) para "${selectedProgress}".`);
    }
    reset();
    onDone();
  };

  const handleErroMontagem = async () => {
    let okCount = 0;
    const blocked: BlockedItem[] = [];
    setBulkProgress({ current: 0, total: regressionItems.length });
    try {
      for (const item of regressionItems) {
        const motivoOpt = reason.trim();
        const { error } = await supabase.rpc('montagem_marcar_erro' as any, {
          _order_id: item.id,
          _destino: selectedProgress,
          _motivo: motivoOpt || null,
        } as any);
        if (error) blocked.push({ numero: item.numero, statusAtual: item.current });
        else okCount++;
        setBulkProgress(p => p ? { ...p, current: p.current + 1 } : p);
      }
    } finally {
      setBulkProgress(null);
    }
    if (blocked.length > 0) {
      setBlockedDialog({ open: true, destino: selectedProgress, blocked, movedCount: okCount });
    } else if (okCount > 0) {
      toast.success(`${okCount} pedido(s) marcado(s) como ERRO MONTAGEM.`);
    }
    reset();
    onDone();
  };

  const kinds = new Set(regressionItems.map(i => i.kind));
  const allCancel = kinds.size === 1 && kinds.has('cancel');
  const allPause = kinds.size === 1 && kinds.has('pause');
  const allRegression = kinds.size === 1 && kinds.has('regression');
  const labelOf = (k: JustificationKind) => k === 'cancel' ? 'cancelamento' : k === 'pause' ? 'pausa' : 'retrocesso';

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedProgress} onValueChange={(v) => { setSelectedProgress(v); if (v !== 'Cancelado') setObservacao(''); }}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Novo progresso..." />
          </SelectTrigger>
          <SelectContent>
            {statusList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder={selectedProgress === 'Cancelado' ? 'Motivo do cancelamento *' : 'Observação (opcional)'}
          className="h-8 text-xs w-56"
        />
        <Button
          size="sm"
          disabled={!!bulkProgress || !selectedProgress || (selectedProgress === 'Cancelado' && !observacao.trim())}
          onClick={handleApply}
        >
          {bulkProgress ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} />
              {bulkProgress.current} / {bulkProgress.total}
            </span>
          ) : 'Mudar progresso'}
        </Button>
        <Button variant="ghost" size="sm" disabled={!!bulkProgress} onClick={() => { reset(); onDone(); }}>
          Limpar
        </Button>
      </div>

      <BulkBlockedDialog
        open={blockedDialog.open}
        destino={blockedDialog.destino}
        blocked={blockedDialog.blocked}
        movedCount={blockedDialog.movedCount}
        onClose={() => setBlockedDialog(s => ({ ...s, open: false }))}
      />

      {/* Passo 1 — confirmação */}
      <Dialog open={showConfirm} onOpenChange={(o) => { if (!o) setShowConfirm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {allCancel ? 'Tem certeza que quer cancelar?'
                : allPause ? 'Tem certeza que quer pausar?'
                : allRegression ? 'Tem certeza que quer voltar a etapa?'
                : 'Confirma a alteração?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {regressionItems.length === 1
              ? 'Confira a data em que o pedido entrou na etapa atual:'
              : `${regressionItems.length} pedidos selecionados. Confira quando cada um entrou na etapa atual:`}
          </p>
          <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2 text-xs space-y-2">
            {regressionItems.map(item => (
              <div key={item.id} className="flex flex-col gap-0.5 pb-2 border-b border-border/40 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold">#{item.numero}</span>
                  <span className="text-muted-foreground">
                    {item.current} <span className="text-destructive font-bold">→</span> {item.next}
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-destructive font-bold">({labelOf(item.kind)})</span>
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Em <strong>{item.current}</strong> desde {item.desdeData ? formatDateBR(item.desdeData, item.desdeHora) : 'data não registrada'}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm">Cancelar</button>
            <button
              onClick={() => { setShowConfirm(false); setShowJustify(true); }}
              className="px-4 py-2 rounded-lg orange-gradient text-primary-foreground font-bold text-sm hover:opacity-90"
            >
              {allCancel ? 'Sim, cancelar' : allPause ? 'Sim, pausar' : allRegression ? 'Sim, voltar etapa' : 'Sim, continuar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passo 2 — justificativa */}
      <Dialog open={showJustify} onOpenChange={(o) => { if (!o && !bulkProgress) setShowJustify(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {allCancel ? 'Justifique o cancelamento'
                : allPause ? 'Justifique a pausa'
                : allRegression ? 'Justifique o retrocesso'
                : 'Justifique a alteração'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {regressionItems.length} pedido(s) {allCancel ? 'estão sendo cancelados'
              : allPause ? 'estão sendo pausados em "Aguardando"'
              : allRegression ? 'estão sendo movidos para uma etapa anterior'
              : 'exigem justificativa'}. A justificativa ficará registrada no histórico de produção.
          </p>
          <div className="mt-3">
            <label className="block text-xs font-semibold mb-1">
              {allCancel ? 'Motivo do cancelamento *' : allPause ? 'Motivo da pausa *' : 'Justificativa *'}
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
              placeholder={
                allCancel ? 'Ex: cliente desistiu, pedido duplicado...'
                : allPause ? 'Ex: aguardando material, aguardando confirmação do cliente...'
                : 'Ex: pedido devolvido pelo cliente, erro na separação, refazer revisão...'
              }
              className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary outline-none min-h-[80px]"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Mínimo 5 caracteres • {reason.trim().length}/500</p>
          </div>
          <DialogFooter className="mt-4 flex-col sm:flex-col items-stretch gap-2">
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowJustify(false)}
                disabled={!!bulkProgress}
                className="px-4 py-2 rounded-lg bg-muted text-foreground font-bold text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRegression}
                disabled={!!bulkProgress || reason.trim().length < 5}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 min-w-[110px]"
              >
                {bulkProgress ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <Loader2 className="animate-spin" size={14} />
                    {bulkProgress.current} / {bulkProgress.total}
                  </span>
                ) : 'Confirmar'}
              </button>
            </div>
            {(selectedProgress === 'Montagem' || selectedProgress === 'Montagem Ailton') && (
              <button
                onClick={handleErroMontagem}
                disabled={!!bulkProgress}
                className="w-full px-4 py-2 rounded-lg bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 disabled:opacity-50"
              >
                ERRO MONTAGEM (motivo opcional — não cobra novamente)
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
