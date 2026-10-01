import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Download } from 'lucide-react';
import { gerarDanfeBlobUrl } from '@/lib/fiscal/danfePdf';

export function DanfeViewerDialog({ notaId, mode, onClose }: { notaId: string | null; mode: 'a4' | 'etiqueta'; onClose: () => void }) {
  const [doc, setDoc] = useState<{ url: string; filename: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!notaId) return;
    let url = '';
    setDoc(null); setErr(null);
    gerarDanfeBlobUrl(notaId, mode).then(d => { url = d.url; setDoc(d); }).catch(e => setErr(e?.message || 'Falha ao montar a nota'));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [notaId, mode]);

  const imprimir = () => {
    try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }
    catch { if (doc) window.open(doc.url, '_blank'); }
  };
  const baixar = () => {
    if (!doc) return;
    const a = document.createElement('a'); a.href = doc.url; a.download = doc.filename; a.click();
  };

  return (
    <Dialog open={!!notaId} onOpenChange={o => !o && onClose()}>
      <DialogContent className={mode === 'etiqueta' ? 'max-w-md' : 'max-w-4xl'}>
        <DialogHeader><DialogTitle>{mode === 'etiqueta' ? 'Etiqueta NF-e' : 'NF-e (DANFE)'}</DialogTitle></DialogHeader>
        <div className={`w-full rounded border bg-muted ${mode === 'etiqueta' ? 'h-[70vh]' : 'h-[75vh]'}`}>
          {err ? <div className="p-4 text-sm text-destructive">{err}</div>
            : doc ? <iframe ref={frame} src={`${doc.url}#toolbar=0&navpanes=0`} title="Nota fiscal" className="w-full h-full rounded" />
            : <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" size={16} /> Montando...</div>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={!doc} onClick={baixar}><Download size={14} className="mr-1" /> Baixar</Button>
          <Button disabled={!doc} onClick={imprimir}><Printer size={14} className="mr-1" /> Imprimir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
