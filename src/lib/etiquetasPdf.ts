import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { getDriveFileId, isDriveUrl, toDriveImageUrl } from '@/lib/driveUrl';

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
  const driveId = isDriveUrl(url) ? getDriveFileId(url) : null;
  const directDriveUrl = isDriveUrl(url) ? toDriveImageUrl(url) : null;
  const candidates = Array.from(new Set([
    directDriveUrl,
    driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600` : null,
    isDriveUrl(url) ? null : url,
  ].filter((candidate): candidate is string => Boolean(candidate))));

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { mode: 'cors', referrerPolicy: 'no-referrer' });
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) continue;

      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close?.();
        continue;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height };
    } catch {
      // Tenta a próxima forma de acesso à mesma imagem.
    }
  }

  return null;
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
  if (items.length === 0) return { fotosCarregadas: 0, fotosComFalha: 0 };

  // Cache de imagens por URL (pedidos da mesma grade reaproveitam a foto)
  type Img = { dataUrl: string; w: number; h: number };
  const cache = new Map<string, Img | null>();
  const urls = Array.from(new Set(items.map(i => i.fotoUrl).filter(Boolean))) as string[];
  await Promise.all(
    urls.map(async u => {
      cache.set(u, await urlToDataUrl(u));
    }),
  );

  const itemsComFoto = items.filter(item => Boolean(item.fotoUrl));
  const fotosCarregadas = itemsComFoto.filter(item => item.fotoUrl && cache.get(item.fotoUrl)).length;
  const fotosComFalha = items.length - fotosCarregadas;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const marginX = 6;
  const marginY = 6;
  const gridCols = 4; // foto | texto | foto | texto
  const rows = 5;
  const perPage = 2 * rows; // 2 etiquetas por linha
  const cellW = (pageW - marginX * 2) / gridCols;
  const cellH = (pageH - marginY * 2) / rows;

  const totalPages = Math.ceil(items.length / perPage);
  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();

    const pageItems = items.slice(p * perPage, (p + 1) * perPage);
    pageItems.forEach((item, i) => {
      const row = Math.floor(i / 2);
      const pair = i % 2; // 0 => colunas 0/1, 1 => colunas 2/3
      const fotoX = marginX + pair * 2 * cellW;
      const textoX = fotoX + cellW;
      const y = marginY + row * cellH;

      // Grade só nas células ocupadas
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(fotoX, y, cellW, cellH);
      doc.rect(textoX, y, cellW, cellH);


      // Foto proporcional, centralizada na célula
      const img = item.fotoUrl ? cache.get(item.fotoUrl) : null;
      if (img) {
        try {
          const maxW = cellW - 4;
          const maxH = cellH - 4;
          const ratio = Math.min(maxW / img.w, maxH / img.h);
          const w = img.w * ratio;
          const h = img.h * ratio;
          doc.addImage(img.dataUrl, 'JPEG', fotoX + (cellW - w) / 2, y + (cellH - h) / 2, w, h, undefined, 'FAST');
        } catch {
          /* ignora foto inválida */
        }
      }

      // Texto (nome em cima, tamanho grande embaixo)
      const tx = textoX + cellW / 2;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      const nomeLines = doc.splitTextToSize(item.nome || '', cellW - 6) as string[];
      const lineH = 7;
      const tamanhoH = 12;
      const totalH = nomeLines.length * lineH + tamanhoH;
      let ty = y + (cellH - totalH) / 2 + lineH * 0.8;
      nomeLines.forEach(l => {
        doc.text(l, tx, ty, { align: 'center' });
        ty += lineH;
      });
      doc.setFontSize(24);
      doc.text(item.tamanho || '', tx, ty + 6, { align: 'center' });
    });
  }

  doc.save(fileName);
  return { fotosCarregadas, fotosComFalha };
}

