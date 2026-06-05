/**
 * Painel admin_master para acompanhar e operar a sincronização Portal -> Atacado.
 * Renderizado como aba dentro de /admin/configuracoes.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSystemFlag } from '@/hooks/useSystemFlag';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { retrySyncFromLog, syncAllNow } from '@/lib/atacadoSync';

interface LogRow {
  id: string;
  source_kind: 'ficha_variacao' | 'custom_option';
  source_id: string;
  action: 'upsert' | 'delete';
  payload: any;
  status: 'pendente' | 'ok' | 'erro';
  http_status: number | null;
  erro: string | null;
  tentativas: number;
  response_body: string | null;
  created_at: string;
  finished_at: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  erro: 'bg-destructive/15 text-destructive border-destructive/30',
  pendente: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
};

function payloadLabel(row: LogRow): string {
  const p = row.payload ?? {};
  if (row.source_kind === 'custom_option') {
    return p.label ?? row.source_id.slice(0, 8);
  }
  const parts: string[] = [];
  if (p.categoria?.nome) parts.push(p.categoria.nome);
  if (p.campo?.nome) parts.push(p.campo.nome);
  if (p.nome) parts.push(p.nome);
  return parts.length ? parts.join(' · ') : row.source_id.slice(0, 8);
}

export default function AtacadoSyncPanel() {
  const { value: enabled, update: updateFlag, loading: flagLoading } =
    useSystemFlag('atacado_variacao_sync_enabled', true);

  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ total: 0, processed: 0, current: '' });
  const [retrying, setRetrying] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from('atacado_variacao_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      toast.error('Erro ao carregar log: ' + error.message);
    } else {
      setRows((data ?? []) as LogRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel('atacado_variacao_sync_log_panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atacado_variacao_sync_log' },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.source_kind} ${r.action} ${payloadLabel(r)} ${r.erro ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, search]);

  async function handleRetry(id: string) {
    setRetrying(id);
    const res = await retrySyncFromLog(id);
    setRetrying(null);
    if (res.ok) toast.success('Reenviado com sucesso');
    // Realtime cuida do refresh
  }

  async function handleSyncAll() {
    if (bulkRunning) return;
    if (!confirm('Reenviar TODAS as variações ativas e custom_options para o Atacado?')) return;
    setBulkRunning(true);
    setBulkProgress({ total: 0, processed: 0, current: '' });
    try {
      await syncAllNow(p => setBulkProgress({
        total: p.total,
        processed: p.processed,
        current: p.current ?? '',
      }));
      toast.success(`Sincronização concluída (${bulkProgress.processed}/${bulkProgress.total})`);
    } finally {
      setBulkRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Switch da flag */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              id="atacado-sync-flag"
              checked={enabled}
              disabled={flagLoading}
              onCheckedChange={async (v) => {
                const r = await updateFlag(v);
                if (!r.ok) toast.error('Erro: ' + (r.error ?? ''));
                else toast.success(v ? 'Sincronização ligada' : 'Sincronização pausada');
              }}
            />
            <Label htmlFor="atacado-sync-flag" className="cursor-pointer">
              <span className="font-medium">Sincronização Portal → Atacado</span>
              <p className="text-xs text-muted-foreground">
                Quando desligada, alterações são registradas como "pendente" mas não enviadas.
              </p>
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={bulkRunning || !enabled}
            className="gap-2"
          >
            {bulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {bulkRunning
              ? `Enviando ${bulkProgress.processed}/${bulkProgress.total}…`
              : 'Sincronizar tudo agora'}
          </Button>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar por nome, categoria, erro…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button variant="ghost" size="icon" onClick={load} title="Recarregar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium">Ação</th>
                    <th className="px-3 py-2 text-left font-medium">Identificador</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">HTTP</th>
                    <th className="px-3 py-2 text-left font-medium">Erro</th>
                    <th className="px-3 py-2 text-center font-medium">Tent.</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {r.source_kind === 'ficha_variacao' ? 'variação' : 'custom'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{r.action}</td>
                      <td className="max-w-xs truncate px-3 py-2">{payloadLabel(r)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[r.status] ?? ''}`}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.http_status ?? '—'}</td>
                      <td className="max-w-[16rem] truncate px-3 py-2 text-xs text-destructive" title={r.erro ?? ''}>
                        {r.erro ?? ''}
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{r.tentativas}</td>
                      <td className="px-3 py-2 text-right">
                        {r.status === 'erro' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={retrying === r.id}
                            onClick={() => handleRetry(r.id)}
                            className="h-7 gap-1 px-2 text-xs"
                          >
                            {retrying === r.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RotateCcw className="h-3 w-3" />}
                            Reenviar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Mostrando últimas 200 entradas. Atualiza em tempo real.
      </p>
    </div>
  );
}
