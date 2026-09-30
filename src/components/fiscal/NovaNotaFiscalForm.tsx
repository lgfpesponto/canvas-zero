import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ArrowLeft, ChevronDown, Eye, Loader2, Plus, Save, Send, Trash2 } from 'lucide-react';
import { ncmPorDescricao, formatNcm } from '@/lib/fiscal/ncm';
import { transmitirNotaBagy, type NotaRascunho } from '@/lib/fiscal/nfeBagy';

const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dig = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const num = (s: string) => Number(String(s || '0').replace(/\./g, '').replace(',', '.')) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

type Item = { codigo: string; descricao: string; ncm: string; cfop: string; unidade: string; qtd: string; valor: string; csosn: string };
const itemVazio = (): Item => ({ codigo: '', descricao: '', ncm: '', cfop: '', unidade: 'UN', qtd: '1', valor: '', csosn: '' });
const destVazio = {
  nome: '', cpf_cnpj: '', inscricao_estadual: '', ind_ie_dest: 9, email: '', telefone: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cep: '', cod_municipio: '', municipio: '', uf: '',
};

const NATUREZAS: [string, string][] = [
  ['5101', 'VENDA NO ESTADO'], ['5102', 'VENDA NO ESTADO'], ['5202', 'DEVOLUÇÃO DE COMPRA'],
  ['5901', 'REMESSA P/ INDUSTRIALIZAÇÃO'], ['5902', 'RETORNO DE INDUSTRIALIZAÇÃO'],
  ['5124', 'INDUSTRIALIZAÇÃO EFETUADA P/ OUTRA EMPRESA'], ['5910', 'REMESSA EM BONIFICAÇÃO'],
  ['5915', 'REMESSA P/ CONSERTO'], ['5916', 'RETORNO DE CONSERTO'], ['6101', 'VENDA FORA DO ESTADO'],
  ['6102', 'VENDA FORA DO ESTADO'], ['6902', 'RETORNO DE INDUSTRIALIZAÇÃO'],
];
const PAGAMENTOS: [string, string][] = [['01', 'Dinheiro'], ['03', 'Cartão de crédito'], ['04', 'Cartão de débito'], ['15', 'Boleto'], ['17', 'PIX'], ['90', 'Sem pagamento'], ['99', 'Outros']];
const agoraLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const hojeMais = (dias: number) => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
type Parcela = { dias: string; venc: string; valor: string; forma: string; obs: string };
const extraVazio = () => ({
  loja: '', cnpjEmit: '', razaoEmit: '', cfopNat: '', dhEmi: agoraLocal(), dhSaida: agoraLocal(), vendedor: '',
  transp: { razao: '', cnpj: '', ie: '', endereco: '', municipio: '', uf: '', placa: '', ufPlaca: '', rntc: '', qVol: '', esp: '', marca: '', nVol: '', pesoL: '', pesoB: '' },
  entregaDif: false,
  entrega: { logradouro: '', numero: '', bairro: '', municipio: '', uf: '', cep: '' },
  condPag: '', parcelas: [{ dias: '0', venc: hojeMais(0), valor: '', forma: '17', obs: '' }] as Parcela[],
});

