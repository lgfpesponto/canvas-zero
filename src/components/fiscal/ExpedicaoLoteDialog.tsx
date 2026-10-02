import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, Pencil, Printer, RefreshCw, Send, Truck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { prepararNotasBagy, transmitirNotaBagy, type NotaRascunho } from '@/lib/fiscal/nfeBagy';
import { chamarEnvio, detectarServico, rotuloServico } from '@/lib/envio';
import { BagyPedidoEditDialog } from './BagyPedidoEditDialog';
import { DanfeViewerDialog } from './DanfeViewerDialog';
import { EnvioEtiquetaDialog } from '@/components/envio/EnvioEtiquetaDialog';

type St = 'aguardando' | 'enviando' | 'ok' | 'erro';
type Linha = {
  id: string; numero: string; cliente: string;
  nfe: St; nfeMsg: string; notaId: string | null; notaNum: number | null;
  etq: St; etqMsg: string; rastreio: string | null; servico: string; metodo: string;
};

const Icone = ({ s }: { s: St }) => s === 'ok' ? <CheckCircle2 size={16} className="text-primary" />
  : s === 'erro' ? <AlertTriangle size={16} className="text-destructive" />
  : s === 'enviando' ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} className="text-muted-foreground" />;

export function ExpedicaoLoteDialog({ pedidoIds, portalIdPorBagy, onClose }: {
  pedidoIds: string[] | null; portalIdPorBagy: Record<string, string | null>; onClose: () => void;
}) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [rasc, setRasc] = useState<Record<string, NotaRascunho>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<null | 'nfe' | 'etq'>(null);
  const [corrigir, setCorrigir] = useState<string[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [envioPed, setEnvioPed] = useState<any>(null);
  const [casado, setCasado] = useState<string[] | null>(null);
  const [saldo, setSaldo] = useState<number | null | 'erro'>(null);

  const upd = (id: string, p: Partial<Linha>) => setLinhas(ls => ls.map(l => l.id === id ? { ...l, ...p } : l));

  async function carregarSaldo() {
    setSaldo(null);
    try { const r = await chamarEnvio({ acao: 'saldo_me' }); setSaldo(Number(r.saldo ?? 0)); } catch { setSaldo('erro'); }
  }

  async function carregar(ids: string[]) {
    setLoading(true);
    try {
      const [notas, { data: peds }] = await Promise.all([
        prepararNotasBagy(ids, portalIdPorBagy),
        supabase.from('bagy_pedidos').select('id,numero_bagy,cliente_nome,etiqueta_path,tracking_code,envio_servico,metodo_envio').in('id', ids),
      ]);
      const m: Record<string, NotaRascunho> = {}; notas.forEach(n => { m[n.bagyPedidoId] = n; });
      setRasc(m);
      setLinhas(prev => ids.map(id => {
        const n = m[id]; const p: any = (peds ?? []).find((x: any) => x.id === id) ?? {};
        const old = prev.find(l => l.id === id);
        const aut = n?.notaExistente?.status === 'autorizada';
        const erroCad = !aut && n?.erros.length ? n.erros.join(' · ') : '';
        const servico = p.envio_servico || detectarServico(p.metodo_envio);
        const retirada = servico === 'RETIRADA';
        return {
          id, numero: p.numero_bagy ?? n?.numeroBagy ?? '?', cliente: p.cliente_nome ?? '',
          nfe: aut ? 'ok' : erroCad ? 'erro' : (old?.nfe === 'erro' ? 'erro' : 'aguardando'),
          nfeMsg: aut ? '' : erroCad || (old?.nfe === 'erro' ? old.nfeMsg : ''),
          notaId: aut ? n.notaExistente.id : null, notaNum: aut ? n.notaExistente.numero : null,
          etq: (p.etiqueta_path || retirada) ? 'ok' : (old?.etq === 'erro' ? 'erro' : 'aguardando'),
          etqMsg: p.etiqueta_path || retirada ? '' : old?.etq === 'erro' ? old.etqMsg : '', rastreio: p.tracking_code ?? null,
          servico, metodo: p.metodo_envio ?? '',
        };
      }));
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { if (pedidoIds?.length) { setLinhas([]); setCorrigir(null); carregar(pedidoIds); carregarSaldo(); } }, [pedidoIds]);

  async function enviarSefaz() {
    const alvo = linhas.filter(l => l.nfe !== 'ok' && rasc[l.id] && rasc[l.id].erros.length === 0);
    if (!alvo.length) { toast.error('Nenhuma nota pronta para enviar. Corrija os erros primeiro.'); return; }
    setBusy('nfe');
    for (const l of alvo) {
      upd(l.id, { nfe: 'enviando', nfeMsg: '' });
      try {
        const out = await transmitirNotaBagy(rasc[l.id]);
        upd(l.id, out.autorizada ? { nfe: 'ok', notaId: out.notaId, notaNum: out.numero } : { nfe: 'erro', nfeMsg: out.motivo });
      } catch (e: any) { upd(l.id, { nfe: 'erro', nfeMsg: e.message || String(e) }); }
    }
    setBusy(null);
    if (pedidoIds) await carregar(pedidoIds);
  }

  async function gerarEtiquetas() {
    const { data: peds } = await supabase.from('bagy_pedidos').select('id,envio_servico,metodo_envio,etiqueta_path').in('id', linhas.map(l => l.id));
    const alvo = linhas.filter(l => l.nfe === 'ok' && l.etq !== 'ok' && l.servico !== 'RETIRADA');
    if (!alvo.length) { toast.error('Nenhum pedido com nota autorizada aguardando etiqueta.'); return; }
    setBusy('etq');
    for (const l of alvo) {
      const p: any = (peds ?? []).find((x: any) => x.id === l.id);
      if (p?.etiqueta_path) { upd(l.id, { etq: 'ok' }); continue; }
      const servico = p?.envio_servico || detectarServico(p?.metodo_envio);
      upd(l.id, { etq: 'enviando', etqMsg: '' });
      if (servico === 'ME') { upd(l.id, { etq: 'erro', etqMsg: 'Escolha a transportadora do Melhor Envio.' }); continue; }
      try {
        const r = await chamarEnvio({ acao: 'gerar', bagyPedidoId: l.id, servico, peso: 2, altura: 15, largura: 30, comprimento: 35 });
        upd(l.id, { etq: 'ok', rastreio: r.rastreio ?? null });
      } catch (e: any) { upd(l.id, { etq: 'erro', etqMsg: e.message || String(e) }); }
    }
    setBusy(null);
    if (pedidoIds) await carregar(pedidoIds);
  }

  async function abrirEnvio(id: string) {
    const { data } = await supabase.from('bagy_pedidos').select('id,numero_bagy,metodo_envio,envio_servico,etiqueta_path,tracking_code').eq('id', id).maybeSingle();
    if (data) setEnvioPed(data);
  }

  const nfeErros = linhas.filter(l => l.nfe === 'erro');
  const etqErros = linhas.filter(l => l.etq === 'erro');
  const prontasSefaz = linhas.filter(l => l.nfe !== 'ok' && rasc[l.id]?.erros.length === 0).length;
  const prontasEtq = linhas.filter(l => l.nfe === 'ok' && l.etq !== 'ok' && l.servico !== 'RETIRADA').length;
  const imprimiveis = [...linhas].filter(l => l.nfe === 'ok' && l.etq === 'ok' && l.notaId)
    .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR')).map(l => l.notaId!);
  const jaEnviou = linhas.some(l => l.nfe === 'ok' || l.nfe === 'erro');

  const lista = corrigir ? linhas.filter(l => corrigir.includes(l.id)) : linhas;
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={!!pedidoIds} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{corrigir ? 'Corrigir erros' : `Notas em lista (${linhas.length} pedidos)`}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/40 px-3 py-2 text-xs">
          <Wallet size={14} />
          <span>Saldo Melhor Envio: <b>{saldo === null ? '...' : saldo === 'erro' ? 'indisponível' : brl(saldo)}</b></span>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={carregarSaldo}><RefreshCw size={12} /></Button>
          <Button size="sm" variant="outline" className="h-7 ml-auto" asChild>
            <a href="https://melhorenvio.com.br/painel/gerenciar/carteira" target="_blank" rel="noreferrer"><ExternalLink size={12} className="mr-1" /> Recarregar carteira</a>
          </Button>
        </div>
        {loading && !linhas.length ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Gerando notas...</div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="rounded border divide-y">
              {lista.map(l => (
                <div key={l.id} className="p-2 grid md:grid-cols-[1fr_1.2fr_1.4fr] gap-2 items-start">
                  <div>
                    <div className="font-mono font-bold">RC-{l.numero}</div>
                    <div className="text-xs text-muted-foreground truncate">{l.cliente || '—'}</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${l.servico === 'RETIRADA' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`} title={l.metodo}>
                      {rotuloServico(l.servico, l.metodo) || '—'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 items-start"><Icone s={l.nfe} /><div className="text-xs flex-1">
                    <b>NF-e:</b> {l.nfe === 'ok' ? `nº ${l.notaNum} autorizada` : l.nfe === 'enviando' ? 'enviando à SEFAZ...' : l.nfe === 'erro' ? <span className="text-destructive">{l.nfeMsg}</span> : 'aguardando'}
                  </div>
                    {l.nfe !== 'ok' && <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar nota" disabled={!!busy} onClick={() => setEditId(l.id)}><Pencil size={14} /></Button>}
                  </div>
                  <div className="flex gap-1.5 items-start"><Icone s={l.etq} /><div className="text-xs flex-1">
                    <b>Etiqueta:</b> {l.servico === 'RETIRADA' ? 'Retirada no showroom — só a nota' : l.etq === 'ok' ? (l.rastreio || 'gerada') : l.etq === 'enviando' ? 'gerando...' : l.etq === 'erro' ? <span className="text-destructive">{l.etqMsg}</span> : 'aguardando'}
                  </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar envio (peso, medidas, tipo)" disabled={!!busy} onClick={() => abrirEnvio(l.id)}><Pencil size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
              {corrigir ? (
                <>
                  <Button variant="outline" disabled={!!busy || loading} onClick={() => pedidoIds && carregar(pedidoIds)}><RefreshCw size={16} className="mr-1" /> Recarregar</Button>
                  <Button disabled={!!busy} onClick={async () => { setCorrigir(null); if (nfeErros.length) await enviarSefaz(); else await gerarEtiquetas(); }}>
                    <Send size={16} className="mr-1" /> {nfeErros.length ? 'Reenviar à SEFAZ' : 'Gerar etiquetas novamente'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant={jaEnviou ? 'outline' : 'default'} disabled={!!busy || prontasSefaz === 0} onClick={enviarSefaz}>
                    {busy === 'nfe' ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Send size={16} className="mr-1" />}
                    {jaEnviou ? 'Enviar à SEFAZ (pendentes/erros)' : 'Enviar para SEFAZ'} ({prontasSefaz})
                  </Button>
                  <Button variant={prontasEtq ? 'default' : 'outline'} disabled={!!busy || prontasEtq === 0} onClick={gerarEtiquetas}>
                    {busy === 'etq' ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Truck size={16} className="mr-1" />} Gerar etiquetas ({prontasEtq})
                  </Button>
                  <Button disabled={!!busy || imprimiveis.length === 0} onClick={() => setCasado(imprimiveis)}>
                    <Printer size={16} className="mr-1" /> Imprimir DANFE + etiqueta ({imprimiveis.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        {editId && (
          <BagyPedidoEditDialog pedidoId={editId} open={!!editId} onOpenChange={o => !o && setEditId(null)}
            onSaved={() => { if (pedidoIds) carregar(pedidoIds); }} />
        )}
        <EnvioEtiquetaDialog pedido={envioPed} onClose={() => setEnvioPed(null)} onDone={() => { if (pedidoIds) carregar(pedidoIds); }} />
        <DanfeViewerDialog notaIds={casado} mode="etiqueta" casada onClose={() => setCasado(null)} />
      </DialogContent>
    </Dialog>
  );
}
