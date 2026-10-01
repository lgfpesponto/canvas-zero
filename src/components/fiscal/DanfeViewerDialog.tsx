import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Download } from 'lucide-react';
import { gerarDanfeBlobUrl, gerarDanfeLoteBlobUrl } from '@/lib/fiscal/danfePdf';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Mostra o DANFE dentro do portal (páginas desenhadas como imagem), com Imprimir e Baixar. */
export function DanfeViewerDialog({ notaId, notaIds, mode, onClose }: {
  notaId?: string | null; notaIds?: string[] | null; mode: 'a4' | 'etiqueta'; onClose: () => void;
}) {
  const ids = notaIds && notaIds.length ? notaIds : notaId ? [notaId] : [];
  const key = ids.join(',');
  const [doc, setDoc] = useState<{ url: string; filename: string } | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const urlRef = useRef('');

  useEffect(() => {
    if (!key) return;
    let cancel = false;
    setDoc(null); setPages([]); setErr(null);
    (async () => {
      try {
        const d = ids.length > 1 ? await gerarDanfeLoteBlobUrl(ids, mode) : await gerarDanfeBlobUrl(ids[0], mode);
        urlRef.current = d.url;
        const pdf = await pdfjs.getDocument(d.url).promise;
        const imgs: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width; canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
          imgs.push(canvas.toDataURL('image/png'));
        }
        if (!cancel) { setDoc(d); setPages(imgs); }
      } catch (e: any) { if (!cancel) setErr(e?.message || 'Falha ao montar a nota'); }
    })();
    return () => { cancel = true; if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode]);

  const imprimir = () => {
    const size = mode === 'etiqueta' ? '100mm 150mm' : 'A4';
    const w = window.open('', '_blank');
    if (!w) { baixar(); return; }
    w.document.write(`<html><head><title>${doc?.filename || 'DANFE'}</title><style>@page{size:${size};margin:0}body{margin:0}img{width:100%;display:block;page-break-after:always}</style></head><body>${pages.map(p => `<img src="${p}">`).join('')}</body></html>`);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };
  const baixar = () => {
    if (!doc) return;
    const a = document.createElement('a'); a.href = doc.url; a.download = doc.filename; a.click();
  };

  const titulo = mode === 'etiqueta' ? `DANFE Simplificada${ids.length > 1 ? ` (${ids.length} notas)` : ''}` : 'NF-e (DANFE)';
  return (
    <Dialog open={ids.length > 0} onOpenChange={o => !o && onClose()}>
      <DialogContent className={mode === 'etiqueta' ? 'max-w-md' : 'max-w-4xl'}>
        <DialogHeader><DialogTitle>{titulo}</DialogTitle></DialogHeader>
        <div className="w-full rounded border bg-muted h-[70vh] overflow-y-auto p-2 space-y-2">
          {err ? <div className="p-4 text-sm text-destructive">{err}</div>
            : pages.length ? pages.map((p, i) => <img key={i} src={p} alt={`Página ${i + 1}`} className="w-full bg-card shadow" />)
            : <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" size={16} /> Montando...</div>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={!doc} onClick={baixar}><Download size={14} className="mr-1" /> Baixar</Button>
          <Button disabled={!pages.length} onClick={imprimir}><Printer size={14} className="mr-1" /> Imprimir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
