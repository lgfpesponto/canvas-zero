import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CircleDollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Status = 'pendente' | 'aprovado' | 'negado';

interface Props {
  orderId: string;
  orderStatus: string;
  valorAtual: number;
  isOwner: boolean; // user é o vendedor do pedido
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function AjusteValorSolicitacao({ orderId, orderStatus, valorAtual, isOwner }: Props) {
  const [open, setOpen] = useState(false);
  const [novoValor, setNovoValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<{ status: Status; valor_solicitado: number; resposta_admin: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('order_ajuste_solicitacoes')
      .select('status,valor_solicitado,resposta_admin')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExisting(data as any);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [orderId]);

  if (!isOwner) return null;
  if (orderStatus !== 'Entregue' && !existing) return null;

  const handleEnviar = async () => {
    const v = Number(String(novoValor).replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) { toast.error('Valor inválido'); return; }
    if (!motivo.trim()) { toast.error('Motivo é obrigatório'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('criar_ajuste_solicitacao', {
      _order_id: orderId, _valor_solicitado: v, _motivo: motivo.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Solicitação enviada ao admin');
    setOpen(false); setNovoValor(''); setMotivo('');
    void load();
  };

  if (loading) return null;

  if (existing?.status === 'pendente') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
        <Clock size={14} /> Ajuste solicitado ({fmt(Number(existing.valor_solicitado))}) — aguardando admin
      </div>
    );
  }

  if (existing?.status === 'aprovado') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
        <CheckCircle2 size={14} /> Ajuste aprovado para {fmt(Number(existing.valor_solicitado))}
      </div>
    );
  }

  if (existing?.status === 'negado') {
    return (
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <XCircle size={14} /> Ajuste negado{existing.resposta_admin ? ` — ${existing.resposta_admin}` : ''}
        </div>
        {orderStatus === 'Entregue' && (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setOpen(true)}>
            Solicitar novamente
          </Button>
        )}
        <SolicitarDialog
          open={open} onOpenChange={setOpen}
          valorAtual={valorAtual}
          novoValor={novoValor} setNovoValor={setNovoValor}
          motivo={motivo} setMotivo={setMotivo}
          saving={saving} onEnviar={handleEnviar}
        />
      </div>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" className="text-xs" onClick={() => setOpen(true)}>
        <CircleDollarSign size={14} className="mr-1" /> Solicitar ajuste de valor
      </Button>
      <SolicitarDialog
        open={open} onOpenChange={setOpen}
        valorAtual={valorAtual}
        novoValor={novoValor} setNovoValor={setNovoValor}
        motivo={motivo} setMotivo={setMotivo}
        saving={saving} onEnviar={handleEnviar}
      />
    </>
  );
}

function SolicitarDialog({ open, onOpenChange, valorAtual, novoValor, setNovoValor, motivo, setMotivo, saving, onEnviar }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar ajuste de valor</DialogTitle>
          <DialogDescription>
            O admin receberá sua solicitação. Ao ser aprovada, o valor do pedido será atualizado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Valor atual</Label>
            <Input value={fmt(valorAtual)} disabled />
          </div>
          <div>
            <Label className="text-xs">Novo valor desejado (R$)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={novoValor} onChange={(e) => setNovoValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label className="text-xs">Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o porquê do ajuste..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onEnviar} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
