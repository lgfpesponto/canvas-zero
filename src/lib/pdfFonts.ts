import type jsPDF from 'jspdf';
import regularUrl from '@/assets/fonts/Montserrat-Regular.ttf?url';
import boldUrl from '@/assets/fonts/Montserrat-Bold.ttf?url';

let regularB64: string | null = null;
let boldB64: string | null = null;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result = "data:...;base64,XXXX"
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar fonte: ${res.status}`);
  const blob = await res.blob();
  if (blob.size < 1000) throw new Error(`Fonte vazia/inválida (${blob.size} bytes)`);
  return blobToBase64(blob);
}

/** Registers Montserrat (normal + bold) into the given jsPDF doc and sets it as active font. */
export async function registerMontserrat(doc: jsPDF) {
  if (!regularB64) regularB64 = await fetchAsBase64(regularUrl);
  if (!boldB64) boldB64 = await fetchAsBase64(boldUrl);
  (doc as any).addFileToVFS('Montserrat-Regular.ttf', regularB64);
  (doc as any).addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
  (doc as any).addFileToVFS('Montserrat-Bold.ttf', boldB64);
  (doc as any).addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
  doc.setFont('Montserrat', 'normal');
}
