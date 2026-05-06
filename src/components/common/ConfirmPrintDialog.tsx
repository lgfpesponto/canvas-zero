import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Printer } from 'lucide-react';
import { useState, useCallback, type ReactNode } from 'react';

export interface ConfirmPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function ConfirmPrintDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Imprimir',
  onConfirm,
}: ConfirmPrintDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="gap-2"
          >
            <Printer size={16} /> {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PendingPrint {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  run: () => void;
}

/**
 * Hook utilitário para confirmar antes de gerar PDF / imprimir.
 * Uso: const { askPrint, dialog } = useConfirmPrint();
 *      <button onClick={() => askPrint({ title, description, run: gerarPdf })} />
 *      {dialog}
 */
export function useConfirmPrint() {
  const [pending, setPending] = useState<PendingPrint | null>(null);

  const askPrint = useCallback((p: PendingPrint) => setPending(p), []);

  const onConfirm = useCallback(() => {
    if (!pending) return;
    const fn = pending.run;
    setPending(null);
    // próximo tick para garantir que o diálogo fechou antes de disparar download
    setTimeout(fn, 0);
  }, [pending]);

  const dialog = (
    <ConfirmPrintDialog
      open={!!pending}
      onOpenChange={(o) => { if (!o) setPending(null); }}
      title={pending?.title ?? ''}
      description={pending?.description}
      confirmLabel={pending?.confirmLabel}
      onConfirm={onConfirm}
    />
  );

  return { askPrint, dialog };
}
