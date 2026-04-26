import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { isDriveUrl, toDriveImageUrl, toDrivePreviewUrl } from '@/lib/driveUrl';

interface Props {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FotoPedidoDialog = ({ url, open, onOpenChange }: Props) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reset estado ao trocar URL ou reabrir
  useEffect(() => {
    if (open) {
      setImgFailed(false);
      setLoading(true);
    }
  }, [open, url]);

  if (!url) return null;

  const drive = isDriveUrl(url);
  const imgUrl = drive ? toDriveImageUrl(url) : url;
  const previewUrl = drive ? toDrivePreviewUrl(url) : url;
  const useIframe = drive && imgFailed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle className="text-base">Foto do pedido</DialogTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-1" /> Abrir no Drive
          </Button>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted rounded overflow-hidden flex items-center justify-center relative">
          {loading && !useIframe && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="animate-spin h-5 w-5" /> Carregando...
            </div>
          )}

          {!useIframe && imgUrl && (
            <img
              src={imgUrl}
              alt="Foto do pedido"
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                if (drive) setImgFailed(true);
              }}
            />
          )}

          {useIframe && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Foto do pedido"
              allow="autoplay"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
