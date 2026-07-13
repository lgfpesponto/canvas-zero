import { useState } from 'react';
import { Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  fotoUrl?: string | null;
  nome?: string;
  size?: number;
}

/**
 * Ícone de olho ao lado do nome da variação. Ao clicar abre um dialog
 * mostrando o QR code do link da foto com a própria foto sobreposta
 * (o "botão escanear" já vem acionado — a imagem já está exibida).
 */
export default function VariacaoFotoIcon({ fotoUrl, nome, size = 14 }: Props) {
  const [open, setOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  if (!fotoUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center justify-center opacity-70 hover:opacity-100 text-primary ml-1 align-middle"
        title="ver foto"
      >
        <Eye size={size} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{nome || 'Foto da variação'}</DialogTitle>
          </DialogHeader>
          <div className="relative mx-auto w-64 h-64 bg-white rounded overflow-hidden border">
            <QRCodeSVG value={fotoUrl} size={256} className="absolute inset-0 w-full h-full" />
            {imgOk && (
              <img
                src={fotoUrl}
                alt={nome || 'foto'}
                onError={() => setImgOk(false)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center break-all">{fotoUrl}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
