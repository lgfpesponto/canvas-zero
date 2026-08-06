import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export interface EtiquetaItem {
  nome: string;
  tamanho: string;
  fotoUrl?: string | null;
}

export interface EtiquetaOrderInput {
  id: string;
  tamanho?: string | null;
  estoqueProdutoId?: string | null;
  nomeProdutoEstoque?: string | null;
  skuEstoque?: string | null;
}

/** Converte uma URL de imagem em dataURL JPEG (via canvas, resolve WEBP/PNG transparente). */
async function urlToDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}


/** Resolve nome/tamanho/foto dos pedidos selecionados a partir do estoque. */
export async function resolveEtiquetaItems(orders: EtiquetaOrderInput[]): Promise<EtiquetaItem[]> {
  const ids = Array.from(new Set(orders.map(o => o.estoqueProdutoId).filter(Boolean))) as string[];
  const byId = new Map<string, { nome: string; tamanho: string; foto_url: string | null }>();
  if (ids.length > 0) {
    const { data } = await supabase
      .from('estoque_produtos')
      .select('id, nome, tamanho, foto_url')
      .in('id', ids);
    (data || []).forEach((p: any) => byId.set(p.id, { nome: p.nome, tamanho: p.tamanho, foto_url: p.foto_url }));
  }

  // Fallback por nome + tamanho para pedidos sem vínculo direto
  const semVinculo = orders.filter(o => !o.estoqueProdutoId && (o.nomeProdutoEstoque || '').trim());
  const byNome = new Map<string, { nome: string; tamanho: string; foto_url: string | null }>();
  if (semVinculo.length > 0) {
    const nomes = Array.from(new Set(semVinculo.map(o => (o.nomeProdutoEstoque || '').trim())));
    const { data } = await supabase
      .from('estoque_produtos')
      .select('nome, tamanho, foto_url')
      .in('nome', nomes);
    (data || []).forEach((p: any) => {
      byNome.set(`${p.nome}__${p.tamanho}`, { nome: p.nome, tamanho: p.tamanho, foto_url: p.foto_url });
      if (p.foto_url && !byNome.has(p.nome)) byNome.set(p.nome, { nome: p.nome, tamanho: p.tamanho, foto_url: p.foto_url });
    });
  }

  return orders.map(o => {
    const prod =
      (o.estoqueProdutoId ? byId.get(o.estoqueProdutoId) : undefined) ||
      byNome.get(`${(o.nomeProdutoEstoque || '').trim()}__${o.tamanho || ''}`) ||
      byNome.get((o.nomeProdutoEstoque || '').trim());
    return {
      nome: (prod?.nome || o.nomeProdutoEstoque || o.skuEstoque || '').trim(),
      tamanho: String(o.tamanho || prod?.tamanho || '').trim(),
      fotoUrl: prod?.foto_url || null,
    };
  });
}

/**
 * Gera PDF A4 de etiquetas: 4 colunas (foto, texto, foto, texto) x 5 linhas = 10 etiquetas/página.
 */
export async function gerarEtiquetasPDF(items: EtiquetaItem[], fileName = 'Etiquetas.pdf') {
  if (items.length === 0) return;

  // Cache de imagens por URL (pedidos da mesma grade reaproveitam a foto)
  const cache = new Map<string, string | null>();
  const urls = Array.from(new Set(items.map(i => i.fotoUrl).filter(Boolean))) as string[];
  await Promise.all(
    urls.map(async u => {
      cache.set(u, await urlToDataUrl(u));
    }),
  );

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const marginX = 6;
  const marginY = 6;
  const cols = 2; // cada "coluna" = par foto + texto
  const rows = 5;
  const perPage = cols * rows;
  const blockW = (pageW - marginX * 2) / cols; // ~99mm
  const blockH = (pageH - marginY * 2) / rows; // ~57mm
  const photoW = blockW * 0.5;
  const textW = blockW - photoW;

  items.forEach((item, idx) => {
    if (idx > 0 && idx % perPage === 0) doc.addPage();
    const posInPage = idx % perPage;
    const col = posInPage % cols;
    const row = Math.floor(posInPage / cols);
    const x = marginX + col * blockW;
    const y = marginY + row * blockH;

    // Fundo branco da etiqueta
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, blockW, blockH, 'F');

    // Foto (quadrada, centralizada na metade esquerda)
    const dataUrl = item.fotoUrl ? cache.get(item.fotoUrl) : null;
    const side = Math.min(photoW - 4, blockH - 4);
    const ix = x + (photoW - side) / 2;
    const iy = y + (blockH - side) / 2;
    if (dataUrl) {
      try {
        const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : dataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
        doc.addImage(dataUrl, fmt, ix, iy, side, side, undefined, 'FAST');
      } catch {
        /* ignora foto inválida */
      }
    }

    // Texto (nome em cima, tamanho grande embaixo)
    const tx = x + photoW + textW / 2;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    const nomeLines = doc.splitTextToSize(item.nome || '', textW - 6) as string[];
    const lineH = 8;
    const tamanhoH = 14;
    const totalH = nomeLines.length * lineH + tamanhoH;
    let ty = y + (blockH - totalH) / 2 + lineH * 0.8;
    nomeLines.forEach(l => {
      doc.text(l, tx, ty, { align: 'center' });
      ty += lineH;
    });
    doc.setFontSize(26);
    doc.text(item.tamanho || '', tx, ty + 6, { align: 'center' });
  });

  doc.save(fileName);
}
