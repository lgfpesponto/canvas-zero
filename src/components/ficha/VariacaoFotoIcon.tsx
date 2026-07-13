import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { isDriveUrl, toDriveImageUrl } from '@/lib/driveUrl';

interface Props {
  fotoUrl?: string | null;
  nome?: string;
  size?: number;
}

/**
 * Ícone de olho ao lado do nome da variação. Ao clicar abre um dialog
 * mostrando a foto direta (sem QR code) — mesmo estilo dos Modelos
 * Rascunhos.
 */
export default function VariacaoFotoIcon({ fotoUrl, nome, size = 14 }: Props) {
  const [open, setOpen] = useState(false);
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
          <ScannedQr fotoUrl={fotoUrl} nome={nome} className="mx-auto w-64 h-64" />
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Exibe a foto direta (Drive convertido para lh3.googleusercontent.com/d/{ID}).
 * Sem QR — igual à visualização de Modelos Rascunhos. Se a imagem falhar,
 * mostra "Sem foto".
 */
export function ScannedQr({ fotoUrl, nome, className = 'mx-auto w-64 h-64' }: { fotoUrl: string; nome?: string; className?: string }) {
  const imgSrc = isDriveUrl(fotoUrl) ? (toDriveImageUrl(fotoUrl) || fotoUrl) : fotoUrl;
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className={`relative bg-white rounded overflow-hidden border ${className}`}>
      {imgOk ? (
        <img
          src={imgSrc}
          alt={nome || 'foto'}
          onError={() => setImgOk(false)}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Sem foto
        </div>
      )}
    </div>
  );
}

