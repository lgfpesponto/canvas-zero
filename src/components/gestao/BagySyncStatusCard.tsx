import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, ShoppingCart, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QueueStats {
  pendentes: number;
  erros: number;
  ultimo_ok: string | null;
  ultimo_erro: string | null;
}

interface LogRow {
  id: string;
  produto_id: string | null;
  sku: string | null;
  variation_id: string | null;
  saldo_local_antes: number | null;
  saldo_bagy_antes: number | null;
  acao: string;
  saldo_final: number | null;
  erro: string | null;
  executado_em: string;
}

const ACAO_LABEL: Record<string, { label: string; color: string }> = {
  ajustou_local: { label: 'Portal → Bagy', color: 'bg-blue-500/10 text-blue-700' },
  ajustou_bagy: { label: 'Bagy → Portal', color: 'bg-amber-500/10 text-amber-700' },
  seria_ajusta_local: { label: 'Simulação: local', color: 'bg-muted text-muted-foreground' },
  seria_ajusta_bagy: { label: 'Simulação: Bagy', color: 'bg-muted text-muted-foreground' },
  erro: { label: 'Erro', color: 'bg-destructive/10 text-destructive' },
  sem_diferenca: { label: 'OK', color: 'bg-emerald-500/10 text-emerald-700' },
};

export default function BagySyncStatusCard() {
  const [stats, setStats] = useState<QueueStats>({ pendentes: 0, erros: 0, ultimo_ok: null, ultimo_erro: null });
  const [running, setRunning] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadStats = async () => {
    const [pend, err, okProd, errProd] = await Promise.all([
      supabase.from('bagy_stock_sync_queue' as any).select('id', { count: 'exact', head: true }).is('processado_em', null),
      supabase.from('estoque_produtos' as any).select('id', { count: 'exact', head: true }).in('bagy_sync_status', ['erro', 'nao_encontrado_na_bagy']),
      supabase.from('estoque_produtos' as any).select('bagy_sync_at').eq('bagy_sync_status', 'ok').order('bagy_sync_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('estoque_produtos' as any).select('bagy_sync_at').in('bagy_sync_status', ['erro', 'nao_encontrado_na_bagy']).order('bagy_sync_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setStats({
      pendentes: pend.count || 0,
      erros: err.count || 0,
      ultimo_ok: (okProd.data as any)?.bagy_sync_at || null,
      ultimo_erro: (errProd.data as any)?.bagy_sync_at || null,
    });
  };

  useEffect(() => { loadStats(); }, []);

  const rodarReconcile = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('bagy-stock-reconcile', { body: {} });
      if (error) throw error;
      const d = data as any;
      toast.success(`Reconciliado: ${d?.total ?? 0} produtos · ${d?.ajustes_local ?? 0} p/ local · ${d?.ajustes_bagy ?? 0} p/ Bagy · ${d?.erros ?? 0} erros`);
      loadStats();
    } catch (e: any) {
      toast.error(`Falha ao reconciliar: ${e.message || e}`);
    } finally {
      setRunning(false);
    }
  };

  const abrirLogs = async () => {
    setLogsOpen(true);
    setLoadingLogs(true);
    const { data } = await supabase
      .from('bagy_stock_reconcile_log' as any)
      .select('*')
      .order('executado_em', { ascending: false })
      .limit(50);
    setLogs((data || []) as any);
    setLoadingLogs(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Sincronização Bagy (Rancho Chique)</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded border border-border p-2">
              <div className="text-[10px] text-muted-foreground uppercase">Fila pendente</div>
              <div className="text-lg font-bold flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {stats.pendentes}
              </div>
            </div>
            <div className={`rounded border p-2 ${stats.erros > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}>
              <div className="text-[10px] text-muted-foreground uppercase">Com erro</div>
              <div className="text-lg font-bold flex items-center gap-1">
                {stats.erros > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                {stats.erros}
              </div>
            </div>
            <div className="rounded border border-border p-2">
              <div className="text-[10px] text-muted-foreground uppercase">Último OK</div>
              <div className="text-xs">
                {stats.ultimo_ok ? format(parseISO(stats.ultimo_ok), "dd/MM HH:mm", { locale: ptBR }) : '—'}
              </div>
            </div>
            <div className="rounded border border-border p-2">
              <div className="text-[10px] text-muted-foreground uppercase">Último erro</div>
              <div className="text-xs">
                {stats.ultimo_erro ? format(parseISO(stats.ultimo_erro), "dd/MM HH:mm", { locale: ptBR }) : '—'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={rodarReconcile} disabled={running} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
              Reconciliar agora
            </Button>
            <Button size="sm" variant="outline" onClick={abrirLogs}>Ver divergências</Button>
            <Button size="sm" variant="ghost" onClick={loadStats}>Atualizar contadores</Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Reconciliação automática roda a cada 15 minutos. Quando local &gt; Bagy, o portal é ajustado (venda na loja). Quando local &lt; Bagy, o saldo é reenviado.
          </p>
        </CardContent>
      </Card>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Últimas divergências</DialogTitle>
          </DialogHeader>
          {loadingLogs ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma divergência registrada.</p>
          ) : (
            <div className="space-y-1">
              {logs.map(l => {
                const meta = ACAO_LABEL[l.acao] || { label: l.acao, color: 'bg-muted' };
                return (
                  <div key={l.id} className="text-xs border border-border rounded p-2 flex flex-wrap items-center gap-2">
                    <Badge className={`${meta.color} border-0 text-[10px]`}>{meta.label}</Badge>
                    <span className="font-mono">{l.sku || '—'}</span>
                    <span className="text-muted-foreground">
                      local {l.saldo_local_antes ?? '—'} · bagy {l.saldo_bagy_antes ?? '—'} → {l.saldo_final ?? '—'}
                    </span>
                    {l.erro && <span className="text-destructive">· {l.erro}</span>}
                    <span className="ml-auto text-muted-foreground">
                      {format(parseISO(l.executado_em), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
