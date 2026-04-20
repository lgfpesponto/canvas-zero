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

export async function openPdf(path: string) {
  const { data, error } = await supabase.storage.from('financeiro').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    alert('Não foi possível abrir o arquivo.');
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export async function deletePdf(path: string) {
  await supabase.storage.from('financeiro').remove([path]);
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
