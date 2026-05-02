/**
 * Varredura única retroativa de preços de pedidos.
 *
 * Roda automaticamente uma vez por admin_master após o deploy. Lê todos os pedidos
 * que NÃO estão em Cobrado/Pago/Cancelado, recalcula o subtotal usando a lógica
 * canônica de `recomputeSubtotal` e, quando há divergência > R$ 0,01, atualiza o
 * `preco` do pedido. Assim listagens, dashboards e PDFs (que leem `order.preco`)
 * passam a refletir o valor correto sem precisar abrir cada pedido individualmente.
 *
 * Inclui também botão manual ("Recalcular preços agora") para rodar de novo se
 * regras de cálculo mudarem ou se algum pedido for editado em massa pelo banco.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToOrder } from '@/lib/order-logic';
import { recomputeSubtotal, targetPrecoFromSubtotal } from '@/lib/recomputeOrderPrice';

const STORAGE_KEY = 'recalc_precos_v2_done';
const PARALLEL = 25;

async function recomputarTodos(
  onProgress: (done: number, total: number, fixed: number) => void,
): Promise<{ corrigidos: number; varridos: number }> {
  // Busca todos os pedidos relevantes (exclui Cobrado/Pago/Cancelado)
  // Paginação: Supabase devolve no máximo 1000 por requisição.
  const PAGE = 1000;
  const allRows: any[] = [];
  let from = 0;
  // v2: passa a varrer TODOS os pedidos não cancelados (inclusive Entregue/Cobrado/Pago).
  // Antes ignorava cobrados/pagos, então pedidos antigos seguiam com `preco` desatualizado
  // no banco e relatórios derivados podiam exibir total errado.
  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'Cancelado')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const total = allRows.length;
  let done = 0;
  let fixed = 0;

  // Identifica divergências
  const updates: { id: string; preco: number }[] = [];
  for (const row of allRows) {
    const order = dbRowToOrder(row);
    // Bota Pronta Entrega: ignora — preço armazenado é o total que o admin definiu.
    if (order.tipoExtra === 'bota_pronta_entrega') {
      done++;
      continue;
    }
    const subtotal = recomputeSubtotal(order);
    if (subtotal <= 0) {
      done++;
      continue; // sem composição (kit antigo / dados incompletos) — não mexe
    }
    const alvo = targetPrecoFromSubtotal(order, subtotal);
    const atual = Number(row.preco) || 0;
    if (Math.abs(atual - alvo) > 0.01) {
      updates.push({ id: row.id, preco: Number(alvo.toFixed(2)) });
    }
    done++;
    if (done % 50 === 0) onProgress(done, total, updates.length);
  }
  onProgress(done, total, updates.length);

  // Aplica em paralelo limitado
  for (let i = 0; i < updates.length; i += PARALLEL) {
    const batch = updates.slice(i, i + PARALLEL);
    await Promise.all(
      batch.map(u =>
        supabase.from('orders').update({ preco: u.preco }).eq('id', u.id),
      ),
    );
    fixed = Math.min(updates.length, i + batch.length);
    onProgress(total, total, fixed);
  }

  return { corrigidos: updates.length, varridos: total };
}

export default function RecalcPrecosRunner() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; fixed: number } | null>(null);
  const [lastResult, setLastResult] = useState<{ corrigidos: number; varridos: number; quando: string } | null>(null);
  const autoStartedRef = useRef(false);

  const run = async (manual: boolean) => {
    if (running) return;
    setRunning(true);
    setProgress({ done: 0, total: 0, fixed: 0 });
    const tid = toast.loading(manual ? 'Recalculando preços de todos os pedidos…' : 'Verificando preços antigos em segundo plano…');
    try {
      const result = await recomputarTodos((done, total, fixed) =>
        setProgress({ done, total, fixed }),
      );
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setLastResult({ ...result, quando: new Date().toISOString() });
      toast.success(
        result.corrigidos === 0
          ? `Tudo certo! ${result.varridos} pedidos verificados, nenhum precisava de ajuste.`
          : `${result.corrigidos} pedidos tiveram o preço corrigido (de ${result.varridos} verificados).`,
        { id: tid, duration: 8000 },
      );
    } catch (e: any) {
      console.error('[RecalcPrecos] erro:', e);
      toast.error('Falha ao recalcular preços: ' + (e?.message || 'erro desconhecido'), { id: tid });
    } finally {
      setRunning(false);
    }
  };

  // Auto-start uma única vez por admin_master / browser
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    autoStartedRef.current = true;
    // pequeno delay pra não competir com o carregamento da página
    const id = window.setTimeout(() => run(false), 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.done / progress.total) * 100))
    : 0;

  return (
    <Card className="mb-4 border-primary/20">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            {running ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <CheckCircle2 className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <div className="font-semibold text-foreground">Recalculo retroativo de preços</div>
            <div className="text-sm text-muted-foreground">
              {running && progress
                ? `Verificando ${progress.done}/${progress.total} pedidos · ${progress.fixed} a corrigir (${pct}%)`
                : lastResult
                  ? `Última varredura: ${lastResult.corrigidos} corrigidos de ${lastResult.varridos} verificados.`
                  : 'Garante que todos os pedidos (exceto Cobrado/Pago) reflitam a composição correta nos relatórios.'}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { localStorage.removeItem(STORAGE_KEY); run(true); }}
          disabled={running}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Recalculando…' : 'Recalcular preços agora'}
        </Button>
      </CardContent>
    </Card>
  );
}
