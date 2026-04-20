import { useEffect, useState } from 'react';
import { Download, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Props {
  path: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isImagePath(path: string): boolean {
  return /\.(jpg|jpeg|png|webp|heic|heif|gif)$/i.test(path);
}

export const ComprovanteViewer = ({ path, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !path) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    (async () => {
      setLoading(true); setError(null); setBlobUrl(null); setSignedUrl(null);
      try {
        const { data, error } = await supabase.storage
          .from('financeiro')
          .createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) throw error || new Error('URL não disponível');
        if (cancelled) return;
        setSignedUrl(data.signedUrl);

        // baixa via fetch -> blob (escapa de bloqueadores como o do Edge)
        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Falha ao carregar arquivo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, path]);

  const handleDownload = () => {
    if (!blobUrl || !path) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = path.split('/').pop() || 'comprovante';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleOpenNewTab = () => {
    if (!signedUrl) return;
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  const isImage = path ? isImagePath(path) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base truncate pr-4">
            {path?.split('/').pop() || 'Comprovante'}
          </DialogTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleOpenNewTab} disabled={!signedUrl}>
              <ExternalLink size={14} className="mr-1" /> Nova aba
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={!blobUrl}>
              <Download size={14} className="mr-1" /> Baixar
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted rounded overflow-auto flex items-center justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin" size={20} /> Carregando...
            </div>
          )}
          {error && !loading && (
            <div className="text-destructive text-sm p-4 text-center">
              {error}
              <p className="text-xs text-muted-foreground mt-2">Tente "Baixar" ou "Nova aba".</p>
            </div>
          )}
          {!loading && !error && blobUrl && (
            isImage ? (
              <img src={blobUrl} alt="Comprovante" className="max-w-full max-h-full object-contain" />
            ) : (
              <iframe src={blobUrl} className="w-full h-full border-0" title="Comprovante PDF" />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
