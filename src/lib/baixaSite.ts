import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatBrasiliaDate, formatBrasiliaTime } from '@/lib/utils';

export const BAIXA_SITE = 'Baixa Site (Despachado)';
const ETAPAS_LIBERADAS = ['Baixa Montagem', 'Revisão', 'Expedição'];

/**
 * Ao autorizar a NF-e de um pedido Bagy, move os pedidos vinculados em "Meus Pedidos"
 * para "Baixa Site (Despachado)" — só se estiverem em Baixa Montagem, Revisão ou Expedição.
 * Os demais ficam onde estão e geram um aviso.
 */
export async function avancarBaixaSite(bagyPedidoId: string) {
  try {
    const { data: bp } = await supabase.from('bagy_pedidos')
      .select('bagy_order_id,numero_bagy,order_id_portal').eq('id', bagyPedidoId).maybeSingle();
    if (!bp) return;
    const ids = new Set<string>();
    if (bp.order_id_portal) ids.add(bp.order_id_portal);
    const { data: itens } = await supabase.from('bagy_pedido_itens').select('order_id_portal').eq('pedido_id', bagyPedidoId);
    (itens || []).forEach((i: any) => i.order_id_portal && ids.add(i.order_id_portal));
    const cols = 'id,numero,status,historico';
    const encontrados = new Map<string, any>();
    const { data: porBagy } = await supabase.from('orders').select(cols).eq('bagy_order_id', bp.bagy_order_id);
    (porBagy || []).forEach((o: any) => encontrados.set(o.id, o));
    const num = String(bp.numero_bagy || '').replace(/\D/g, '');
    if (num) {
      const { data: porNum } = await supabase.from('orders').select(cols).ilike('numero', `%${num}%`);
      (porNum || []).forEach((o: any) => {
        // Só aceita o número exato (não confunde com números maiores)
        if ((String(o.numero).match(/\d+/g) || []).includes(num)) encontrados.set(o.id, o);
      });
    }
    const faltando = [...ids].filter(id => !encontrados.has(id));
    if (faltando.length) {
      const { data } = await supabase.from('orders').select(cols).in('id', faltando);
      (data || []).forEach((o: any) => encontrados.set(o.id, o));
    }
    const pedidos = [...encontrados.values()].filter(o => o.status !== BAIXA_SITE && o.status !== 'Cancelado');
    if (!pedidos.length) return;

    const bloqueados: string[] = [];
    let movidos = 0;
    for (const o of pedidos) {
      if (!ETAPAS_LIBERADAS.includes(o.status)) { bloqueados.push(`${o.numero} (${o.status})`); continue; }
      const historico = [...((o.historico as any[]) || []), {
        data: formatBrasiliaDate(), hora: formatBrasiliaTime(), local: BAIXA_SITE,
        descricao: `Pedido movido para ${BAIXA_SITE}`, observacao: 'Automático: NF-e autorizada (Rancho Chique)', usuario: 'Rancho Chique (NF-e)',
      }];
      const { error } = await supabase.from('orders').update({ status: BAIXA_SITE, historico } as any).eq('id', o.id);
      if (error) bloqueados.push(`${o.numero} (erro: ${error.message})`); else movidos++;
    }
    if (movidos) toast.success(`${movidos} pedido(s) movido(s) para ${BAIXA_SITE} (RC-${bp.numero_bagy}).`);
    if (bloqueados.length) toast.warning(
      `RC-${bp.numero_bagy}: não foi para ${BAIXA_SITE} — precisa estar em Baixa Montagem, Revisão ou Expedição: ${bloqueados.join(', ')}`,
      { duration: 12000 },
    );
  } catch (e) { console.warn('Baixa Site automática:', e); }
}
