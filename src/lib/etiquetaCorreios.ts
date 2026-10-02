import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { supabase } from '@/integrations/supabase/client';
import { imageAsDataUrl } from '@/lib/fiscal/danfePdf';

const CONTRATO_CHANCELA = '9912514254/2020-DR/SPI';
const clean = (v: unknown) => String(v ?? '').trim();
const dig = (v: unknown) => clean(v).replace(/\D/g, '');

function barcode(value: string) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, { format: 'CODE128', width: 3, height: 120, displayValue: false, margin: 0 });
  return canvas.toDataURL('image/png');
}

function nomeServico(s?: string | null) {
  const v = clean(s).toUpperCase();
  if (v === 'SEDEX') return 'SEDEX';
  if (v === 'MINI') return 'MINI ENVIOS';
  return 'PAC';
}

let cfgCache: { cfg: any; logo?: string } | null = null;
async function carregarConfig() {
  if (cfgCache) return cfgCache;
  const { data: cfg } = await supabase.from('nfe_config').select('*').order('created_at').limit(1).single();
  const logo = cfg?.logo_path ? await imageAsDataUrl(cfg.logo_path, false).catch(() => undefined) : undefined;
  cfgCache = { cfg: cfg || {}, logo };
  return cfgCache;
}

/** Desenha a etiqueta dos Correios em 100x150 mm (mesmo tamanho da DANFE Simplificada), no modelo do Bling. */
export async function desenharEtiquetaCorreios(pedidoId: string): Promise<ArrayBuffer | null> {
  const { data: p } = await supabase.from('bagy_pedidos').select('*').eq('id', pedidoId).maybeSingle();
  const ped: any = p;
  if (!ped?.tracking_code || ped.envio_provider !== 'correios') return null;
  const { data: nota } = await supabase.from('nfe_notas').select('numero').eq('bagy_pedido_id', pedidoId)
    .eq('tipo_nota', 'normal').eq('status', 'autorizada').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const { cfg, logo } = await carregarConfig();
  const e = ped.endereco || {};
  const cep = dig(e.cep || e.zipcode);
  const rua = [e.logradouro || e.street || e.rua, e.numero || e.number || 'S/N'].filter(Boolean).join(', ');
  const compl = e.complemento || e.complement || e.detail || '';
  const linha2 = [compl, e.bairro || e.district || e.neighborhood, cep && cep.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3'),
    `${e.cidade || e.city || ''} (${e.uf || e.state || ''})`].filter(Boolean).join(' - ');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
  const x = 5, w = 90;
  // Logo da loja
  if (logo) doc.addImage(logo, 'PNG', x, 5, 26, 26, undefined, 'FAST');
  // Chancela Correios
  const cx = 44, cw = 51;
  doc.setLineWidth(0.5); doc.roundedRect(cx, 4, cw, 28, 2, 2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(nomeServico(ped.envio_servico), cx + cw / 2, 13, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.text(CONTRATO_CHANCELA, cx + cw / 2, 18, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize(clean(cfg.razao_social).toUpperCase(), cw - 6) as string[], cx + cw / 2, 21.5, { align: 'center' });
  doc.setFillColor(255, 255, 255); doc.rect(cx + 14, 30.5, cw - 28, 3, 'F');
  doc.setFontSize(8); doc.text('Correios', cx + cw / 2, 32.8, { align: 'center' });
  // Rastreio
  const track = clean(ped.tracking_code).toUpperCase();
  doc.addImage(barcode(track), 'PNG', x, 36, w, 26, undefined, 'FAST');
  doc.setFontSize(11); doc.text(track, 50, 67, { align: 'center' });
  // Destinatário
  let y = 73;
  doc.setFontSize(9); doc.text(`Destinatário - ${new Date().toLocaleDateString('pt-BR')}`, x, y); y += 4.5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  for (const t of [clean(ped.cliente_nome), rua, linha2]) {
    const lines = doc.splitTextToSize(t, w) as string[]; doc.text(lines, x, y); y += lines.length * 4;
  }
  // CEP + dados do pedido
  y += 1;
  if (cep.length === 8) doc.addImage(barcode(cep), 'PNG', x, y, 46, 24, undefined, 'FAST');
  let ty = y + 3.5;
  const info = (label: string, val: string) => {
    doc.setFont('helvetica', 'normal'); doc.text(label, 54, ty);
    doc.setFont('helvetica', 'bold'); doc.text(val, 54 + doc.getTextWidth(label) + 1, ty); ty += 4.5;
  };
  doc.setFontSize(8.5);
  info('Pedido:', `RC-${ped.numero_bagy}`);
  if (nota?.numero) info('Nota Fiscal:', String(nota.numero).padStart(6, '0'));
  info('Loja:', 'Site Bagy');
  y += 28;
  // Remetente
  doc.setFontSize(8.5);
  const rem = `${clean(cfg.razao_social).toUpperCase()} - ${clean(cfg.logradouro)}, ${clean(cfg.numero)}${cfg.complemento ? ` (${clean(cfg.complemento)})` : ''} - ${clean(cfg.bairro)} - ${dig(cfg.cep)} - ${clean(cfg.municipio)} (${clean(cfg.uf)})`;
  doc.setFont('helvetica', 'bold'); doc.text('Remetente:', x, y);
  doc.setFont('helvetica', 'normal');
  const rl = doc.splitTextToSize(' '.repeat(22) + rem, w) as string[]; doc.text(rl, x, y);
  return doc.output('arraybuffer');
}

/** Etiqueta pronta para impressão térmica: Correios no modelo próprio; Melhor Envio usa o PDF da transportadora encaixado em 100x150. */
export async function etiquetaTermica(pedidoId: string, path: string | null): Promise<ArrayBuffer | null> {
  const propria = await desenharEtiquetaCorreios(pedidoId);
  if (propria) return propria;
  if (!path) return null;
  const { data } = await supabase.storage.from('etiquetas-envio').download(path);
  if (!data) return null;
  const { PDFDocument } = await import('pdf-lib');
  const src = await PDFDocument.load(await data.arrayBuffer());
  const out = await PDFDocument.create();
  const W = 283.46, H = 425.2; // 100x150 mm
  for (const pg of src.getPages()) {
    const emb = await out.embedPage(pg);
    const s = Math.min(W / emb.width, H / emb.height);
    out.addPage([W, H]).drawPage(emb, { x: (W - emb.width * s) / 2, y: H - emb.height * s, xScale: s, yScale: s });
  }
  const b = await out.save();
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
