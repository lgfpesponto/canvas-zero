import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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

interface Props {
  canSync: boolean;
}

/**
 * Botão "Resincronizar Bagy" — força o reenvio de TODOS os produtos ativos
 * para a Bagy (force_all_active + force_rediscover).
 */
const BagyResyncAllButton = ({ canSync }: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);

  if (!canSync) return null;

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('bagy-stock-sync', {
        body: { force_all_active: true, force_rediscover: true },
      });
      if (error) throw error;
      const results: any[] = (data as any)?.results || [];
      const ok = results.filter((r) => r.ok).length;
      const fail = results.length - ok;
      if (results.length === 0) toast.info('Nenhum produto ativo para sincronizar.');
      else if (fail === 0) toast.success(`Resincronização concluída (${ok} SKU).`);
      else toast.warning(`Resincronização: ${ok} OK, ${fail} com erro.`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro na resincronização.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={running}>
        {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
        {running ? 'Sincronizando...' : 'Resincronizar Bagy'}
      </Button>

      {running && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-semibold">Carregando sincronização com a Bagy...</span>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resincronizar tudo com a Bagy?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os produtos ativos serão reenviados para a Bagy. Isso pode levar alguns
              minutos. Confirme apenas se realmente precisa de uma sincronização completa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Resincronizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BagyResyncAllButton;
