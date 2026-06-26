import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, SkipForward, X } from 'lucide-react';
import { toast } from 'sonner';
import OrderPage from '@/pages/OrderPage';

export type BagyFichaQueueItem = {
  pedidoId: string;
  itemId: string;
};

interface Props {
  open: boolean;
  queue: BagyFichaQueueItem[];
  onClose: () => void;
  /** Disparado quando todos da fila foram processados (ok+skipped). */
  onFinished?: (stats: { saved: number; skipped: number }) => void;
}

type Resolved = {
  templateId: string;
  numero: string;
  cliente: string;
  whatsapp: string;
  tamanho: string;
  fotoUrl: string | null;
  bagyPedidoId: string;
  bagyItemId: string;
  bagyOrderId: string;
  quantidade: number;
};

/**
 * Dialog sobreposto à página de Pedidos Bagy.
 * Mostra a ficha (espelho-first) de cada item da fila, permite OK→Finalizar
 * ou Editar (abre o formulário completo). Avança automaticamente para o próximo.
 */
export function BagyFichaDialog({ open, queue, onClose, onFinished }: Props) {
  const [idx, setIdx] = useState(0);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(0);
  const [skipped, setSkipped] = useState(0);
  // remount key força OrderPage a recriar (estado limpo) a cada item
  const [mountKey, setMountKey] = useState(0);

  // Reset quando abre
  useEffect(() => {
    if (open) {
      setIdx(0);
      setSaved(0);
      setSkipped(0);
      setMountKey(k => k + 1);
    }
  }, [open]);

  // Resolve dados do item atual
  useEffect(() => {
    if (!open) return;
    const current = queue[idx];
    if (!current) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setResolved(null);
      try {
        const [{ data: p }, { data: it }] = await Promise.all([
          supabase.from('bagy_pedidos')
            .select('id, bagy_order_id, numero_bagy, cliente_nome, cliente_whats')
            .eq('id', current.pedidoId).maybeSingle(),
          supabase.from('bagy_pedido_itens')
            .select('id, sku, tamanho, quantidade, foto_url, template_id')
            .eq('id', current.itemId).maybeSingle(),
        ]);
        if (cancel) return;
        if (!p || !it) { advance(false, 'Item Bagy não encontrado.'); return; }
        if (!it.template_id) { advance(false, 'Item sem template (SKU não mapeado).'); return; }

        // foto + tamanho: tenta override pelo template
        let fotoUrl: string | null = it.foto_url;
        let tamanho: string | null = it.tamanho || null;
        try {
          const { data: tpl } = await supabase
            .from('order_templates')
            .select('foto_url, tamanhos_skus')
            .eq('id', it.template_id).maybeSingle();
          if (tpl?.foto_url) fotoUrl = tpl.foto_url;
          const arr = (tpl?.tamanhos_skus as any[]) || [];
          if (it.sku && (!tamanho || tamanho.trim() === '')) {
            const m = arr.find((x: any) => (x?.sku || '').trim().toLowerCase() === it.sku!.trim().toLowerCase());
            if (m?.tamanho) tamanho = m.tamanho;
          }
        } catch { /* segue */ }

        setResolved({
          templateId: it.template_id,
          numero: `RC-${p.numero_bagy}`,
          cliente: p.cliente_nome || '',
          whatsapp: p.cliente_whats || '',
          tamanho: tamanho || '',
          fotoUrl,
          bagyPedidoId: p.id,
          bagyItemId: it.id,
          bagyOrderId: p.bagy_order_id,
          quantidade: it.quantidade || 1,
        });
        setMountKey(k => k + 1);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx]);

  const finishFlow = (didSaveLast: boolean) => {
    const final = { saved: saved + (didSaveLast ? 1 : 0), skipped };
    onFinished?.(final);
    onClose();
  };

  const advance = (didSave: boolean, skipMsg?: string) => {
    if (didSave) setSaved(s => s + 1);
    else { setSkipped(s => s + 1); if (skipMsg) toast.info(skipMsg); }
    const next = idx + 1;
    if (next >= queue.length) {
      // fim
      const final = { saved: saved + (didSave ? 1 : 0), skipped: skipped + (didSave ? 0 : 1) };
      onFinished?.(final);
      onClose();
    } else {
      setIdx(next);
    }
  };

  if (!open) return null;
  const total = queue.length;
  const current = idx + 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finishFlow(false); }}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-sm">
              Gerar ficha {total > 1 && <span className="text-muted-foreground">— {current}/{total}</span>}
            </span>
            {resolved && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {resolved.numero} · {resolved.cliente || '—'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {total > 1 && idx < total - 1 && (
              <Button size="sm" variant="ghost" onClick={() => advance(false, 'Pulado.')}>
                <SkipForward size={14} className="mr-1" /> Pular este
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => finishFlow(false)}>
              <X size={14} className="mr-1" /> {total > 1 ? 'Cancelar fila' : 'Fechar'}
            </Button>
          </div>
        </div>

        <div className="px-1 py-1">
          {loading || !resolved ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" /> Carregando ficha...
            </div>
          ) : (
            <OrderPage
              key={mountKey}
              embedded
              bagyPrefillOverride={resolved}
              autoShowMirror
              finalizeBadge={total > 1 ? `(${current}/${total})` : undefined}
              onBagySaved={() => advance(true)}
              onBagyCancel={() => advance(false, 'Pulado.')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
