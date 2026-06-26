import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type OrderLike = {
  id: string;
  bagy_order_id?: string | null;
  bagy_last_sync_at?: string | null;
  bagy_last_sync_error?: string | null;
  bagy_last_sync_status?: string | null;
};

function fmtRelative(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export function BagySyncButton({ order, onDone }: { order: OrderLike; onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  if (!order.bagy_order_id) return null;

  const run = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('bagy-status-push', {
      body: { order_ids: [order.id] },
    });
    setLoading(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    const r = (data?.results?.[0] || {}) as { ok?: boolean; status?: string; error?: string };
    if (r.ok) {
      toast.success(`Status "${r.status}" enviado para a Bagy.`);
      onDone?.();
    } else {
      toast.error('Falha ao sincronizar: ' + (r.error || 'erro desconhecido'));
    }
  };

  const last = order.bagy_last_sync_at;
  const err = order.bagy_last_sync_error;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="default" onClick={run} disabled={loading}>
              {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
              Atualizar status na Bagy
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Envia o status atual do portal pra Bagy agora. Use depois de mudar a etapa,
            faturar (emitir NF) ou despachar (com rastreio).
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {last && (
        err ? (
          <TooltipProvider><Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] text-destructive flex items-center gap-1 cursor-help">
                <XCircle size={12} /> erro {fmtRelative(last)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{err}</TooltipContent>
          </Tooltip></TooltipProvider>
        ) : (
          <span className="text-[11px] text-green-700 flex items-center gap-1">
            <CheckCircle2 size={12} /> {fmtRelative(last)}
          </span>
        )
      )}
    </div>
  );
}
