import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { getDriveFileId, isDriveUrl, toDriveImageUrl } from '@/lib/driveUrl';

export interface EtiquetaItem {
  nome: string;
  tamanho: string;
  fotoUrl?: string | null;
  numero?: string | null;
  /** true quando nenhum produto de estoque foi encontrado para o pedido */
  produtoNaoEncontrado?: boolean;
  /** true quando o texto casou com mais de um produto e foi escolhido o primeiro */
  ambiguo?: boolean;
}

export interface EtiquetaOrderInput {
  id: string;
  numero?: string | null;
  tamanho?: string | null;
  estoqueProdutoId?: string | null;
  nomeProdutoEstoque?: string | null;
  skuEstoque?: string | null;
}

/** Normaliza texto: minúsculas, sem acentos, sem pontuação, espaços colapsados. */
function norm(s: string | null | undefined): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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

type Produto = { id: string; nome: string; tamanho: string; foto_url: string | null; sku_base: string | null };

/** Resolve nome/tamanho/foto dos pedidos selecionados a partir do estoque (busca tolerante). */
export async function resolveEtiquetaItems(orders: EtiquetaOrderInput[]): Promise<EtiquetaItem[]> {
  const ids = Array.from(new Set(orders.map(o => o.estoqueProdutoId).filter(Boolean))) as string[];
  const byId = new Map<string, Produto>();
  if (ids.length > 0) {
    const { data } = await supabase
      .from('estoque_produtos')
      .select('id, nome, tamanho, foto_url, sku_base')
      .in('id', ids);
    (data || []).forEach((p: any) => byId.set(p.id, p as Produto));
  }

  // Candidatos para os pedidos sem vínculo direto: por SKU e por prefixo do nome
  const semVinculo = orders.filter(o => !o.estoqueProdutoId && ((o.nomeProdutoEstoque || '').trim() || (o.skuEstoque || '').trim()));
  const candidatos: Produto[] = [];
  if (semVinculo.length > 0) {
    const skus = Array.from(new Set(semVinculo.map(o => (o.skuEstoque || '').trim()).filter(Boolean)));
    const nomes = Array.from(new Set(semVinculo.map(o => (o.nomeProdutoEstoque || '').trim()).filter(Boolean)));

    const queries: Promise<any>[] = [];
    if (skus.length > 0) {
      queries.push(
        supabase.from('estoque_produtos').select('id, nome, tamanho, foto_url, sku_base').in('sku_base', skus),
      );
    }
    nomes.forEach(n => {
      // Busca ampla por palavras iniciais do nome; o casamento fino é feito em memória
      const termo = n.split(/\s+/).slice(0, 2).join(' ');
      queries.push(
        supabase.from('estoque_produtos').select('id, nome, tamanho, foto_url, sku_base').ilike('nome', `%${termo}%`).limit(200),
      );
      queries.push(
        supabase.from('estoque_produtos').select('id, nome, tamanho, foto_url, sku_base').in('nome', [n]),
      );
    });

    const results = await Promise.all(queries);
    const seen = new Set<string>();
    results.forEach((r: any) => {
      (r?.data || []).forEach((p: Produto) => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          candidatos.push(p);
        }
      });
    });
  }

  const matchProduto = (o: EtiquetaOrderInput): { prod?: Produto; ambiguo?: boolean } => {
    const skuN = norm(o.skuEstoque);
    const nomeN = norm(o.nomeProdutoEstoque);
    const tam = String(o.tamanho || '').trim();

    if (skuN) {
      const porSku = candidatos.filter(p => norm(p.sku_base) === skuN);
      if (porSku.length > 0) return { prod: porSku[0] };
    }
    if (!nomeN) return {};

    const pick = (lista: Produto[]) => {
      if (lista.length === 0) return undefined;
      const mesmoTam = lista.filter(p => String(p.tamanho || '').trim() === tam);
      const base = mesmoTam.length > 0 ? mesmoTam : lista;
      const comFoto = base.filter(p => p.foto_url);
      const alvo = comFoto.length > 0 ? comFoto : base;
      return [...alvo].sort((a, b) => a.nome.localeCompare(b.nome))[0];
    };

    const exatos = candidatos.filter(p => norm(p.nome) === nomeN);
    if (exatos.length > 0) return { prod: pick(exatos) };

    const prefixo = candidatos.filter(p => norm(p.nome).startsWith(nomeN));
    if (prefixo.length > 0) {
      const nomesUnicos = new Set(prefixo.map(p => norm(p.nome)));
      return { prod: pick(prefixo), ambiguo: nomesUnicos.size > 1 };
    }

    const contem = candidatos.filter(p => norm(p.nome).includes(nomeN) || nomeN.includes(norm(p.nome)));
    if (contem.length > 0) {
      const nomesUnicos = new Set(contem.map(p => norm(p.nome)));
      return { prod: pick(contem), ambiguo: nomesUnicos.size > 1 };
    }

    return {};
  };

  return orders.map(o => {
    const direto = o.estoqueProdutoId ? byId.get(o.estoqueProdutoId) : undefined;
    const { prod, ambiguo } = direto ? { prod: direto, ambiguo: false } : matchProduto(o);
    return {
      nome: (prod?.nome || o.nomeProdutoEstoque || o.skuEstoque || '').trim(),
      tamanho: String(o.tamanho || prod?.tamanho || '').trim(),
      fotoUrl: prod?.foto_url || null,
      numero: o.numero || null,
      produtoNaoEncontrado: !prod,
      ambiguo: Boolean(ambiguo),
    };
  });
}

export interface EtiquetaResultado {
  fotosCarregadas: number;
  fotosComFalha: number;
  semFoto: { numero: string; motivo: 'produto-nao-encontrado' | 'foto-nao-carregou' }[];
  ambiguos: string[];
}

/**
 * Gera PDF A4 de etiquetas: 4 colunas (foto, texto, foto, texto) x 5 linhas = 10 etiquetas/página.
 */
export async function gerarEtiquetasPDF(items: EtiquetaItem[], fileName = 'Etiquetas.pdf'): Promise<EtiquetaResultado> {
  if (items.length === 0) return { fotosCarregadas: 0, fotosComFalha: 0, semFoto: [], ambiguos: [] };

  // Cache de imagens por URL (pedidos da mesma grade reaproveitam a foto)
  type Img = { dataUrl: string; w: number; h: number };
  const cache = new Map<string, Img | null>();
  const urls = Array.from(new Set(items.map(i => i.fotoUrl).filter(Boolean))) as string[];
  await Promise.all(
    urls.map(async u => {
      cache.set(u, await urlToDataUrl(u));
    }),
  );

  const semFoto: EtiquetaResultado['semFoto'] = [];
  items.forEach(item => {
    const ok = item.fotoUrl && cache.get(item.fotoUrl);
    if (!ok) {
      semFoto.push({
        numero: item.numero || item.nome || '—',
        motivo: item.fotoUrl ? 'foto-nao-carregou' : 'produto-nao-encontrado',
      });
    }
  });
  const fotosCarregadas = items.length - semFoto.length;
  const fotosComFalha = semFoto.length;
  const ambiguos = items.filter(i => i.ambiguo).map(i => i.numero || i.nome);

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
  return { fotosCarregadas, fotosComFalha, semFoto, ambiguos };
}
