import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ajustarSaldo } from '@/lib/revendedorSaldo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedor: string;
  saldoAtual: number;
  onSaved: () => void;
}

export const AjusteSaldoDialog = ({ open, onOpenChange, vendedor, saldoAtual, onSaved }: Props) => {
  const { toast } = useToast();
  const [direcao, setDirecao] = useState<'add' | 'sub'>('add');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setDirecao('add'); setValor(''); setMotivo(''); };

  const close = () => { if (saving) return; reset(); onOpenChange(false); };

  const handleSave = async () => {
    const v = parseFloat(valor.replace(',', '.'));
    if (!v || v <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return; }
    if (!motivo.trim()) { toast({ title: 'Motivo é obrigatório', variant: 'destructive' }); return; }
    const delta = direcao === 'add' ? v : -v;
    setSaving(true);
    try {
      await ajustarSaldo(vendedor, delta, motivo.trim());
      toast({ title: 'Saldo ajustado.' });
      reset();
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar saldo — {vendedor}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Saldo atual: <strong>R$ {saldoAtual.toFixed(2).replace('.', ',')}</strong>
          </div>
          <RadioGroup value={direcao} onValueChange={(v) => setDirecao(v as any)} className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="add" /> Adicionar saldo
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="sub" /> Remover saldo
            </label>
          </RadioGroup>
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number" step="0.01" inputMode="decimal" value={valor}
              onChange={(e) => setValor(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>
          <div>
            <Label>Motivo (obrigatório, ficará no histórico)</Label>
            <Textarea
              rows={3} maxLength={500}
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Acerto de divergência"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="animate-spin" /> Salvando...</> : 'Confirmar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
