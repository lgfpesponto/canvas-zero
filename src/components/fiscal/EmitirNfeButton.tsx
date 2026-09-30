import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useNfeAccess } from '@/hooks/useNfeAccess';
import { getFiscalProvider } from '@/lib/fiscal/provider';
import { validarEmissao } from '@/lib/fiscal/montarXmlNfe';
import { gerarDanfePdf } from '@/lib/fiscal/danfePdf';

const vazio = {
  tipo: 'cliente', vendedor_nome: '', nome: '', cpf_cnpj: '', inscricao_estadual: '', ind_ie_dest: 9,
  email: '', telefone: '', logradouro: '', numero: '', complemento: '', bairro: '', cep: '',
  cod_municipio: '', municipio: '', uf: 'SP',
};

export function EmitirNfeButton({ order }: { order: any }) {
  const acesso = useNfeAccess();
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);
  const [dests, setDests] = useState<any[]>([]);
  const [destId, setDestId] = useState<string>('');
  const [novo, setNovo] = useState<typeof vazio | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [cfop, setCfop] = useState('5101');

  async function load() {
    const [{ data: n }, { data: d }] = await Promise.all([
      supabase.from('nfe_notas').select('*').eq('pedido_id', order.id).order('created_at', { ascending: false }),
      supabase.from('nfe_destinatarios').select('*').order('nome'),
    ]);
    setNotas(n ?? []);
    setDests(d ?? []);
    const pre = order.nfe_destinatario_id || (d ?? []).find((x: any) => x.tipo === 'revendedor' && x.vendedor_nome === order.vendedor)?.id || '';
    setDestId(pre);
  }
  useEffect(() => { if (open) load(); }, [open]);
  useEffect(() => {
    if (!open) return;
    validarEmissao(order.id, destId || null).then(r => setErros(r.erros));
    const dest = dests.find(d => d.id === destId);
    if (dest) setCfop(dest.uf === 'SP' ? '5101' : (dest.ind_ie_dest === 1 ? '6101' : '6107'));
  }, [open, destId, dests]);

  if (!acesso) return null;

  function abrirNovo(tipo: 'cliente' | 'revendedor') {
    const bagy = (order as any).bagy_endereco ?? {};
    setNovo({
      ...vazio, tipo,
      vendedor_nome: tipo === 'revendedor' ? order.vendedor : '',
      nome: tipo === 'cliente' ? (order.cliente ?? '') : (order.vendedor ?? ''),
      cpf_cnpj: tipo === 'cliente' ? (order.cliente_cpf_cnpj ?? '') : '',
      telefone: tipo === 'cliente' ? (order.cliente_whatsapp ?? '') : '',
      ...bagy,
    });
  }

  async function buscarCep() {
    if (!novo) return;
    const cep = novo.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(x => x.json());
      if (!r.erro) setNovo({ ...novo, logradouro: r.logradouro || novo.logradouro, bairro: r.bairro || novo.bairro, municipio: r.localidade, uf: r.uf, cod_municipio: r.ibge });
    } catch { /* ignore */ }
  }

  async function salvarNovo() {
    if (!novo) return;
    const obrig = ['nome', 'cpf_cnpj', 'logradouro', 'numero', 'bairro', 'cep', 'cod_municipio', 'municipio', 'uf'] as const;
    const falta = obrig.filter(k => !String(novo[k] ?? '').trim());
    if (falta.length) return toast.error('Preencha: ' + falta.join(', '));
    if (novo.ind_ie_dest === 1 && !novo.inscricao_estadual.trim()) return toast.error('Informe a Inscrição Estadual.');
    const { data, error } = await supabase.from('nfe_destinatarios').insert({ ...novo, uf: novo.uf.toUpperCase() } as any).select().single();
    if (error) return toast.error(error.message);
    toast.success('Destinatário salvo');
    setNovo(null);
    await load();
    setDestId(data.id);
  }

  async function emitir() {
    setBusy(true);
    try {
      await supabase.from('orders').update({ nfe_destinatario_id: destId } as any).eq('id', order.id);
      const r = await getFiscalProvider().transmitir(order.id, destId, cfop);
      if (r.autorizada) toast.success(`NF-e autorizada — chave ${r.chave}`);
      else toast.error(`NF-e rejeitada: ${r.cStat} - ${r.xMotivo ?? ''}`);
    } catch (e: any) {
      toast.error(e.message || String(e));
    } finally {
      setBusy(false);
      load();
    }
  }

  async function evento(nota: any, tipo: 'cancelar' | 'cce') {
    const txt = window.prompt(tipo === 'cancelar' ? 'Justificativa do cancelamento (mín. 15 caracteres):' : 'Texto da carta de correção (mín. 15 caracteres):');
    if (!txt) return;
    if (txt.trim().length < 15) return toast.error('Mínimo de 15 caracteres.');
    setBusy(true);
    try {
      const p = getFiscalProvider();
      if (tipo === 'cancelar') await p.cancelar(nota.id, txt.trim()); else await p.cartaCorrecao(nota.id, txt.trim());
      toast.success('Evento registrado');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); load(); }
  }

  async function danfe(notaId: string, tipo: 'etiqueta' | 'a4', action: 'save' | 'print') {
    setBusy(true);
    try { await gerarDanfePdf(notaId, tipo, action); }
    catch (e: any) { toast.error(e.message || String(e)); }
    finally { setBusy(false); }
  }

  const f = (k: keyof typeof vazio, label: string, cls = '') => novo && (
    <div className={cls}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input className="h-8" value={String(novo[k] ?? '')} onChange={e => setNovo({ ...novo, [k]: e.target.value })} onBlur={k === 'cep' ? buscarCep : undefined} />
    </div>
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><FileText size={16} /> NF-e</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nota fiscal — pedido {order.numero}</DialogTitle></DialogHeader>

          {notas.length > 0 && (
            <div className="space-y-2">
              {notas.map(n => (
                <div key={n.id} className="border border-border rounded-md p-2 text-sm">
                  <div className="flex justify-between"><b>Nº {n.numero} / série {n.serie}</b><span className="uppercase">{n.status}{n.ambiente === 2 ? ' (homologação)' : ''}</span></div>
                  {n.chave_acesso && <div className="font-mono text-xs break-all">{n.chave_acesso}</div>}
                  {n.protocolo && <div className="text-xs">Protocolo: {n.protocolo}</div>}
                  {n.motivo_rejeicao && <div className="text-xs text-destructive">{n.motivo_rejeicao}</div>}
                  {n.status === 'autorizada' && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => danfe(n.id, 'etiqueta', 'print')}><Printer size={14} /> DANFE etiqueta</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => danfe(n.id, 'a4', 'print')}><Printer size={14} /> Imprimir DANFE</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => danfe(n.id, 'a4', 'save')}><Download size={14} /> Baixar PDF</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => evento(n, 'cce')}>Carta de correção</Button>
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => evento(n, 'cancelar')}>Cancelar nota</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!notas.some(n => n.status === 'autorizada' || n.status === 'processando') && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Destinatário</label>
                <Select value={destId} onValueChange={setDestId}>
                  <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                  <SelectContent>
                    {dests.map(d => <SelectItem key={d.id} value={d.id}>{d.nome} — {d.cpf_cnpj} ({d.tipo === 'revendedor' ? 'revendedor' : 'cliente'}, {d.uf})</SelectItem>)}
                  </SelectContent>
                </Select>
                {destId && (
                  <div className="mt-2 max-w-xs">
                    <label className="text-sm font-medium">CFOP da nota</label>
                    <Select value={cfop} onValueChange={setCfop}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5101">5101 — SP / contribuinte</SelectItem>
                        <SelectItem value="6101">6101 — outro estado / contribuinte</SelectItem>
                        <SelectItem value="6107">6107 — outro estado / não contribuinte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => abrirNovo('cliente')}>+ Cliente do pedido</Button>
                  <Button size="sm" variant="ghost" onClick={() => abrirNovo('revendedor')}>+ Revendedor ({order.vendedor})</Button>
                </div>
              </div>

              {novo && (
                <div className="grid grid-cols-6 gap-2 border border-border rounded-md p-3">
                  {f('nome', 'Nome / Razão social', 'col-span-4')}
                  {f('cpf_cnpj', 'CPF/CNPJ', 'col-span-2')}
                  <div className="col-span-3">
                    <label className="text-xs text-muted-foreground">Contribuinte ICMS</label>
                    <Select value={String(novo.ind_ie_dest)} onValueChange={v => setNovo({ ...novo, ind_ie_dest: Number(v) })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Contribuinte (tem IE)</SelectItem>
                        <SelectItem value="2">Isento de IE</SelectItem>
                        <SelectItem value="9">Não contribuinte / pessoa física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {f('inscricao_estadual', 'Inscrição Estadual', 'col-span-3')}
                  {f('cep', 'CEP', 'col-span-2')}
                  {f('logradouro', 'Rua', 'col-span-4')}
                  {f('numero', 'Número', 'col-span-1')}
                  {f('complemento', 'Complemento', 'col-span-2')}
                  {f('bairro', 'Bairro', 'col-span-3')}
                  {f('municipio', 'Cidade', 'col-span-3')}
                  {f('uf', 'UF', 'col-span-1')}
                  {f('cod_municipio', 'Cód. IBGE', 'col-span-2')}
                  {f('email', 'E-mail', 'col-span-3')}
                  {f('telefone', 'Telefone', 'col-span-3')}
                  <div className="col-span-6 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setNovo(null)}>Cancelar</Button>
                    <Button size="sm" onClick={salvarNovo}>Salvar destinatário</Button>
                  </div>
                </div>
              )}

              {erros.length > 0 && (
                <ul className="text-sm text-destructive list-disc pl-5">{erros.map(e => <li key={e}>{e}</li>)}</ul>
              )}
            </div>
          )}

          <DialogFooter>
            {!notas.some(n => n.status === 'autorizada' || n.status === 'processando') && (
              <Button disabled={busy || erros.length > 0 || !destId} onClick={emitir}>
                {busy && <Loader2 className="animate-spin" size={16} />} Emitir NF-e
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
