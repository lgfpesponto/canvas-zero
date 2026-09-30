import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Pencil, Printer, Send } from 'lucide-react';
import { toast } from 'sonner';
import { prepararNotasBagy, transmitirNotaBagy, type NotaRascunho } from '@/lib/fiscal/nfeBagy';
import { gerarDanfePdf } from '@/lib/fiscal/danfePdf';
import { formatNcm } from '@/lib/fiscal/ncm';
import { BagyPedidoEditDialog } from '@/components/fiscal/BagyPedidoEditDialog';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const docFmt = (d: string) => d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d || '—';

type Resultado = { notaId: string; numero: number; autorizada: boolean; motivo: string };

export function NfeBagyDialog({ pedidoIds, portalIdPorBagy, onClose }: {
  pedidoIds: string[] | null; portalIdPorBagy: Record<string, string | null>; onClose: () => void;
}) {
  const [notas, setNotas] = useState<NotaRascunho[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Record<string, Resultado>>({});
  const [editOpen, setEditOpen] = useState(false);

  const carregar = (ids: string[]) => {
    setLoading(true);
    return prepararNotasBagy(ids, portalIdPorBagy)
      .then(n => {
        setNotas(n);
        const r: Record<string, Resultado> = {};
        n.forEach(x => { if (x.notaExistente?.status === 'autorizada') r[x.bagyPedidoId] = { notaId: x.notaExistente.id, numero: x.notaExistente.numero, autorizada: true, motivo: '' }; });
        setRes(r);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!pedidoIds?.length) return;
    setIdx(0); setRes({}); setEditOpen(false);
    carregar(pedidoIds);
  }, [pedidoIds]);

  const n = notas[idx];
  const r = n ? res[n.bagyPedidoId] : undefined;
  const cfg = n?.emitente;
  const d = n?.destinatario;

  async function confirmar() {
    if (!n) return;
    setBusy(true);
    try {
      const out = await transmitirNotaBagy(n);
      setRes(prev => ({ ...prev, [n.bagyPedidoId]: out }));
      if (out.autorizada) toast.success(`NF-e nº ${out.numero} autorizada pela SEFAZ`);
      else toast.error(`NF-e rejeitada: ${out.motivo}`);
    } catch (e: any) {
      toast.error(e.message || String(e));
      setRes(prev => ({ ...prev, [n.bagyPedidoId]: { notaId: '', numero: 0, autorizada: false, motivo: e.message || String(e) } }));
    } finally { setBusy(false); }
  }

  async function imprimir(modo: 'a4' | 'etiqueta') {
    if (!r?.notaId) return;
    try { await gerarDanfePdf(r.notaId, modo, 'print'); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={!!pedidoIds} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span>Conferir NF-e {n ? `— RC-${n.numeroBagy}` : ''}</span>
            {notas.length > 1 && (
              <span className="flex items-center gap-1 text-sm font-normal">
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={idx === 0 || busy} onClick={() => setIdx(i => i - 1)} aria-label="Nota anterior"><ChevronLeft size={16} /></Button>
                <span className="px-2">{idx + 1} de {notas.length}</span>
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={idx === notas.length - 1 || busy} onClick={() => setIdx(i => i + 1)} aria-label="Próxima nota"><ChevronRight size={16} /></Button>
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !n ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Gerando nota...</div>
        ) : (
          <div className="space-y-3 text-sm">
            {n.ambiente === 2 && <div className="text-xs font-semibold text-center rounded bg-muted py-1">HOMOLOGAÇÃO — SEM VALOR FISCAL</div>}

            {r?.autorizada ? (
              <div className="flex items-center gap-2 rounded border border-primary/40 bg-primary/5 p-2"><CheckCircle2 size={16} className="text-primary" /> NF-e nº {r.numero} autorizada.</div>
            ) : r?.motivo ? (
              <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-destructive"><b>Retorno da SEFAZ:</b> {r.motivo}</div>
            ) : null}

            {!r?.autorizada && n.erros.length > 0 && (
              <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-destructive">
                <div className="flex items-center gap-1 font-semibold mb-1"><AlertTriangle size={14} /> Corrija antes de enviar:</div>
                <ul className="list-disc pl-5 space-y-0.5">{n.erros.map(e => <li key={e}>{e}</li>)}</ul>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3">
              <section className="rounded border p-2">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Emitente</div>
                <div className="font-semibold">{cfg?.razao_social || '—'}</div>
                <div className="text-xs">CNPJ {docFmt(String(cfg?.cnpj ?? '').replace(/\D/g, ''))} · IE {cfg?.inscricao_estadual || '—'}</div>
                <div className="text-xs">{[cfg?.logradouro, cfg?.numero, cfg?.bairro, cfg?.municipio, cfg?.uf].filter(Boolean).join(', ')}</div>
              </section>
              <section className="rounded border p-2">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Destinatário</div>
                <div className="font-semibold">{d.nome || '—'}</div>
                <div className="text-xs">CPF/CNPJ {docFmt(d.cpf_cnpj)}{d.inscricao_estadual ? ` · IE ${d.inscricao_estadual}` : ''}</div>
                <div className="text-xs">{[d.logradouro, d.numero, d.complemento, d.bairro, d.municipio, d.uf, d.cep && `CEP ${d.cep}`].filter(Boolean).join(', ')}</div>
              </section>
            </div>

            <div className="text-xs">Natureza: <b>VENDA DE MERCADORIA</b> · CFOP <b>{n.cfop}</b></div>

            <div className="overflow-x-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr><th className="p-1.5 text-left">Código</th><th className="p-1.5 text-left">Descrição</th><th className="p-1.5">NCM</th><th className="p-1.5">CSOSN</th><th className="p-1.5">Un</th><th className="p-1.5 text-right">Qtd</th><th className="p-1.5 text-right">Unit.</th><th className="p-1.5 text-right">Total</th></tr>
                </thead>
                <tbody>
                  {n.itens.map((it, k) => (
                    <tr key={k} className="border-t">
                      <td className="p-1.5">{it.codigo}</td><td className="p-1.5">{it.descricao}</td>
                      <td className={`p-1.5 text-center ${it.ncm.length !== 8 ? 'text-destructive font-semibold' : ''}`}>{it.ncm ? formatNcm(it.ncm) : 'FALTANDO'}</td>
                      <td className="p-1.5 text-center">{it.csosn || '—'}</td><td className="p-1.5 text-center">{it.unidade}</td>
                      <td className="p-1.5 text-right">{it.quantidade}</td><td className="p-1.5 text-right">{brl(it.valorUnit)}</td><td className="p-1.5 text-right">{brl(it.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-4 text-xs">
              <span>Produtos: <b>{brl(n.valorProdutos)}</b></span>
              <span>Desconto: <b>{brl(n.desconto)}</b></span>
              <span>Frete: <b>{brl(n.frete)}</b></span>
              <span className="text-sm">Total da nota: <b>{brl(n.valorTotal)}</b></span>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button variant="outline" disabled={!r?.autorizada} onClick={() => imprimir('etiqueta')}><Printer size={16} className="mr-1" /> Etiqueta</Button>
              <Button variant="outline" disabled={!r?.autorizada} onClick={() => imprimir('a4')} title={r?.autorizada ? 'Imprimir DANFE' : 'Disponível depois da autorização'}><Printer size={16} className="mr-1" /> Imprimir NF-e</Button>
              <Button disabled={busy || !!r?.autorizada || n.erros.length > 0} onClick={confirmar}>
                {busy ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Send size={16} className="mr-1" />} Confirmar e enviar à SEFAZ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
