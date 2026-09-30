import { supabase } from '@/integrations/supabase/client';
import { montarXmlNfe } from './montarXmlNfe';

export interface ProxyResposta {
  cStat?: string | number;
  xMotivo?: string;
  chave?: string;
  protocolo?: string;
  nProt?: string;
  xml?: string;
  xmlAutorizado?: string;
  error?: string;
  [k: string]: unknown;
}

export async function chamar(acao: 'autorizar' | 'evento' | 'status', payload: Record<string, unknown>): Promise<ProxyResposta> {
  const { data, error } = await supabase.functions.invoke('nfe-proxy', { body: { acao, payload } });
  if (error) {
    let msg = error.message;
    try {
      const ctx: any = (error as any).context;
      const b = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
      if (b?.error) msg = typeof b.error === 'string' ? b.error : JSON.stringify(b.error);
      else if (b?.xMotivo) msg = b.xMotivo;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data as ProxyResposta;
}

export class ProxyProvider {
  async transmitir(pedidoId: string, destinatarioId: string, cfop?: string) {
    const m = await montarXmlNfe(pedidoId, destinatarioId, cfop);
    const { data: nota, error } = await supabase.from('nfe_notas').insert({
      pedido_id: pedidoId, destinatario_id: destinatarioId, numero: m.numero, serie: m.serie, modelo: 55,
      chave_acesso: m.chave, ambiente: m.ambiente, status: 'processando', natureza_operacao: 'VENDA DE MERCADORIA',
      valor_produtos: m.valorTotal, valor_total: m.valorTotal, destinatario_snapshot: m.destinatario,
    } as any).select().single();
    if (error) throw new Error(error.message);
    await supabase.from('nfe_itens').insert({
      nota_id: nota.id, ordem: 1, codigo: m.item.codigo, descricao: m.item.descricao, ncm: m.item.ncm, cfop: m.item.cfop,
      unidade: m.item.unidade, quantidade: m.item.quantidade, valor_unitario: m.item.valorUnit, valor_total: m.item.valorTotal,
      origem_mercadoria: m.item.origem, cst_icms: m.item.csosn, cst_pis: '99', cst_cofins: '99',
    } as any);

    let r: ProxyResposta;
    try {
      r = await chamar('autorizar', { xml: m.xml, chave: m.chave });
    } catch (e: any) {
      await supabase.from('nfe_notas').update({ status: 'erro', motivo_rejeicao: e.message } as any).eq('id', nota.id);
      throw e;
    }
    const cStat = String(r.cStat ?? '');
    const autorizada = cStat === '100' || cStat === '150';
    await supabase.from('nfe_notas').update({
      status: autorizada ? 'autorizada' : 'rejeitada',
      protocolo: (r.protocolo ?? r.nProt ?? null) as any,
      data_autorizacao: autorizada ? new Date().toISOString() : null,
      motivo_rejeicao: autorizada ? null : `${cStat} - ${r.xMotivo ?? r.error ?? 'Sem retorno'}`,
      xml_assinado: (r.xml ?? null) as any,
      xml_autorizado: (r.xmlAutorizado ?? null) as any,
    } as any).eq('id', nota.id);
    return { notaId: nota.id, autorizada, cStat, xMotivo: r.xMotivo, chave: m.chave };
  }

  private async evento(notaId: string, tipo: 'cancelamento' | 'carta_correcao', justificativa: string) {
    const { data: nota } = await supabase.from('nfe_notas').select('*').eq('id', notaId).single();
    if (!nota?.chave_acesso) throw new Error('Nota sem chave de acesso.');
    const r = await chamar('evento', {
      tipo, chave: nota.chave_acesso, protocolo: nota.protocolo, justificativa, correcao: justificativa,
    });
    const cStat = String(r.cStat ?? '');
    const ok = ['135', '136', '155'].includes(cStat);
    await supabase.from('nfe_eventos').insert({
      nota_id: notaId, tipo, status: ok ? 'registrado' : 'rejeitado', protocolo: (r.protocolo ?? r.nProt ?? null) as any,
      justificativa, xml: (r.xml ?? null) as any, payload: r as any,
    } as any);
    if (ok && tipo === 'cancelamento') await supabase.from('nfe_notas').update({ status: 'cancelada' } as any).eq('id', notaId);
    if (!ok) throw new Error(`${cStat} - ${r.xMotivo ?? r.error ?? 'Evento rejeitado'}`);
    return r;
  }

  cancelar(notaId: string, justificativa: string) { return this.evento(notaId, 'cancelamento', justificativa); }
  cartaCorrecao(notaId: string, correcao: string) { return this.evento(notaId, 'carta_correcao', correcao); }
  consultarStatusServico() { return chamar('status', {}); }
}
