import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Loader2, QrCode } from 'lucide-react';
import { chamarEnvio } from '@/lib/envio';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Recarga da carteira Melhor Envio via Pix, com QR Code na própria tela. */
export function PixMelhorEnvioDialog({ open, sugerido, totalFretes, qtd, saldoAtual, onClose, onPago }: {
  open: boolean; sugerido: number; totalFretes: number; qtd: number; saldoAtual: number | null;
  onClose: () => void; onPago: () => void;
}) {
  const [valor, setValor] = useState('');
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<{ copia: string; imagem: string; link: string } | null>(null);
  const saldoIni = useRef<number | null>(null);

  useEffect(() => { if (open) { setValor(Math.max(1, Math.ceil(sugerido * 100) / 100).toFixed(2)); setPix(null); } }, [open, sugerido]);

  // Confere o saldo a cada 5s enquanto o Pix está na tela.
  useEffect(() => {
    if (!pix) return;
    saldoIni.current = saldoAtual;
    const t = setInterval(async () => {
      try {
        const r = await chamarEnvio({ acao: 'saldo_me' });
        const s = Number(r.saldo ?? 0);
        if (saldoIni.current !== null && s > saldoIni.current + 0.009) {
          clearInterval(t); toast.success(`Pix recebido! Saldo: ${brl(s)}`); onPago(); onClose();
        }
      } catch { /* tenta de novo */ }
    }, 5000);
    return () => clearInterval(t);
  }, [pix]);

  const gerar = async () => {
    const v = Number(valor.replace(',', '.'));
    if (!(v >= 1)) { toast.error('Valor mínimo R$ 1,00'); return; }
    setBusy(true);
    try {
      const r = await chamarEnvio({ acao: 'pix_me', valor: v });
      if (!r.copia && !r.imagem && !r.link) throw new Error('O Melhor Envio não devolveu o Pix.');
      setPix(r);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Pagar fretes Melhor Envio (Pix)</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border bg-muted/40 p-2 text-xs space-y-0.5">
            <div>Fretes Melhor Envio na lista: <b>{qtd}</b> — total <b>{brl(totalFretes)}</b></div>
            <div>Saldo atual: <b>{saldoAtual === null ? '—' : brl(saldoAtual)}</b></div>
          </div>
          {!pix ? (
            <>
              <div>
                <label className="text-xs font-semibold">Valor do Pix (R$)</label>
                <Input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" />
              </div>
              <Button className="w-full" onClick={gerar} disabled={busy}>
                {busy ? <Loader2 size={16} className="mr-1 animate-spin" /> : <QrCode size={16} className="mr-1" />} Gerar Pix
              </Button>
            </>
          ) : (
            <div className="space-y-3 text-center">
              <div className="mx-auto w-fit rounded bg-background p-2 border">
                {pix.copia ? <QRCodeSVG value={pix.copia} size={220} />
                  : pix.imagem ? <img src={pix.imagem} alt="QR Code Pix" className="w-[220px] h-[220px]" /> : null}
              </div>
              {pix.copia && (
                <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(pix.copia); toast.success('Código Pix copiado'); }}>
                  <Copy size={14} className="mr-1" /> Copiar código Pix
                </Button>
              )}
              {!pix.copia && !pix.imagem && pix.link && (
                <Button className="w-full" asChild><a href={pix.link} target="_blank" rel="noreferrer"><ExternalLink size={14} className="mr-1" /> Abrir QR Code do Pix</a></Button>
              )}
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Aguardando pagamento — fecha sozinho quando cair.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
