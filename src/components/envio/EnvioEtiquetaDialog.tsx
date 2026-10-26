import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SERVICOS_ENVIO, TRANSPORTADORAS_ME, chamarEnvio, servicoEfetivo, urlEtiqueta } from '@/lib/envio';
import { avisosEndereco } from '@/lib/envioLimites';

type Ped = { id: string; numero_bagy: string; metodo_envio: string | null; envio_servico?: string | null; etiqueta_path?: string | null; tracking_code?: string | null };

export function EnvioEtiquetaDialog({ pedido, onClose, onDone }: { pedido: Ped | null; onClose: () => void; onDone: () => void }) {
  const [servico, setServico] = useState('PAC');
  const [meId, setMeId] = useState('');
  const [opcoes, setOpcoes] = useState<{ id: number; nome: string; preco: string; prazo: number }[]>([]);
  const [peso, setPeso] = useState('2');
  const [dim, setDim] = useState({ altura: '15', largura: '30', comprimento: '35' });
  const [busy, setBusy] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [end, setEnd] = useState<any>({});
  const [endOrig, setEndOrig] = useState<string>('{}');
  const dig = (v: any) => String(v ?? '').replace(/\D/g, '');
  const campo = (e: any, ...k: string[]) => { for (const x of k) if (e?.[x]) return String(e[x]); return ''; };
  const avisos = avisosEndereco(end);

  useEffect(() => {
    if (!pedido) return;
    const s = servicoEfetivo(pedido.envio_servico, pedido.metodo_envio);
    setServico(s.startsWith('ME') ? 'ME' : s);
    setMeId(s.startsWith('ME:') ? s.slice(3) : '');
    setOpcoes([]);
    setLiberada(false);
    supabase.from('bagy_pedidos').select('endereco').eq('id', pedido.id).maybeSingle().then(({ data }) => {
      const e: any = data?.endereco || {};
      const n = { cep: campo(e, 'cep', 'zipcode'), logradouro: campo(e, 'logradouro', 'street', 'rua'), numero: campo(e, 'numero', 'number'),
        complemento: campo(e, 'complemento', 'complement', 'detail'), bairro: campo(e, 'bairro', 'district', 'neighborhood'), cidade: campo(e, 'cidade', 'city'), uf: campo(e, 'uf', 'state') };
      (n as any)._raw = e; setEnd(n); setEndOrig(JSON.stringify(n));
    });
  }, [pedido]);

  if (!pedido) return null;
  const medidas = { peso: Number(peso), altura: Number(dim.altura), largura: Number(dim.largura), comprimento: Number(dim.comprimento) };
  const servFinal = servico === 'ME' ? (meId ? `ME:${meId}` : 'ME') : servico;

  const buscarCep = async (cep: string) => {
    if (dig(cep).length !== 8) return;
    try { const r = await fetch(`https://viacep.com.br/ws/${dig(cep)}/json/`).then(x => x.json());
      if (r.erro) toast.error('CEP não encontrado'); else setEnd((e: any) => ({ ...e, logradouro: r.logradouro || e.logradouro, bairro: r.bairro || e.bairro, cidade: r.localidade, uf: r.uf, ibge: r.ibge }));
    } catch { /* ignore */ }
  };
  const salvarEndereco = async () => {
    if (JSON.stringify(end) === endOrig) return;
    const { _raw, ibge, ...f } = end;
    const novo = { ...(_raw || {}), ...f, cep: dig(f.cep), zipcode: dig(f.cep), street: f.logradouro, number: f.numero, complement: f.complemento,
      district: f.bairro, city: f.cidade, state: f.uf, ...(ibge ? { city_ibge_id: ibge } : {}) };
    const { error } = await supabase.from('bagy_pedidos').update({ endereco: novo } as any).eq('id', pedido!.id);
    if (error) throw new Error('Falha ao salvar endereço: ' + error.message);
    setEndOrig(JSON.stringify(end));
  };
  const salvar = async () => {
    setBusy(true);
    try { await salvarEndereco(); await chamarEnvio({ acao: 'salvar_servico', bagyPedidoId: pedido.id, servico: servFinal }); toast.success('Forma de envio salva'); onDone(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const cotar = async () => {
    setBusy(true);
    try {
      await salvarEndereco();
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
      await salvarEndereco();
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
          {pedido.etiqueta_path && !liberada ? (
            <div className="space-y-2">
              <p>Etiqueta já gerada{pedido.tracking_code ? <> — rastreio <b className="font-mono">{pedido.tracking_code}</b></> : null}.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={async () => window.open(await urlEtiqueta(pedido.etiqueta_path!), '_blank')}>Abrir etiqueta</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
                  setBusy(true);
                  try {
                    const { data: bp } = await supabase.from('bagy_pedidos')
                      .select('payload, etiqueta_path, tracking_code, tracking_url, envio_provider, envio_provider_id, envio_servico, etiqueta_gerada_em')
                      .eq('id', pedido.id).maybeSingle();
                    if (bp && (bp.etiqueta_path || bp.tracking_code || bp.envio_provider_id)) {
                      const payload: any = (bp.payload && typeof bp.payload === 'object') ? bp.payload : {};
                      const anteriores = Array.isArray(payload.envios_anteriores) ? payload.envios_anteriores : [];
                      anteriores.push({
                        motivo: 'nova_etiqueta_manual', arquivado_em: new Date().toISOString(),
                        etiqueta_path: bp.etiqueta_path, tracking_code: bp.tracking_code, tracking_url: bp.tracking_url,
                        envio_provider: bp.envio_provider, envio_provider_id: bp.envio_provider_id, envio_servico: bp.envio_servico,
                        etiqueta_gerada_em: bp.etiqueta_gerada_em,
                      });
                      const { error } = await supabase.from('bagy_pedidos').update({
                        payload: { ...payload, envios_anteriores: anteriores },
                        etiqueta_path: null, tracking_code: null, tracking_url: null, envio_provider_id: null, etiqueta_gerada_em: null,
                      } as any).eq('id', pedido.id);
                      if (error) throw new Error(error.message);
                    }
                    setLiberada(true);
                    toast.success('Etiqueta antiga guardada no histórico. Gere a nova abaixo.');
                  } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
                }}>Gerar nova etiqueta</Button>
              </div>
              <p className="text-xs text-muted-foreground">A etiqueta atual fica guardada no histórico do pedido.</p>
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
                <div className="space-y-2 rounded border p-2">
                  <label className="text-xs font-semibold">Endereço de entrega</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-xs">CEP</label><Input value={end.cep || ''} onChange={e => setEnd({ ...end, cep: e.target.value })} onBlur={e => buscarCep(e.target.value)} /></div>
                    <div className="col-span-2"><label className="text-xs">Rua</label><Input value={end.logradouro || ''} onChange={e => setEnd({ ...end, logradouro: e.target.value })} /></div>
                    <div><label className="text-xs">Número</label><Input value={end.numero || ''} onChange={e => setEnd({ ...end, numero: e.target.value })} /></div>
                    <div className="col-span-2"><label className="text-xs">Complemento</label><Input value={end.complemento || ''} onChange={e => setEnd({ ...end, complemento: e.target.value })} /></div>
                    <div><label className="text-xs">Bairro</label><Input value={end.bairro || ''} onChange={e => setEnd({ ...end, bairro: e.target.value })} /></div>
                    <div><label className="text-xs">Cidade</label><Input value={end.cidade || ''} onChange={e => setEnd({ ...end, cidade: e.target.value })} /></div>
                    <div><label className="text-xs">UF</label><Input maxLength={2} value={end.uf || ''} onChange={e => setEnd({ ...end, uf: e.target.value.toUpperCase() })} /></div>
                  </div>
                  {avisos.length > 0 && (
                    <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                      <b>A etiqueta vai dar erro na transportadora.</b> Encurte aqui antes de gerar:
                      <ul className="list-disc pl-4">{avisos.map(a => <li key={a}>{a}</li>)}</ul>
                      Dica: abrevie (Edifício → Ed., Apartamento → Ap., Sala → Sl.) e deixe só números no campo Número.
                    </div>
                  )}
                </div>
              )}
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
                  <Button size="sm" variant="outline" onClick={cotar} disabled={busy}>Cotar preços</Button>
                  <Select value={meId} onValueChange={setMeId}>
                    <SelectTrigger><SelectValue placeholder="Escolha a transportadora" /></SelectTrigger>
                    <SelectContent>
                      {(opcoes.length ? opcoes.map(o => ({ id: String(o.id), nome: `${o.nome} — R$ ${o.preco} — ${o.prazo} dias` })) : TRANSPORTADORAS_ME)
                        .concat(meId && !opcoes.some(o => String(o.id) === meId) && !TRANSPORTADORAS_ME.some(t => t.id === meId) ? [{ id: meId, nome: `Serviço ${meId}` }] : [])
                        .map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={salvar} disabled={busy}>Só salvar forma de envio</Button>
                <Button onClick={gerar} disabled={busy || (servico === 'ME' && !meId) || (servico !== 'RETIRADA' && avisos.length > 0)}>
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
