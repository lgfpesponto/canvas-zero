import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Play, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import { computeTotalToSave } from '@/lib/recomputeOrderPrice';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';
import { useCustomOptions } from '@/hooks/useCustomOptions';
import { toast } from 'sonner';

const BATCH = 100;

type Diverg = { numero: string; antes: number; depois: number };

export function RecalcPrecosRunner() {
  const { findFichaPrice, loading: l1 } = useFichaVariacoesLookup();
  const { getByCategoria, loading: l2 } = useCustomOptions();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [divergs, setDivergs] = useState<Diverg[]>([]);
  const [finished, setFinished] = useState(false);

  const run = async () => {
    if (l1 || l2) { toast.error('Aguarde carregar variações...'); return; }
    setRunning(true);
    setFinished(false);
    setDivergs([]);
    const localDivergs: Diverg[] = [];

    try {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('preco_migrado_v2', false);
      const total = count || 0;
      setProgress({ done: 0, total });
      if (total === 0) { toast.success('Nenhum pedido pendente.'); setFinished(true); return; }

      let processed = 0;
      while (true) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('preco_migrado_v2', false)
          .order('created_at', { ascending: true })
          .limit(BATCH);
        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const row of data) {
          const order = dbRowToOrder(row);
          const expected = computeTotalToSave(order, findFichaPrice, getByCategoria);
          const before = Number(row.preco) || 0;
          const patch: any = { preco_migrado_v2: true };
          if (Math.abs(expected - before) >= 1) {
            patch.preco = expected;
            localDivergs.push({ numero: row.numero, antes: before, depois: expected });
          }
          const { error: upErr } = await supabase.from('orders').update(patch).eq('id', row.id);
          if (upErr) console.error('falha update', row.numero, upErr);
          processed++;
          if (processed % 10 === 0) setProgress({ done: processed, total });
        }
        setProgress({ done: processed, total });
        setDivergs([...localDivergs]);
      }
      setFinished(true);
      toast.success(`Concluído: ${processed} pedidos. Divergências corrigidas: ${localDivergs.length}.`);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro: ' + (e?.message || 'desconhecido'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Recalcular preço total dos pedidos antigos</p>
            <p>Aplica o novo modelo (subtotal × quantidade − desconto) em todos os pedidos ainda não migrados. Roda em lotes de {BATCH}. Pode ser interrompido e retomado.</p>
          </div>
        </div>

        <Button onClick={run} disabled={running || l1 || l2} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Processando...' : 'Iniciar recálculo'}
        </Button>

        {(running || finished) && (
          <div className="text-sm">
            <p className="tabular-nums">
              Progresso: <strong>{progress.done}</strong> / {progress.total}
            </p>
          </div>
        )}

        {divergs.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Divergências corrigidas ({divergs.length}):</p>
            <div className="max-h-64 overflow-auto rounded border border-border/40 text-xs font-mono">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Pedido</th>
                    <th className="px-2 py-1 text-right">Antes</th>
                    <th className="px-2 py-1 text-right">Depois</th>
                  </tr>
                </thead>
                <tbody>
                  {divergs.slice(-200).reverse().map((d, i) => (
                    <tr key={i} className="border-t border-border/20">
                      <td className="px-2 py-1">{d.numero}</td>
                      <td className="px-2 py-1 text-right">R$ {d.antes.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">R$ {d.depois.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
