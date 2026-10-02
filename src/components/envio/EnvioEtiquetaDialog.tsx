import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Truck } from 'lucide-react';
import { SERVICOS_ENVIO, chamarEnvio, detectarServico, urlEtiqueta } from '@/lib/envio';

type Ped = { id: string; numero_bagy: string; metodo_envio: string | null; envio_servico?: string | null; etiqueta_path?: string | null; tracking_code?: string | null };

export function EnvioEtiquetaDialog({ pedido, onClose, onDone }: { pedido: Ped | null; onClose: () => void; onDone: () => void }) {
  const [servico, setServico] = useState('PAC');
  const [meId, setMeId] = useState('');
  const [opcoes, setOpcoes] = useState<{ id: number; nome: string; preco: string; prazo: number }[]>([]);
  const [peso, setPeso] = useState('2');
  const [dim, setDim] = useState({ altura: '15', largura: '30', comprimento: '35' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pedido) return;
    const s = pedido.envio_servico || detectarServico(pedido.metodo_envio);
    setServico(s.startsWith('ME') ? 'ME' : s);
    setMeId(s.startsWith('ME:') ? s.slice(3) : '');
    setOpcoes([]);
  }, [pedido]);

  if (!pedido) return null;
  const medidas = { peso: Number(peso), altura: Number(dim.altura), largura: Number(dim.largura), comprimento: Number(dim.comprimento) };
  const servFinal = servico === 'ME' ? (meId ? `ME:${meId}` : 'ME') : servico;

  const salvar = async () => {
    setBusy(true);
    try { await chamarEnvio({ acao: 'salvar_servico', bagyPedidoId: pedido.id, servico: servFinal }); toast.success('Forma de envio salva'); onDone(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const cotar = async () => {
    setBusy(true);
    try {
      const r = await chamarEnvio({ acao: 'cotar', bagyPedidoId: pedido.id, ...medidas });
      const ops = r.opcoes || [];
      setOpcoes(ops);
      if (!ops.length) toast.info('Nenhuma transportadora disponível');
      else if (!meId && pedido.metodo_envio) {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const m = norm(pedido.metodo_envio);
        const hit = ops.find((o: any) => m.includes(norm(o.nome)) || norm(o.nome).includes(m));
        if (hit) setMeId(String(hit.id));
      }
    }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const gerar = async () => {
    setBusy(true);
    try {
      const r = await chamarEnvio({ acao: 'gerar', bagyPedidoId: pedido.id, servico: servFinal, ...medidas });
      toast.success(r.mensagem || `Etiqueta gerada${r.rastreio ? ` — rastreio ${r.rastreio}` : ''}`);
      if (r.etiqueta_path) window.open(await urlEtiqueta(r.etiqueta_path), '_blank');
      onDone(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Etiqueta de envio — RC-{pedido.numero_bagy}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Escolhido na Bagy: <b>{pedido.metodo_envio || '—'}</b></p>
          {pedido.etiqueta_path ? (
            <div className="space-y-2">
              <p>Etiqueta já gerada{pedido.tracking_code ? <> — rastreio <b className="font-mono">{pedido.tracking_code}</b></> : null}.</p>
              <Button size="sm" onClick={async () => window.open(await urlEtiqueta(pedido.etiqueta_path!), '_blank')}>Abrir etiqueta</Button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold">Forma de envio</label>
                <Select value={servico} onValueChange={setServico}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICOS_ENVIO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {servico !== 'RETIRADA' && (
                <div className="grid grid-cols-4 gap-2">
                  <div><label className="text-xs">Peso (kg)</label><Input value={peso} onChange={e => setPeso(e.target.value)} /></div>
                  <div><label className="text-xs">Alt. (cm)</label><Input value={dim.altura} onChange={e => setDim({ ...dim, altura: e.target.value })} /></div>
                  <div><label className="text-xs">Larg. (cm)</label><Input value={dim.largura} onChange={e => setDim({ ...dim, largura: e.target.value })} /></div>
                  <div><label className="text-xs">Comp. (cm)</label><Input value={dim.comprimento} onChange={e => setDim({ ...dim, comprimento: e.target.value })} /></div>
                </div>
              )}
              {servico === 'ME' && (
                <div className="space-y-2">
                  <Button size="sm" variant="outline" onClick={cotar} disabled={busy}>Cotar transportadoras</Button>
                  {opcoes.length > 0 && (
                    <Select value={meId} onValueChange={setMeId}>
                      <SelectTrigger><SelectValue placeholder="Escolha a transportadora" /></SelectTrigger>
                      <SelectContent>{opcoes.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.nome} — R$ {o.preco} — {o.prazo} dias</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={salvar} disabled={busy}>Só salvar forma de envio</Button>
                <Button onClick={gerar} disabled={busy || (servico === 'ME' && !meId)}>
                  {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Truck size={14} className="mr-1" />}
                  {servico === 'RETIRADA' ? 'Confirmar retirada' : 'Gerar etiqueta'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
