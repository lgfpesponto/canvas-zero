import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CircleDollarSign, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Status = 'pendente' | 'aprovado' | 'negado' | 'visto';

interface Props {
  orderId: string;
  hasErro: boolean;
  isOwner: boolean;
  isAdminMaster: boolean;
  onResolved?: () => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Existing {
  id: string;
  status: Status;
  desconto_solicitado: number | null;
  valor_solicitado: number | null;
  motivo: string;
}

export function AjusteValorSolicitacao({ orderId, hasErro, isOwner, isAdminMaster, onResolved }: Props) {
  const [open, setOpen] = useState(false);
  const [desconto, setDesconto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Existing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<'ok' | 'x' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectMsg, setRejectMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('order_ajuste_solicitacoes')
      .select('id,status,desconto_solicitado,valor_solicitado,motivo')
      .eq('order_id', orderId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExisting((data as any) || null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [orderId]);

  if (loading) return null;
  if (hasErro) return null;
  if (!isOwner && !isAdminMaster && !existing) return null;

  const handleEnviar = async () => {
    const v = Number(String(desconto).replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) { toast.error('Valor de desconto inválido'); return; }
    if (!motivo.trim()) { toast.error('Motivo é obrigatório'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('criar_ajuste_solicitacao', {
      _order_id: orderId, _desconto: v, _motivo: motivo.trim(),
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Solicitação enviada ao admin');
    setOpen(false); setDesconto(''); setMotivo('');
    void load();
  };

  const handleAprovar = async () => {
    if (!existing) return;
    setActioning('ok');
    const { error } = await supabase.rpc('aprovar_ajuste_solicitacao' as any, { _solicitacao_id: existing.id });
    setActioning(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Ajuste aprovado e aplicado ao pedido');
    setExisting(null);
    onResolved?.();
  };

  const handleRecusarConfirm = async () => {
    if (!existing) return;
    setActioning('x');
    const { error } = await supabase.rpc('recusar_ajuste_solicitacao' as any, {
      _solicitacao_id: existing.id,
      _resposta: rejectMsg.trim() || null,
    });
    setActioning(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Solicitação recusada — vendedor notificado');
    setRejectOpen(false); setRejectMsg('');
    setExisting(null);
    onResolved?.();
  };

  const descontoAtual = Number(existing?.desconto_solicitado ?? existing?.valor_solicitado ?? 0);

  if (existing) {
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <div className="rounded-md border px-3 py-2 bg-amber-50 border-amber-200 text-amber-900">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2 min-w-0">
              <Clock size={14} className="mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-semibold">Solicitação de ajuste — aguardando admin</div>
                <div>Desconto solicitado: <b>{fmt(descontoAtual)}</b></div>
                <div className="italic mt-0.5">"{existing.motivo}"</div>
              </div>
            </div>
            {isAdminMaster && (
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={handleAprovar} disabled={actioning !== null} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                  {actioning === 'ok' ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check size={14} className="mr-1" /> OK</>}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)} disabled={actioning !== null} className="h-7 text-xs">
                  <X size={14} className="mr-1" /> Recusar
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recusar solicitação</DialogTitle>
              <DialogDescription>
                Opcional: escreva uma resposta para o vendedor. Ele receberá uma notificação.
              </DialogDescription>
            </DialogHeader>
            <Textarea value={rejectMsg} onChange={(e) => setRejectMsg(e.target.value)}
              placeholder="Motivo da recusa (opcional)..." rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={actioning === 'x'}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRecusarConfirm} disabled={actioning === 'x'}>
                {actioning === 'x' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar recusa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!isOwner) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <Button size="sm" variant="outline" className="text-xs" onClick={() => setOpen(true)}>
        <CircleDollarSign size={14} className="mr-1" /> Solicitar ajuste de preço
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajuste de preço</DialogTitle>
            <DialogDescription>
              Descreva o desconto desejado e o motivo. O admin master receberá para aprovar ou recusar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Valor do desconto desejado (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={desconto} onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Motivo</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique o porquê do ajuste..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleEnviar} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
