import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface JustificativaDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}

export function JustificativaDialog({
  open,
  title = 'Justificativa da edição',
  description = 'Descreva o motivo desta alteração. A justificativa ficará registrada no histórico do pedido.',
  onConfirm,
  onCancel,
}: JustificativaDialogProps) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (open) setMotivo('');
  }, [open]);

  const trimmed = motivo.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: Cliente pediu desconto adicional aprovado pela Juliana."
          rows={4}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button disabled={!trimmed} onClick={() => onConfirm(trimmed)}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
