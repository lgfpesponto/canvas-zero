import { supabase } from '@/integrations/supabase/client';
import { etiquetaTermica } from '@/lib/etiquetaCorreios';

export const SERVICOS_ENVIO = [
  { value: 'PAC', label: 'Correios PAC (contrato)' },
  { value: 'SEDEX', label: 'Correios SEDEX (contrato)' },
  { value: 'MINI', label: 'Correios Mini Envios (contrato)' },
  { value: 'ME', label: 'Melhor Envio (outras transportadoras)' },
  { value: 'RETIRADA', label: 'Retirada no showroom' },
];

/** Detecta o serviço a partir do método de envio escolhido na Bagy. */
export function detectarServico(metodo?: string | null): string {
  const m = String(metodo ?? '').toLowerCase();
  if (/retir|showroom|loja/.test(m)) return 'RETIRADA';
  if (/sedex/.test(m)) return 'SEDEX';
  if (/mini/.test(m)) return 'MINI';
  if (/pac/.test(m)) return 'PAC';
  if (/jadlog|azul|loggi|latam|j&t|buslog|melhor/.test(m)) return 'ME';
  return 'PAC';
}

export function rotuloServico(s?: string | null) {
  if (!s) return '';
  if (s.startsWith('ME:')) return 'Melhor Envio';
  return SERVICOS_ENVIO.find(x => x.value === s)?.label ?? s;
}

export async function chamarEnvio(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('envio-etiqueta', { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error); } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function urlEtiqueta(path: string) {
  const { data, error } = await supabase.storage.from('etiquetas-envio').createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

/** Para impressão casada: devolve a etiqueta de envio (PDF) de cada nota, quando existir. */
export async function carregarEtiquetasEnvio(notaIds: string[]) {
  const out: Record<string, ArrayBuffer> = {};
  const { data: notas } = await supabase.from('nfe_notas').select('id,bagy_pedido_id').in('id', notaIds);
  const pedIds = (notas ?? []).map((n: any) => n.bagy_pedido_id).filter(Boolean);
  if (!pedIds.length) return out;
  const { data: peds } = await supabase.from('bagy_pedidos').select('id,etiqueta_path' as any).in('id', pedIds);
  const pathPorPed = new Map((peds ?? []).map((p: any) => [p.id, p.etiqueta_path]));
  for (const n of notas ?? []) {
    const pedId = (n as any).bagy_pedido_id;
    const path = pathPorPed.get(pedId);
    if (!path) continue;
    const buf = await etiquetaTermica(pedId, path);
    if (buf) out[(n as any).id] = buf;
  }
  return out;
}

/** Junta as etiquetas de envio dos pedidos (na ordem recebida) num único PDF. */
export async function gerarEtiquetasLoteBlobUrl(bagyPedidoIds: string[]) {
  const { PDFDocument } = await import('pdf-lib');
  const { data: peds } = await supabase.from('bagy_pedidos').select('id,etiqueta_path' as any).in('id', bagyPedidoIds);
  const pathPorPed = new Map((peds ?? []).map((p: any) => [p.id, p.etiqueta_path]));
  const out = await PDFDocument.create();
  for (const id of bagyPedidoIds) {
    const path = pathPorPed.get(id);
    if (!path) continue;
    const buf = await etiquetaTermica(id, path);
    if (!buf) continue;
    const src = await PDFDocument.load(buf);
    (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p));
  }
  if (out.getPageCount() === 0) throw new Error('Nenhuma etiqueta de envio gerada nesses pedidos.');
  const bytes = await out.save();
  return { url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })), filename: `Etiquetas-envio-${bagyPedidoIds.length}.pdf` };
}
