import { supabase } from '@/integrations/supabase/client';

export interface BulkResultItem {
  id: string;
  numero?: string;
  ok: boolean;
  error?: string;
}

/** Cria estoque em massa para vários pedidos chamando criar_estoque_produto.
 *  Limita concorrência a `concurrency` (default 4).
 *  Chama onProgress(done, total) a cada item finalizado.
 */
export async function criarEstoqueEmMassa(
  ids: { id: string; numero?: string }[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 4,
): Promise<BulkResultItem[]> {
  const total = ids.length;
  const results: BulkResultItem[] = [];
  let done = 0;
  let idx = 0;

  const worker = async () => {
    while (idx < total) {
      const cur = idx++;
      const item = ids[cur];
      try {
        const { error } = await (supabase.rpc as any)('criar_estoque_produto', { _order_id: item.id });
        if (error) throw error;
        results.push({ id: item.id, numero: item.numero, ok: true });
      } catch (e: any) {
        results.push({ id: item.id, numero: item.numero, ok: false, error: e?.message || String(e) });
      } finally {
        done++;
        onProgress?.(done, total);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, total)) }, () => worker()));
  return results;
}
