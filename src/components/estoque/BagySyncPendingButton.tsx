import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import BagySyncErrorsDialog, { fetchBagyProblemas } from './BagySyncErrorsDialog';

interface Props {
  canSync: boolean;
  currentUserId?: string;
  currentUserNome?: string;
}

/**
 * Botão "Sincronizar com Bagy" — considera produtos sem sincronização real,
 * pendentes, com erro OU itens da fila `bagy_stock_sync_queue` ainda travados.
 */
const BagySyncPendingButton = ({ canSync, currentUserId, currentUserNome }: Props) => {
  const [pendentes, setPendentes] = useState(0);
  const [running, setRunning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPend = async () => {
    if (!canSync) return;
    try {
      const list = await fetchBagyProblemas();
      setPendentes(list.length);
    } catch {
      /* silencioso */
    }
  };

  useEffect(() => {
    fetchPend();
    if (!canSync) return;
    const ch = supabase
      .channel('bagy-sync-pend-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, fetchPend)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bagy_stock_sync_queue' }, fetchPend)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [canSync]);

  if (!canSync || pendentes === 0) return null;

  const handleSync = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('bagy-stock-sync', { body: { retry_unsynced: true } });
      if (error) throw error;
      const results: any[] = (data as any)?.results || [];
      const ok = results.filter((r) => r.ok).length;
      const fail = results.length - ok;

      const okSkus = results.filter((r) => r.ok && r.sku).map((r) => r.sku);
      if (okSkus.length > 0) {
        await supabase
          .from('estoque_bagy_sync_pendente' as any)
          .update({
            sincronizado_em: new Date().toISOString(),
            sincronizado_por: currentUserId || null,
            sincronizado_por_nome: currentUserNome || null,
          })
          .in('sku_base', okSkus)
          .is('sincronizado_em', null);
      }

      if (results.length === 0) toast.info('Nada a sincronizar.');
      else if (fail === 0) toast.success(`Bagy sincronizada (${ok} SKU).`);
      else toast.warning(`Bagy: ${ok} OK, ${fail} com erro (veja "Ver produtos").`);
      fetchPend();
    } catch (e: any) {
      toast.error(e?.message || 'Erro na sincronização.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleSync} disabled={running}>
        {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Sincronizar com Bagy ({pendentes})
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <AlertCircle size={14} />
        Ver produtos
      </Button>
      <BagySyncErrorsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSyncNow={handleSync}
        syncing={running}
      />
    </>
  );
};

export default BagySyncPendingButton;
