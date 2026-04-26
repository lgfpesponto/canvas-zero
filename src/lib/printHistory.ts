/**
 * Print history recorder.
 *
 * Records that one or more orders were included in a generated PDF
 * (Ficha de Produção or any specialized report). Each order receives
 * an entry appended to its `impressoes` jsonb column.
 *
 * Fail-silent: errors are logged to console but never thrown — the
 * PDF is already saved on the user's disk by the time we record.
 */
import { supabase } from '@/integrations/supabase/client';
import { formatBrasiliaDate, formatBrasiliaTime } from '@/contexts/AuthContext';

export interface PrintHistoryEntry {
  tipo: string;
  data: string;          // YYYY-MM-DD (Brasília)
  hora: string;          // HH:mm (Brasília)
  usuario: string;
  total_pedidos: number; // 1 for individual ficha, N for batch reports
}

/**
 * Append a print history entry to each given order.
 */
export async function recordPrintHistory(
  orderIds: string[],
  tipo: string,
  usuario: string,
): Promise<void> {
  try {
    const ids = (orderIds || []).filter(Boolean);
    if (ids.length === 0) return;

    const entry: PrintHistoryEntry = {
      tipo,
      data: formatBrasiliaDate(),
      hora: formatBrasiliaTime(),
      usuario: usuario || 'Desconhecido',
      total_pedidos: ids.length,
    };

    // Fetch current arrays
    const { data: rows, error } = await supabase
      .from('orders')
      .select('id, impressoes')
      .in('id', ids);

    if (error || !rows) {
      console.warn('[printHistory] failed to fetch orders:', error);
      return;
    }

    // Update each order in parallel
    await Promise.all(
      rows.map(async (row: any) => {
        const arr = Array.isArray(row.impressoes) ? row.impressoes : [];
        const updated = [...arr, entry];
        const { error: updErr } = await supabase
          .from('orders')
          .update({ impressoes: updated as any })
          .eq('id', row.id);
        if (updErr) console.warn('[printHistory] update failed', row.id, updErr);
      }),
    );
  } catch (e) {
    console.warn('[printHistory] unexpected error:', e);
  }
}
