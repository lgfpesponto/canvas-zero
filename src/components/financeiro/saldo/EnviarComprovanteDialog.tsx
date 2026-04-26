import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  validateComprovante, fileHash, todayISO,
} from '@/components/financeiro/financeiroHelpers';
import { uploadComprovanteRevendedor } from '@/lib/revendedorSaldo';
import { formatCurrency } from '@/lib/order-logic';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedor: string;
  onSaved: () => void;
}

export const EnviarComprovanteDialog = ({ open, onOpenChange, vendedor, onSaved }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayISO());
  const [obs, setObs] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDup, setConfirmDup] = useState<{ existingDate: string } | null>(null);

  const reset = () => {
    setFile(null); setValor(''); setData(todayISO()); setObs('');
    setConfirmDup(null);
  };

  const close = () => {
    if (submitting) return;
    reset();
    onOpenChange(false);
  };

  const doSubmit = async (skipDupCheck = false) => {
    if (!file) { toast({ title: 'Anexe o comprovante', variant: 'destructive' }); return; }
    const verr = validateComprovante(file);
    if (verr) { toast({ title: verr, variant: 'destructive' }); return; }
    const v = parseFloat(valor.replace(',', '.'));
    if (!v || v <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return; }
    if (!data) { toast({ title: 'Informe a data', variant: 'destructive' }); return; }

    setSubmitting(true);
    try {
      const hash = await fileHash(file);

      if (!skipDupCheck) {
        // Confirma duplicata por hash OU mesma tripla (valor + data + vendedor)
        const { data: hits } = await supabase
          .from('revendedor_comprovantes' as any)
          .select('id, data_pagamento, comprovante_hash, valor')
          .eq('vendedor', vendedor)
          .or(`comprovante_hash.eq.${hash},and(valor.eq.${v},data_pagamento.eq.${data})`)
          .limit(1);
        if (hits && hits.length > 0) {
          setConfirmDup({ existingDate: (hits[0] as any).data_pagamento });
          setSubmitting(false);
          return;
        }
      }

      const path = await uploadComprovanteRevendedor(file);
      const { error } = await supabase.from('revendedor_comprovantes' as any).insert({
        vendedor,
        valor: v,
        data_pagamento: data,
        observacao: obs.trim() || null,
        comprovante_url: path,
        comprovante_hash: hash,
        enviado_por: user?.id,
        status: 'pendente',
      });
      if (error) throw error;
      toast({ title: 'Comprovante enviado! Aguarde a aprovação do administrador.' });
      reset();
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar comprovante de pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo (PDF ou imagem)</Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor pago (R$)</Label>
                <Input
                  type="number" step="0.01" inputMode="decimal"
                  value={valor} onChange={(e) => setValor(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
              <div>
                <Label>Data do pagamento</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea
                rows={3} maxLength={500}
                value={obs} onChange={(e) => setObs(e.target.value)}
                placeholder="Ex.: PIX referente aos pedidos de novembro"
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted rounded p-3">
              Após o envio, o administrador irá conferir e aprovar. Quando aprovado, o valor entra
              automaticamente como saldo disponível e o sistema quita os pedidos cobrados elegíveis.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={submitting}>Cancelar</Button>
            <Button onClick={() => doSubmit(false)} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin" /> Enviando...</> : <><Upload size={16} /> Enviar comprovante</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDup} onOpenChange={(o) => { if (!o) setConfirmDup(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possível duplicata detectada</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um comprovante seu com o mesmo arquivo ou com{' '}
              <strong>{formatCurrency(parseFloat(valor.replace(',', '.')) || 0)}</strong> em{' '}
              {confirmDup?.existingDate}. Deseja enviar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDup(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDup(null); doSubmit(true); }}>
              Enviar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
