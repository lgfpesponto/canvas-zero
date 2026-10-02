import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { gerarDanfeBlobUrl, gerarDanfeLoteBlobUrl } from '@/lib/fiscal/danfePdf';
import { carregarEtiquetasEnvio, gerarEtiquetasLoteBlobUrl } from '@/lib/envio';

/**
 * Gera o PDF (DANFE, DANFE simplificada, etiqueta ou casado) e manda direto para a impressão,
 * sem desenhar as páginas dentro do portal. Se o navegador bloquear, baixa o arquivo.
 */
export function DanfeViewerDialog({ notaId, notaIds, mode, onClose, casada, etiquetaPedidoIds }: {
  notaId?: string | null; notaIds?: string[] | null; casada?: boolean; etiquetaPedidoIds?: string[] | null; mode: 'a4' | 'etiqueta'; onClose: () => void;
}) {
  const soEtiqueta = !!(etiquetaPedidoIds && etiquetaPedidoIds.length);
  const ids = soEtiqueta ? etiquetaPedidoIds! : notaIds && notaIds.length ? notaIds : notaId ? [notaId] : [];
  const key = ids.join(',');
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!key) return;
    const tid = toast.loading('Gerando PDF...');
    (async () => {
      try {
        const d = soEtiqueta ? await gerarEtiquetasLoteBlobUrl(ids)
          : (ids.length > 1 || casada) ? await gerarDanfeLoteBlobUrl(ids, mode, casada ? await carregarEtiquetasEnvio(ids) : {})
          : await gerarDanfeBlobUrl(ids[0], mode);
        imprimirPdf(d.url, d.filename);
        toast.success('PDF gerado', { id: tid });
      } catch (e: any) {
        toast.error(e?.message || 'Falha ao gerar o PDF', { id: tid });
      } finally {
        closeRef.current();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode, casada]);

  return null;
}

function imprimirPdf(url: string, filename: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  iframe.src = url;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    }
    setTimeout(() => { iframe.remove(); URL.revokeObjectURL(url); }, 120000);
  };
  document.body.appendChild(iframe);
}
