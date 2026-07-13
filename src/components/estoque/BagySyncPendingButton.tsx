import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  canSync: boolean;         // admin_master, admin_producao, vendedor_comissao
  currentUserId?: string;
  currentUserNome?: string;
}

/**
 * Botão "Sincronizar com Bagy" — só aparece se existem entradas pendentes na
 * fila `estoque_bagy_sync_pendente`. Após o clique, invoca a edge function
 * `bagy-stock-sync` que percorre pendentes e envia SÓ os SKUs recém-adicionados.
 */
const BagySyncPendingButton = ({ canSync, currentUserId, currentUserNome }: Props) => {
  const [pendentes, setPendentes] = useState(0);
  const [running, setRunning] = useState(false);

  const fetchPend = async () => {
    if (!canSync) return;
    const { count } = await supabase
      .from('estoque_bagy_sync_pendente' as any)
      .select('id', { count: 'exact', head: true })
      .is('sincronizado_em', null);
    setPendentes(count || 0);
  };

  useEffect(() => {
    fetchPend();
    if (!canSync) return;
    const ch = supabase.channel('bagy-sync-pend-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_bagy_sync_pendente' }, fetchPend)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canSync]);

  if (!canSync || pendentes === 0) return null;

  const handleSync = async () => {
    setRunning(true);
    try {
      // Drena a fila real (bagy_stock_sync_queue) em batch; edge function processa até 50 por chamada
      const { data, error } = await supabase.functions.invoke('bagy-stock-sync', { body: {} });
      if (error) throw error;
      const results: any[] = (data as any)?.results || [];
      const ok = results.filter(r => r.ok).length;
      const fail = results.length - ok;

      // Marca fila auxiliar (estoque_bagy_sync_pendente) como sincronizada
      await supabase.from('estoque_bagy_sync_pendente' as any).update({
        sincronizado_em: new Date().toISOString(),
        sincronizado_por: currentUserId || null,
        sincronizado_por_nome: currentUserNome || null,
      }).is('sincronizado_em', null);

      if (results.length === 0) toast.info('Nada a sincronizar.');
      else if (fail === 0) toast.success(`Bagy sincronizada (${ok} SKU).`);
      else toast.warning(`Bagy: ${ok} OK, ${fail} com erro (veja o card de cada produto).`);
      fetchPend();
    } catch (e: any) {
      toast.error(e?.message || 'Erro na sincronização.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={running}>
      {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      Sincronizar com Bagy ({pendentes})
    </Button>
  );
};

export default BagySyncPendingButton;