function Secao({ titulo, children, aberta = true }: { titulo: string; children: React.ReactNode; aberta?: boolean }) {
  const [open, setOpen] = useState(aberta);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card shadow-sm">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-bold">
        {titulo} <ChevronDown size={16} className={open ? 'rotate-180 text-muted-foreground transition' : 'text-muted-foreground transition'} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
const Campo = ({ label, children, className = '', hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) => (
  <div className={className}>
    <label className="mb-1 block text-xs font-medium text-foreground/80">{label}</label>{children}
    {hint && <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{hint}</p>}
  </div>
);
const Sel = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm ${p.className ?? ''}`} />
);

export default function NovaNotaFiscalForm({ rascunhoId, onClose }: { rascunhoId?: string | null; onClose: () => void }) {
  const [cfg, setCfg] = useState<any>(null);
  const [refs, setRefs] = useState<any[]>([]);
  const [dests, setDests] = useState<any[]>([]);
  const [destId, setDestId] = useState('');
  const [dest, setDest] = useState<any>({ ...destVazio });
  const [natOp, setNatOp] = useState('VENDA DE MERCADORIA');
  const [finNFe, setFinNFe] = useState(1);
  const [indPres, setIndPres] = useState(1);
  const [consFinal, setConsFinal] = useState(1);
  const [itens, setItens] = useState<Item[]>([itemVazio()]);
  const [frete, setFrete] = useState(''); const [seguro, setSeguro] = useState('');
  const [outras, setOutras] = useState(''); const [desconto, setDesconto] = useState('');
  const [modFrete, setModFrete] = useState(9);
  const [tPag, setTPag] = useState('17');
  const [pedidoExterno, setPedidoExterno] = useState('');
  const [infCpl, setInfCpl] = useState(''); const [infFisco, setInfFisco] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [rascId, setRascId] = useState<string | null>(rascunhoId ?? null);
  const [ex, setEx] = useState(extraVazio());
  const setT = (k: string, v: string) => setEx(s => ({ ...s, transp: { ...s.transp, [k]: v } }));
  const setE = (k: string, v: string) => setEx(s => ({ ...s, entrega: { ...s.entrega, [k]: v } }));
  const setP = (i: number, patch: Partial<Parcela>) => setEx(s => ({ ...s, parcelas: s.parcelas.map((p, k) => k === i ? { ...p, ...patch } : p) }));

  useEffect(() => {
    (async () => {
      const [c, r, d] = await Promise.all([
        supabase.from('nfe_config').select('*').order('created_at').limit(1).maybeSingle(),
        supabase.from('nfe_tributacao_referencias').select('*').order('referencia'),
        supabase.from('nfe_destinatarios').select('*').order('nome'),
      ]);
      setCfg(c.data); setRefs(r.data || []); setDests(d.data || []);
      if (rascunhoId) {
        const { data } = await supabase.from('nfe_notas').select('destinatario_snapshot').eq('id', rascunhoId).maybeSingle();
        const f = (data?.destinatario_snapshot as any)?._form;
        if (f) {
          setDest(f.dest); setDestId(f.destId || ''); setNatOp(f.natOp); setFinNFe(f.finNFe); setIndPres(f.indPres);
          setConsFinal(f.consFinal); setItens(f.itens); setFrete(f.frete); setSeguro(f.seguro); setOutras(f.outras);
          setDesconto(f.desconto); setModFrete(f.modFrete); setTPag(f.tPag); setPedidoExterno(f.pedidoExterno);
          setInfCpl(f.infCpl); setInfFisco(f.infFisco);
          if (f.ex) setEx({ ...extraVazio(), ...f.ex });
        }
      }
    })();
  }, [rascunhoId]);

  const interno = !dest.uf || String(dest.uf).toUpperCase() === String(cfg?.uf ?? '').toUpperCase();
  const cfopPadrao = ex.cfopNat
    ? (interno ? '5' : '6') + ex.cfopNat.slice(1)
    : dest.ind_ie_dest === 1 ? (interno ? '5101' : '6101') : (interno ? '5107' : '6107');
  const escolherNatureza = (cfop: string) => {
    const n = NATUREZAS.find(x => x[0] === cfop);
    setEx(s => ({ ...s, cfopNat: cfop }));
    if (n) setNatOp(n[1]);
  };

  const escolherDest = (id: string) => {
    setDestId(id);
    const d = dests.find(x => x.id === id);
    if (d) setDest({ ...destVazio, ...d });
  };
  const buscarCep = async () => {
    const cep = dig(dest.cep); if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(x => x.json());
      if (!r.erro) setDest((d: any) => ({ ...d, logradouro: r.logradouro || d.logradouro, bairro: r.bairro || d.bairro, municipio: r.localidade, uf: r.uf, cod_municipio: r.ibge }));
    } catch { /* ignore */ }
  };
  const setItem = (i: number, patch: Partial<Item>) => setItens(arr => arr.map((it, k) => {
    if (k !== i) return it;
    const n = { ...it, ...patch };
    if (patch.descricao !== undefined) { const regra = ncmPorDescricao(patch.descricao); if (regra) n.ncm = regra.ncm; }
    return n;
  }));
  const addReferencia = (id: string) => {
    const r = refs.find(x => x.id === id); if (!r) return;
    setItens(arr => [...arr.filter(x => x.descricao || x.valor), {
      ...itemVazio(), codigo: r.referencia, descricao: r.descricao || r.referencia, ncm: dig(r.ncm),
      cfop: r.cfop_padrao || '', unidade: r.unidade_comercial || 'UN', csosn: r.csosn || r.cst_icms || '',
    }]);
  };

  const valorProdutos = r2(itens.reduce((s, it) => s + num(it.qtd) * num(it.valor), 0));
  const total = r2(valorProdutos + num(frete) + num(seguro) + num(outras) - num(desconto));

  const erros = useMemo(() => {
    const e: string[] = [];
    if (!cfg) e.push('Emitente não configurado (Configurações NF-e).');
    if (!dest.nome) e.push('Selecione ou preencha o destinatário');
    const doc = dig(dest.cpf_cnpj); if (doc.length !== 11 && doc.length !== 14) e.push('CPF/CNPJ do destinatário inválido');
    ['logradouro', 'numero', 'bairro', 'municipio', 'uf'].forEach(k => { if (!dest[k]) e.push(`Destinatário: preencha ${k}`); });
    if (dig(dest.cep).length !== 8) e.push('CEP do destinatário inválido');
    if (dig(dest.cod_municipio).length !== 7) e.push('Código IBGE do município (7 dígitos)');
    if (dest.ind_ie_dest === 1 && !dest.inscricao_estadual) e.push('Inscrição estadual do destinatário');
    itens.forEach((it, i) => {
      if (!it.descricao) e.push(`Descrição do item ${i + 1}`);
      if (dig(it.ncm).length !== 8) e.push(`NCM do item ${i + 1}`);
      if (num(it.qtd) <= 0) e.push(`Quantidade do item ${i + 1}`);
      if (num(it.valor) <= 0) e.push(`Valor unitário do item ${i + 1}`);
      if (!it.csosn) e.push(`CSOSN do item ${i + 1}`);
    });
    if (total <= 0) e.push('Total da nota deve ser maior que zero');
    return e;
  }, [cfg, dest, itens, total]);

  const formState = () => ({ dest, destId, natOp, finNFe, indPres, consFinal, itens, frete, seguro, outras, desconto, modFrete, tPag, pedidoExterno, infCpl, infFisco, ex });

  const infExtras = () => {
    const t = ex.transp, p: string[] = [];
    if (t.razao) p.push(`Transportador: ${t.razao}${t.cnpj ? ` CNPJ ${t.cnpj}` : ''}${t.placa ? ` placa ${t.placa}${t.ufPlaca ? `/${t.ufPlaca}` : ''}` : ''}.`);
    if (t.qVol) p.push(`Volumes: ${t.qVol}${t.esp ? ` ${t.esp}` : ''}${t.pesoB ? `, peso bruto ${t.pesoB} kg` : ''}${t.pesoL ? `, líquido ${t.pesoL} kg` : ''}.`);
    if (ex.entregaDif) { const e = ex.entrega; p.push(`Entrega: ${e.logradouro}, ${e.numero} - ${e.bairro} - ${e.municipio}/${e.uf} CEP ${e.cep}.`); }
    if (ex.condPag) p.push(`Pagamento: ${ex.condPag}.`);
    if (ex.parcelas.length > 1) p.push(`Parcelas: ${ex.parcelas.map((x, i) => `${i + 1}) ${x.venc.split('-').reverse().join('/')} ${brl(num(x.valor))}`).join('; ')}.`);
    if (ex.vendedor) p.push(`Vendedor: ${ex.vendedor}.`);
    return p.join(' ');
  };

  const salvarRascunho = async () => {
    setBusy('save');
    try {
      const row = {
        numero: 0, serie: cfg?.serie ?? 1, modelo: 55, ambiente: cfg?.ambiente ?? 2, status: 'rascunho', natureza_operacao: natOp,
        valor_produtos: valorProdutos, valor_total: total, destinatario_snapshot: { ...dest, _form: formState() },
        observacoes: 'Nota avulsa (rascunho)',
      };
      if (rascId) {
        const { error } = await supabase.from('nfe_notas').update(row as any).eq('id', rascId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('nfe_notas').insert(row as any).select('id').single();
        if (error) throw error; setRascId(data.id);
      }
      toast.success('Rascunho salvo.');
    } catch (e: any) { toast.error(e.message || 'Falha ao salvar.'); }
    finally { setBusy(null); }
  };

  const emitir = async () => {
    setBusy('emit');
    try {
      const qtdTotal = itens.reduce((s, it) => s + num(it.qtd) * num(it.valor), 0) || 1;
      let fAcum = 0, dAcum = 0;
      const f = num(frete), d = num(desconto);
      const itensNota = itens.map((it, k) => {
        const vt = r2(num(it.qtd) * num(it.valor));
        const last = k === itens.length - 1;
        const fi = last ? r2(f - fAcum) : r2(f * vt / qtdTotal); fAcum += fi;
        const di = last ? r2(d - dAcum) : r2(d * vt / qtdTotal); dAcum += di;
        const ref = refs.find(r => r.referencia === it.codigo);
        return {
          codigo: it.codigo || String(k + 1), descricao: it.descricao, ncm: dig(it.ncm), cfop: it.cfop || cfopPadrao,
          unidade: it.unidade || 'UN', quantidade: num(it.qtd), valorUnit: num(it.valor), valorTotal: vt,
          desconto: di, frete: fi, csosn: it.csosn, origem: Number(ref?.origem_mercadoria ?? 0),
        };
      });
      const destFinal = { ...dest, cep: dig(dest.cep), cod_municipio: dig(dest.cod_municipio), telefone: dig(dest.telefone), uf: String(dest.uf).toUpperCase() };
      delete (destFinal as any)._form;
      const r: NotaRascunho = {
        bagyPedidoId: '', numeroBagy: '', portalOrderId: null,
        emitente: { ...cfg, cnpj: dig(ex.cnpjEmit) || cfg?.cnpj, razao_social: ex.razaoEmit || cfg?.razao_social },
        destinatario: destFinal, itens: itensNota,
        valorProdutos, desconto: d, frete: f, valorTotal: total, cfop: cfopPadrao, ambiente: cfg?.ambiente ?? 2, erros: [],
        notaExistente: null, natOp, finNFe, indPres, indFinal: consFinal, tPag: ex.parcelas[0]?.forma || tPag, modFrete, seguro: num(seguro), outras: num(outras),
        infCpl: [pedidoExterno && `Pedido ${pedidoExterno}.`, infCpl, infFisco, infExtras()].filter(Boolean).join(' '),
        observacoes: `Nota avulsa${pedidoExterno ? ` — pedido ${pedidoExterno}` : ''}`,
      };
      const res = await transmitirNotaBagy(r);
      if (rascId) await supabase.from('nfe_notas').delete().eq('id', rascId);
      if (res.autorizada) { toast.success(`NF-e nº ${res.numero} autorizada.`); onClose(); }
      else toast.error(`NF-e rejeitada: ${res.motivo}`);
      setPreview(false);
    } catch (e: any) { toast.error(e.message || 'Falha na emissão.'); }
    finally { setBusy(null); }
  };

  const d = (k: string, label: string, className = '', extra: any = {}) => (
    <Campo label={label} className={className}>
      <Input value={String(dest[k] ?? '')} onChange={e => setDest({ ...dest, [k]: e.target.value })} {...extra} />
    </Campo>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose}><ArrowLeft size={14} className="mr-1" /> Voltar</Button>
          <div>
            <h2 className="text-xl font-bold">Nova Nota Fiscal</h2>
            <p className="text-xs text-muted-foreground">Emissão NF-e 4.00 — ambiente {cfg?.ambiente === 1 ? 'Produção' : 'Homologação'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye size={14} className="mr-1" /> Pré-visualizar</Button>
          <Button variant="outline" size="sm" disabled={busy === 'save'} onClick={salvarRascunho}>
            {busy === 'save' ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />} Salvar rascunho
          </Button>
          <Button size="sm" disabled={erros.length > 0} onClick={() => setPreview(true)}><Send size={14} className="mr-1" /> Emitir NF-e</Button>
        </div>
      </div>

      {erros.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Falta preencher para emitir a NF-e</div>
          <ul className="ml-8 mt-1 list-disc text-xs">{erros.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <Secao titulo="Cabeçalho da nota">
        <div className="grid gap-3 md:grid-cols-4">
          <Campo label="CNPJ emitente"><Input value={cfg?.cnpj ?? ''} disabled /></Campo>
          <Campo label="Razão social emitente" className="md:col-span-2"><Input value={cfg?.razao_social ?? ''} disabled /></Campo>
          <Campo label="Série / Número"><Input value={`${cfg?.serie ?? ''} / reservado na emissão`} disabled /></Campo>
          <Campo label="Natureza da operação" className="md:col-span-2">
            <Input list="naturezas" value={natOp} onChange={e => setNatOp(e.target.value.toUpperCase())} />
            <datalist id="naturezas">{NATUREZAS.map(n => <option key={n} value={n} />)}</datalist>
          </Campo>
          <Campo label="Finalidade"><Sel value={finNFe} onChange={e => setFinNFe(Number(e.target.value))}>
            <option value={1}>1 - NF-e normal</option><option value={2}>2 - Complementar</option><option value={3}>3 - Ajuste</option>
          </Sel></Campo>
          <Campo label="Indicador de presença"><Sel value={indPres} onChange={e => setIndPres(Number(e.target.value))}>
            <option value={1}>1 - Presencial</option><option value={2}>2 - Internet</option><option value={3}>3 - Teleatendimento</option><option value={9}>9 - Outros</option>
          </Sel></Campo>
          <Campo label="Consumidor final"><Sel value={consFinal} onChange={e => setConsFinal(Number(e.target.value))}>
            <option value={1}>Sim</option><option value={0}>Não</option>
          </Sel></Campo>
        </div>
      </Secao>

      <Secao titulo="Destinatário">
        <div className="grid gap-3 md:grid-cols-4">
          <Campo label="Cliente cadastrado" className="md:col-span-2">
            <Sel value={destId} onChange={e => escolherDest(e.target.value)}>
              <option value="">Selecionar cliente (ou preencha abaixo)</option>
              {dests.map(x => <option key={x.id} value={x.id}>{x.nome} — {x.cpf_cnpj}</option>)}
            </Sel>
          </Campo>
          {d('nome', 'Razão social / Nome', 'md:col-span-2')}
          {d('cpf_cnpj', 'CPF/CNPJ')}
          {d('inscricao_estadual', 'Inscrição estadual')}
          <Campo label="Indicador IE"><Sel value={dest.ind_ie_dest} onChange={e => setDest({ ...dest, ind_ie_dest: Number(e.target.value) })}>
            <option value={1}>1 - Contribuinte</option><option value={2}>2 - Isento</option><option value={9}>9 - Não contribuinte</option>
          </Sel></Campo>
          {d('email', 'E-mail NF-e')}
          {d('cep', 'CEP', '', { onBlur: buscarCep })}
          {d('logradouro', 'Logradouro', 'md:col-span-2')}
          {d('numero', 'Número')}
          {d('complemento', 'Complemento')}
          {d('bairro', 'Bairro')}
          {d('cod_municipio', 'Município (IBGE 7d)')}
          {d('municipio', 'Município')}
          {d('uf', 'UF')}
          {d('telefone', 'Telefone')}
        </div>
      </Secao>

      <Secao titulo={`Itens (${itens.length})`}>
        <Sel value="" onChange={e => addReferencia(e.target.value)} className="mb-3 h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Adicionar referência</option>
          {refs.map(r => <option key={r.id} value={r.id}>{r.referencia}{r.descricao ? ` — ${r.descricao}` : ''}</option>)}
        </Sel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr><th className="p-2">#</th><th className="p-2">Código</th><th className="p-2">Descrição</th><th className="p-2">NCM</th><th className="p-2">CFOP</th><th className="p-2">CSOSN</th><th className="p-2">Un</th><th className="p-2">Qtd</th><th className="p-2">Vlr unit.</th><th className="p-2 text-right">Subtotal</th><th /></tr>
            </thead>
            <tbody>
              {itens.map((it, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-1"><Input className="w-24" value={it.codigo} onChange={e => setItem(i, { codigo: e.target.value })} /></td>
                  <td className="p-1"><Input className="min-w-[200px]" value={it.descricao} onChange={e => setItem(i, { descricao: e.target.value })} /></td>
                  <td className="p-1"><Input className="w-28" value={it.ncm} onChange={e => setItem(i, { ncm: e.target.value })} />
                    {dig(it.ncm).length === 8 && <span className="text-[10px] text-muted-foreground">{formatNcm(dig(it.ncm))}</span>}</td>
                  <td className="p-1"><Input className="w-20" value={it.cfop} placeholder={cfopPadrao} onChange={e => setItem(i, { cfop: e.target.value })} /></td>
                  <td className="p-1"><Input className="w-16" value={it.csosn} onChange={e => setItem(i, { csosn: e.target.value })} /></td>
                  <td className="p-1"><Input className="w-14" value={it.unidade} onChange={e => setItem(i, { unidade: e.target.value.toUpperCase() })} /></td>
                  <td className="p-1"><Input className="w-16" inputMode="decimal" value={it.qtd} onChange={e => setItem(i, { qtd: e.target.value })} /></td>
                  <td className="p-1"><Input className="w-24" inputMode="decimal" value={it.valor} onChange={e => setItem(i, { valor: e.target.value })} /></td>
                  <td className="p-2 text-right font-mono text-xs">{brl(num(it.qtd) * num(it.valor))}</td>
                  <td className="p-1"><Button variant="ghost" size="sm" disabled={itens.length === 1} onClick={() => setItens(a => a.filter((_, k) => k !== i))}><Trash2 size={14} className="text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setItens(a => [...a, itemVazio()])}><Plus size={14} className="mr-1" /> Adicionar item</Button>
        <p className="mt-2 text-xs text-muted-foreground">O NCM é preenchido sozinho pelo nome (bota/texana, cinto, gravata, regata, creme). CFOP em branco usa {cfopPadrao}.</p>
      </Secao>

      <Secao titulo="Totais e ajustes">
        <div className="grid gap-3 md:grid-cols-4">
          <Campo label="Produtos"><Input value={brl(valorProdutos)} disabled /></Campo>
          <Campo label="Frete"><Input inputMode="decimal" value={frete} onChange={e => setFrete(e.target.value)} /></Campo>
          <Campo label="Seguro"><Input inputMode="decimal" value={seguro} onChange={e => setSeguro(e.target.value)} /></Campo>
          <Campo label="Outras despesas"><Input inputMode="decimal" value={outras} onChange={e => setOutras(e.target.value)} /></Campo>
          <Campo label="Desconto"><Input inputMode="decimal" value={desconto} onChange={e => setDesconto(e.target.value)} /></Campo>
          <Campo label="Total da nota"><Input value={brl(total)} disabled /></Campo>
        </div>
      </Secao>

      <Secao titulo="Transportador / volumes" aberta={false}>
        <Campo label="Modalidade do frete" className="max-w-sm"><Sel value={modFrete} onChange={e => setModFrete(Number(e.target.value))}>
          <option value={0}>0 - Por conta do emitente</option><option value={1}>1 - Por conta do destinatário</option>
          <option value={2}>2 - Por conta de terceiros</option><option value={9}>9 - Sem frete</option>
        </Sel></Campo>
      </Secao>

      <Secao titulo="Pagamento" aberta={false}>
        <Campo label="Forma de pagamento" className="max-w-sm"><Sel value={tPag} onChange={e => setTPag(e.target.value)}>
          {PAGAMENTOS.map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}
        </Sel></Campo>
      </Secao>

      <Secao titulo="Informações adicionais" aberta={false}>
        <div className="grid gap-3">
          <Campo label="Nº pedido loja externa"><Input value={pedidoExterno} onChange={e => setPedidoExterno(e.target.value)} /></Campo>
          <Campo label="Informações complementares (infCpl)"><Textarea value={infCpl} onChange={e => setInfCpl(e.target.value)} /></Campo>
          <Campo label="Informações de interesse do fisco (serão incluídas nas informações complementares)"><Textarea value={infFisco} onChange={e => setInfFisco(e.target.value)} /></Campo>
        </div>
      </Secao>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Conferir nota antes de enviar</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><b>Natureza:</b> {natOp}</p>
            <p><b>Destinatário:</b> {dest.nome || '—'} — {dest.cpf_cnpj || '—'}</p>
            <p className="text-xs text-muted-foreground">{dest.logradouro}, {dest.numero} - {dest.bairro} - {dest.municipio}/{dest.uf} CEP {dest.cep}</p>
            <div className="max-h-56 overflow-auto rounded border">
              {itens.map((it, i) => (
                <div key={i} className="flex justify-between border-b px-2 py-1 text-xs">
                  <span>{it.descricao || '—'} · NCM {it.ncm || '—'} · {it.qtd} {it.unidade}</span>
                  <span>{brl(num(it.qtd) * num(it.valor))}</span>
                </div>
              ))}
            </div>
            <p>Produtos {brl(valorProdutos)} · Frete {brl(num(frete))} · Desconto {brl(num(desconto))}</p>
            <p className="text-base font-bold">Total: {brl(total)}</p>
            {erros.length > 0 && <ul className="list-disc pl-5 text-xs text-destructive">{erros.map(e => <li key={e}>{e}</li>)}</ul>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreview(false)}>Voltar</Button>
            <Button disabled={erros.length > 0 || busy === 'emit'} onClick={emitir}>
              {busy === 'emit' && <Loader2 size={14} className="mr-1 animate-spin" />} Confirmar e enviar à SEFAZ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
