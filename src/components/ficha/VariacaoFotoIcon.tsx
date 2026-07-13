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
 * mostrando o QR code do link da foto com a própria foto sobreposta.
 * O "botão Escanear" existe (invisível, sempre no estado apertado) —
 * a foto renderizada em cima do QR é o resultado do "scan".
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
          <ScannedQr fotoUrl={fotoUrl} nome={nome} />
          <p className="text-[10px] text-muted-foreground text-center break-all">{fotoUrl}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * QR + botão "Escanear" invisível sempre apertado + foto sobreposta.
 * Reutilizável no dialog do olhinho e nos cards do expandir.
 */
export function ScannedQr({ fotoUrl, nome, className = 'mx-auto w-64 h-64' }: { fotoUrl: string; nome?: string; className?: string }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className={`relative bg-white rounded overflow-hidden border ${className}`}>
      <QRCodeSVG value={fotoUrl} size={512} className="absolute inset-0 w-full h-full" />
      {/* Botão "Escanear" — sempre no estado apertado e invisível.
          A foto em cima do QR é o próprio resultado da leitura. */}
      <button
        type="button"
        aria-pressed="true"
        aria-label="Escanear (ativo)"
        tabIndex={-1}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none"
      >
        Escanear
      </button>
      {imgOk && (
        <img
          src={fotoUrl}
          alt={nome || 'foto'}
          onError={() => setImgOk(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
}
