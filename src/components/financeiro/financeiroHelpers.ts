import { supabase } from '@/integrations/supabase/client';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (PDF ou imagem)
export const MAX_PDF_SIZE = MAX_FILE_SIZE; // mantido por compatibilidade

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export function validateComprovante(file: File): string | null {
  const isAccepted =
    ACCEPTED_TYPES.includes(file.type) ||
    /\.(pdf|jpg|jpeg|png|webp|heic|heif)$/i.test(file.name);
  if (!isAccepted) return 'Aceita apenas PDF ou imagem (JPG, PNG, WEBP).';
  if (file.size > MAX_FILE_SIZE) return 'O arquivo deve ter no máximo 10MB.';
  return null;
}

// Compat: usado em outros lugares que ainda chamam validatePdf
export function validatePdf(file: File): string | null {
  return validateComprovante(file);
}

function extFromFile(file: File): string {
  const byName = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (byName) return byName;
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return file.type.split('/')[1] || 'jpg';
  return 'bin';
}

export async function uploadPdf(file: File, folder: 'a-receber' | 'a-pagar'): Promise<string> {
  const ext = extFromFile(file);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('financeiro').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('financeiro').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function openPdf(path: string) {
  const url = await getSignedUrl(path);
  if (!url) {
    alert('Não foi possível abrir o arquivo.');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Hash SHA-256 do arquivo (hex) — usado para deduplicação de comprovantes
export async function fileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function deletePdf(path: string) {
  await supabase.storage.from('financeiro').remove([path]);
}

/**
 * Substitui um arquivo no Storage: faz upload do novo, depois tenta apagar o antigo.
 * Se o delete do antigo falhar, retorna o novo path mesmo assim (o registro fica consistente).
 */
export async function replaceUploadedFile(
  oldPath: string | null,
  newFile: File,
  folder: 'a-receber' | 'a-pagar'
): Promise<string> {
  const newPath = await uploadPdf(newFile, folder);
  if (oldPath) {
    try {
      await deletePdf(oldPath);
    } catch {
      // silencioso — registro já está atualizado
    }
  }
  return newPath;
}

export function formatDateBR(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ============= Deduplicação de comprovantes =============

export type DupCandidate = {
  itemId: string;
  hash: string | null;
  valor: number;
  data_pagamento: string;
  destinatario: string;
  fileName?: string;
};

export type DupMatch = {
  itemId: string;
  fileName?: string;
  valor: number;
  data_pagamento: string;
  destinatario: string;
  reason: 'hash' | 'triple';
  existingId: string;
  existingDate: string;
};

/**
 * Verifica duplicatas no banco contra uma lista de candidatos.
 * Considera duplicata se: mesmo hash de arquivo OU mesma tripla (valor + data + destinatário).
 */
export async function checkDuplicates(
  table: 'financeiro_a_receber' | 'financeiro_a_pagar',
  candidates: DupCandidate[],
  destinatarioField: 'destinatario' | 'fornecedor' = 'destinatario'
): Promise<DupMatch[]> {
  if (candidates.length === 0) return [];

  const matches: DupMatch[] = [];
  const hashes = candidates.map(c => c.hash).filter(Boolean) as string[];

  // 1) Checagem por hash (uma única query)
  let hashRows: any[] = [];
  if (hashes.length > 0) {
    const { data } = await supabase
      .from(table)
      .select(`id, comprovante_hash, valor, data_pagamento, ${destinatarioField}`)
      .in('comprovante_hash', hashes);
    hashRows = data || [];
  }

  // 2) Checagem por tripla — uma query por candidato (rápido, indexado)
  for (const c of candidates) {
    // hash match (prioritário)
    if (c.hash) {
      const hit = hashRows.find(r => r.comprovante_hash === c.hash);
      if (hit) {
        matches.push({
          itemId: c.itemId,
          fileName: c.fileName,
          valor: c.valor,
          data_pagamento: c.data_pagamento,
          destinatario: c.destinatario,
          reason: 'hash',
          existingId: hit.id,
          existingDate: hit.data_pagamento,
        });
        continue;
      }
    }

    // tripla
    const { data: tripleHits } = await supabase
      .from(table)
      .select(`id, data_pagamento`)
      .eq('valor', c.valor)
      .eq('data_pagamento', c.data_pagamento)
      .ilike(destinatarioField, c.destinatario.trim())
      .limit(1);

    if (tripleHits && tripleHits.length > 0) {
      matches.push({
        itemId: c.itemId,
        fileName: c.fileName,
        valor: c.valor,
        data_pagamento: c.data_pagamento,
        destinatario: c.destinatario,
        reason: 'triple',
        existingId: tripleHits[0].id,
        existingDate: tripleHits[0].data_pagamento,
      });
    }
  }

  return matches;
}

export async function fetchVendedoresList(): Promise<string[]> {
  const { data } = await supabase.from('orders').select('vendedor, cliente');
  const names = new Set<string>();
  (data || []).forEach((o: any) => {
    if (o.vendedor) names.add(o.vendedor);
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
      names.add(o.cliente.trim());
    }
  });
  return [...names].sort();
}
