import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X, Eye, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDriveUrl, toDriveImageUrl, toDrivePreviewUrl } from '@/lib/driveUrl';

interface Props {
  url: string | null;
  onClose: () => void;
  onFinalizar?: () => void;
  onSaveDraft?: () => void;
  onEstoquePronto?: () => void;
  showEstoquePronto?: boolean;
  disabled?: boolean;
}

/**
 * Painel lateral fixo (sticky) com a foto do pedido.
 * Opcionalmente exibe botões flutuantes "olho" (finalizar/conferir), "página" (salvar rascunho)
 * e "caixa" (criar direto no estoque) logo abaixo do painel.
 */
export const FotoPedidoSidePanel = ({ url, onClose, onFinalizar, onSaveDraft, onEstoquePronto, showEstoquePronto, disabled }: Props) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setImgFailed(false);
    setLoading(true);
  }, [url]);

  if (!url) return null;

  const drive = isDriveUrl(url);
  const imgUrl = drive ? toDriveImageUrl(url) : url;
  const previewUrl = drive ? toDrivePreviewUrl(url) : url;
  const useIframe = drive && imgFailed;

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start w-full">
      <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <h3 className="text-sm font-semibold truncate">Foto do pedido</h3>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              title="Abrir no Drive"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={onClose}
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-muted flex items-center justify-center relative overflow-hidden">
          {loading && !useIframe && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground gap-2 text-sm">
              <Loader2 className="animate-spin h-4 w-4" /> Carregando...
            </div>
          )}

          {!useIframe && imgUrl && (
            <img
              src={imgUrl}
              alt="Foto do pedido"
              className="w-full h-auto max-h-[calc(100vh-6rem)] object-contain"
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
              className="w-full h-[70vh] border-0"
              title="Foto do pedido"
              allow="autoplay"
            />
          )}
        </div>
      </div>

      {(onFinalizar || onSaveDraft || (showEstoquePronto && onEstoquePronto)) && (
        <div className="mt-3 flex justify-start gap-2">
          {onFinalizar && (
            <button
              type="button"
              onClick={onFinalizar}
              disabled={disabled}
              title="Conferir e finalizar pedido"
              aria-label="Conferir e finalizar pedido"
              className="h-14 w-14 rounded-full orange-gradient text-primary-foreground shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye size={22} />
            </button>
          )}
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={disabled}
              title="Salvar rascunho"
              aria-label="Salvar rascunho"
              className="h-14 w-14 rounded-full bg-card border-2 border-primary text-primary shadow-lg hover:bg-primary/10 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={22} />
            </button>
          )}
          {showEstoquePronto && onEstoquePronto && (
            <button
              type="button"
              onClick={onEstoquePronto}
              disabled={disabled}
              title="Criar direto no Estoque"
              aria-label="Criar direto no Estoque"
              className="h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package size={22} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
