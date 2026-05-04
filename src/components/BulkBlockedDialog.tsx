import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export interface BlockedItem {
  numero: string;
  statusAtual: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  destino: string;
  blocked: BlockedItem[];
  movedCount?: number;
}

export function BulkBlockedDialog({ open, onClose, destino, blocked, movedCount = 0 }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" size={20} />
            Pedidos não movidos
          </DialogTitle>
          <DialogDescription>
            {movedCount > 0 && <span className="block mb-1">{movedCount} pedido(s) movido(s) para "{destino}".</span>}
            Os pedidos abaixo não puderam ir para "{destino}" porque a ordem de produção não permite essa transição.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-md border border-border divide-y divide-border">
          {blocked.map((b) => (
            <div key={b.numero} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="font-semibold">{b.numero}</span>
              <span className="text-xs text-muted-foreground">Status atual: {b.statusAtual}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
