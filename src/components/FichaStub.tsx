import { useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { orderBarcodeValue, type Order } from '@/contexts/AuthContext';
import { isHttpUrl } from '@/lib/driveUrl';

/**
 * Canhoto/stub idêntico ao da ficha impressa em PDF (generateProductionSheetPDF):
 * - Linha tracejada superior
 * - Esquerda: código de barras CODE128 + número
 * - Direita: Nº pedido, tamanho/solado/cor, bico/vira + QR da foto
 * Aparece somente para pedidos de bota (sem tipoExtra).
 */
export function FichaStub({ order }: { order: Order }) {
  const [bcUrl, setBcUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, orderBarcodeValue(order.numero, order.id), {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0,
      });
      setBcUrl(canvas.toDataURL('image/png'));
    } catch {
      setBcUrl(null);
    }
  }, [order.id, order.numero]);

  useEffect(() => {
    let cancelled = false;
    const fotoUrl = (order.fotos || []).find(f => isHttpUrl(f));
    if (!fotoUrl) { setQrUrl(null); return; }
    QRCode.toDataURL(fotoUrl, { width: 240, margin: 1 })
      .then(u => { if (!cancelled) setQrUrl(u); })
      .catch(() => { if (!cancelled) setQrUrl(null); });
    return () => { cancelled = true; };
  }, [order.fotos]);

  if (order.tipoExtra) return null;

  const orderNumClean = (order.numero || '').replace('7E-', '');
  const tam = order.tamanho || '';
  const solado = (order.solado || 'borracha').toLowerCase();
  const corSola = order.corSola ? order.corSola.toLowerCase() : '';
  const formaVal = (order as any).forma || '';
  const line1Parts = [tam, solado, corSola].filter(Boolean).join(' ');
  const stubLine1 = (formaVal ? `${line1Parts} | forma: ${formaVal}` : line1Parts).toUpperCase();
  const bicoText = (order.formatoBico || 'quadrado').toLowerCase().replace(/\bfino\b/gi, 'BF');
  const viraText = (order.corVira && !['Bege', 'Neutra'].includes(order.corVira))
    ? ` vira ${order.corVira.toLowerCase()}`
    : '';
  const stubLine2 = `${bicoText}${viraText}`.toUpperCase();

  return (
    <div className="mt-4">
      <div className="border-t border-dashed border-border mb-3" />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* ESQUERDA — código de barras */}
        <div className="flex flex-col items-center gap-1">
          {bcUrl ? (
            <img src={bcUrl} alt={`Código de barras ${orderNumClean}`} className="h-16 max-w-full" />
          ) : (
            <div className="h-16 w-full bg-muted/40 rounded" />
          )}
          <div className="text-sm font-bold tracking-wider">{orderNumClean}</div>
        </div>

        <div className="hidden md:block w-px self-stretch bg-border" />

        {/* DIREITA — info montagem/sola + QR */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center flex-1">
            <div className="text-[11px] font-bold mb-1">Nº pedido: {orderNumClean}</div>
            <div className="text-sm font-bold leading-tight">{stubLine1}</div>
            {stubLine2 && (
              <div className="text-xs font-bold leading-tight mt-0.5">{stubLine2}</div>
            )}
          </div>
          {qrUrl && (
            <div className="flex flex-col items-center">
              <img src={qrUrl} alt="QR da foto" className="h-24 w-24" />
              <div className="text-[9px] italic text-muted-foreground mt-0.5">escaneie p/ ver a foto</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
