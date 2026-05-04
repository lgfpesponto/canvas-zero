import type jsPDF from 'jspdf';
import regularUrl from '@/assets/fonts/Montserrat-Regular.ttf?url';
import boldUrl from '@/assets/fonts/Montserrat-Bold.ttf?url';

let regularB64: string | null = null;
let boldB64: string | null = null;

async function fetchAsBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(bin);
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
