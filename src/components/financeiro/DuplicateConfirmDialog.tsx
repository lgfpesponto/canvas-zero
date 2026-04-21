import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/order-logic';
import { formatDateBR, type DupMatch } from './financeiroHelpers';

interface Props {
  open: boolean;
  matches: DupMatch[];
  onCancel: () => void;
  onSaveAll: () => void;
  onSaveOnlyNew: () => void;
  saving?: boolean;
}

export const DuplicateConfirmDialog = ({
  open, matches, onCancel, onSaveAll, onSaveOnlyNew, saving,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} />
            Possível duplicidade detectada
          </DialogTitle>
          <DialogDescription>
            {matches.length === 1
              ? '1 comprovante parece já existir no sistema:'
              : `${matches.length} comprovantes parecem já existir no sistema:`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {matches.map((m) => (
            <div key={m.itemId} className="border border-destructive/30 bg-destructive/5 rounded p-3 text-sm">
              <p className="font-semibold truncate">{m.fileName || 'Comprovante'}</p>
              <p className="text-muted-foreground">
                {formatCurrency(m.valor)} — {formatDateBR(m.data_pagamento)} — {m.destinatario}
              </p>
              <p className="text-xs mt-1 text-destructive">
                {m.reason === 'hash'
                  ? '⚠ Mesmo arquivo já foi enviado anteriormente (hash idêntico).'
                  : `⚠ Já existe registro com mesmo valor, data e destinatário (salvo em ${formatDateBR(m.existingDate)}).`}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={onSaveOnlyNew} disabled={saving}>
            Salvar só os não duplicados
          </Button>
          <Button
            onClick={onSaveAll}
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sim, salvar todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
