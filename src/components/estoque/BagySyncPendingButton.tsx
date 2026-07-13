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
 * Botão "Sincronizar com Bagy" — aparece quando existem produtos ativos ainda
 * sem sincronização real, pendentes, com erro ou sem vínculo encontrado na Bagy.
 */
const BagySyncPendingButton = ({ canSync, currentUserId, currentUserNome }: Props) => {
  const [pendentes, setPendentes] = useState(0);
  const [running, setRunning] = useState(false);

  const fetchPend = async () => {
    if (!canSync) return;
    const { count, error } = await supabase
      .from('estoque_produtos' as any)
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true)
      .not('sku_base', 'is', null)
      .or('bagy_sync_status.is.null,bagy_sync_status.in.(pendente,erro,nao_encontrado_na_bagy),bagy_sync_at.is.null');
    if (error) return;
    setPendentes(count || 0);
  };

  useEffect(() => {
    fetchPend();
    if (!canSync) return;
    const ch = supabase.channel('bagy-sync-pend-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque_produtos' }, fetchPend)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canSync]);

  if (!canSync || pendentes === 0) return null;

  const handleSync = async () => {
    setRunning(true);
    try {
      // Reenfileira produtos ativos ainda não sincronizados e drena a fila real em batch.
      const { data, error } = await supabase.functions.invoke('bagy-stock-sync', { body: { retry_unsynced: true } });
      if (error) throw error;
      const results: any[] = (data as any)?.results || [];
      const ok = results.filter(r => r.ok).length;
      const fail = results.length - ok;

      // Marca a fila auxiliar só para SKUs que realmente voltaram OK.
      const okSkus = results.filter(r => r.ok && r.sku).map(r => r.sku);
      if (okSkus.length > 0) {
        await supabase.from('estoque_bagy_sync_pendente' as any).update({
          sincronizado_em: new Date().toISOString(),
          sincronizado_por: currentUserId || null,
          sincronizado_por_nome: currentUserNome || null,
        }).in('sku_base', okSkus).is('sincronizado_em', null);
      }

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
