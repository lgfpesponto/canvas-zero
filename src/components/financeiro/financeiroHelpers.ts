import { supabase } from '@/integrations/supabase/client';

export const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB

export function validatePdf(file: File): string | null {
  if (file.type !== 'application/pdf') return 'O arquivo deve ser PDF.';
  if (file.size > MAX_PDF_SIZE) return 'O arquivo deve ter no máximo 5MB.';
  return null;
}

export async function uploadPdf(file: File, folder: 'a-receber' | 'a-pagar'): Promise<string> {
  const ext = 'pdf';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('financeiro').upload(path, file, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function openPdf(path: string) {
  const { data, error } = await supabase.storage.from('financeiro').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    alert('Não foi possível abrir o PDF.');
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
