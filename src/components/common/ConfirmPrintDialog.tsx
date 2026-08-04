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
import { Printer, Loader2 } from 'lucide-react';
import { useState, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';

export interface ConfirmPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  /** Mostra spinner e trava os botões enquanto o PDF é gerado */
  running?: boolean;
}

export function ConfirmPrintDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Imprimir',
  onConfirm,
  running = false,
}: ConfirmPrintDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (running) return; onOpenChange(o); }}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => { if (running) e.preventDefault(); }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={running}
            className="gap-2"
          >
            {running
              ? <><Loader2 size={16} className="animate-spin" /> Gerando…</>
              : <><Printer size={16} /> {confirmLabel}</>}
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
  run: () => void | Promise<void>;
}

/**
 * Hook utilitário para confirmar antes de gerar PDF / imprimir.
 * Uso: const { askPrint, dialog } = useConfirmPrint();
 *      <button onClick={() => askPrint({ title, description, run: gerarPdf })} />
 *      {dialog}
 */
export function useConfirmPrint() {
  const [pending, setPending] = useState<PendingPrint | null>(null);
  const [running, setRunning] = useState(false);

  const askPrint = useCallback((p: PendingPrint) => setPending(p), []);

  const onConfirm = useCallback(async () => {
    if (!pending || running) return;
    const fn = pending.run;
    setRunning(true);
    try {
      await fn();
      setPending(null);
    } catch (e: any) {
      console.error('Erro ao gerar PDF:', e);
      toast.error(`Erro ao gerar PDF: ${e?.message || e}`);
      setPending(null);
    } finally {
      setRunning(false);
    }
  }, [pending, running]);

  const dialog = (
    <ConfirmPrintDialog
      open={!!pending}
      onOpenChange={(o) => { if (!o) setPending(null); }}
      title={pending?.title ?? ''}
      description={pending?.description}
      confirmLabel={pending?.confirmLabel}
      onConfirm={onConfirm}
      running={running}
    />
  );

  return { askPrint, dialog, running };
}
