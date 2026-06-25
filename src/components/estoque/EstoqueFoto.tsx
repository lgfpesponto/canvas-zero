import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { isDriveUrl, toDriveImageUrl, toDrivePreviewUrl } from '@/lib/driveUrl';
import { cn } from '@/lib/utils';

interface Props {
  url: string | null;
  alt: string;
  className?: string;
  grayscale?: boolean;
  /** classe aplicada ao container wrapper */
  wrapperClassName?: string;
  iframeHeightClass?: string;
}

/**
 * Renderiza a foto de um produto de estoque. Se a URL é do Google Drive,
 * converte para a CDN lh3.googleusercontent.com e cai pra <iframe> de preview
 * em caso de falha — mesma estratégia do FotoPedidoSidePanel.
 */
export const EstoqueFoto = ({
  url,
  alt,
  className,
  grayscale,
  wrapperClassName,
  iframeHeightClass = 'h-full',
}: Props) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  if (!url) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center text-muted-foreground', wrapperClassName)}>
        <Package size={32} />
      </div>
    );
  }

  const drive = isDriveUrl(url);
  const imgUrl = drive ? toDriveImageUrl(url) : url;
  const previewUrl = drive ? toDrivePreviewUrl(url) : url;
  const useIframe = drive && imgFailed;

  if (useIframe && previewUrl) {
    return (
      <iframe
        src={previewUrl}
        title={alt}
        className={cn('w-full border-0', iframeHeightClass, grayscale && 'grayscale', wrapperClassName)}
        allow="autoplay"
      />
    );
  }

  return (
    <img
      src={imgUrl || url}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (drive) setImgFailed(true);
      }}
      className={cn(className, grayscale && 'grayscale')}
    />
  );
};

export default EstoqueFoto;
