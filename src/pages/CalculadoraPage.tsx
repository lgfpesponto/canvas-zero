import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Calculator, Settings, Copy, Eraser, Save, Trash2, Plus, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import OrderPage from './OrderPage';
import BeltOrderPage from './BeltOrderPage';
import type { CalcData } from '@/components/calculadora/CalcEmitter';
import { useCalcAccess } from '@/hooks/useCalcAccess';

type Item = { id?: string; nome: string; tipo: 'real' | 'percentual'; valor: number; ordem: number };
type Orcamento = {
  id: string; nome: string; whatsapp: string | null; tipo: string; form_data: Record<string, string>;
  discriminacao: string | null; preco_custo: number; preco_cartao: number; preco_pix: number; created_at: string;
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const db = supabase as any;

export function calcularPrecos(custo: number, itens: Item[]) {
  let acc = custo;
  const linhas: { nome: string; valor: number }[] = [];
  [...itens].sort((a, b) => a.ordem - b.ordem).forEach(i => {
    const v = i.tipo === 'percentual' ? acc * (Number(i.valor) || 0) / 100 : Number(i.valor) || 0;
    acc += v;
    linhas.push({ nome: i.nome, valor: v });
  });
  const cartao = Math.round(acc * 100) / 100;
  return { linhas, cartao, parcela: cartao / 3, pix: Math.round(cartao * 0.9 * 100) / 100 };
}

export default function CalculadoraPage() {
  const { user, loading } = useAuth();
  const hasAccess = useCalcAccess();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<'bota' | 'cinto'>('bota');
  const [resetKey, setResetKey] = useState(0);
  const [data, setData] = useState<CalcData | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgDraft, setCfgDraft] = useState<Item[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [orcs, setOrcs] = useState<Orcamento[]>([]);
  const [verOrc, setVerOrc] = useState<Orcamento | null>(null);

  const loadItens = async () => {
    const { data: rows } = await db.from('calc_preco_itens').select('*').order('ordem');
    setItens((rows || []).map((r: any) => ({ ...r, valor: Number(r.valor) })));
  };
  const loadOrcs = async () => {
    const { data: rows } = await db.from('calc_orcamentos').select('*').order('created_at', { ascending: false }).limit(200);
    setOrcs(rows || []);
  };
  useEffect(() => { if (hasAccess) { loadItens(); loadOrcs(); } }, [hasAccess]);

  const custo = data?.tipo === tipo ? data.total : 0;
  const precos = useMemo(() => calcularPrecos(custo, itens), [custo, itens]);

  const discriminacao = useMemo(() => {
    const linhas: string[] = [`*Orçamento — ${tipo === 'bota' ? 'Bota' : 'Cinto'} sob encomenda*`, ''];
    (data?.tipo === tipo ? data.grupos : []).forEach(g => {
      const its = g.itens.filter(([, v]) => v && String(v).trim());
      if (!its.length) return;
      linhas.push(`*${g.categoria}*`);
      its.forEach(([k, v]) => linhas.push(`• ${k}: ${v}`));
      linhas.push('');
    });
    linhas.push(`💳 Cartão: ${brl(precos.cartao)} em até 3x sem juros de ${brl(precos.parcela)}`);
    linhas.push(`💰 Pix: ${brl(precos.pix)} (10% de desconto)`);
    return linhas.join('\n');
  }, [data, tipo, precos]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!user || !hasAccess) return <Navigate to="/" replace />;

  const limpar = () => { setData(null); setResetKey(k => k + 1); toast.success('Ficha limpa.'); };
  const copiar = async (txt: string) => { await navigator.clipboard.writeText(txt); toast.success('Mensagem copiada.'); };

  const salvarOrc = async () => {
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    const { error } = await db.from('calc_orcamentos').insert({
      nome: nome.trim(), whatsapp: whats.trim() || null, tipo, form_data: data?.formData || {},
      discriminacao, preco_custo: custo, preco_cartao: precos.cartao, preco_pix: precos.pix, criado_por: user.id,
    });
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Orçamento salvo.');
    setSaveOpen(false); setNome(''); setWhats(''); loadOrcs();
  };

  const excluirOrc = async (id: string) => {
    if (!window.confirm('Remover este orçamento?')) return;
    await db.from('calc_orcamentos').delete().eq('id', id);
    loadOrcs();
  };

  const fazerFicha = (o: Orcamento) => {
    const templateData = { ...(o.form_data || {}), cliente: o.nome, clienteWhatsapp: o.whatsapp || '' };
    navigate(o.tipo === 'cinto' ? '/pedido-cinto' : '/pedido', { state: { templateData, fromOrcamento: true, productChoice: 'bota' } });
  };

  const abrirCfg = () => { setCfgDraft(itens.map(i => ({ ...i }))); setRemovidos([]); setCfgOpen(true); };
  const moverCfg = (idx: number, d: number) => {
    const arr = [...cfgDraft]; const j = idx + d; if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]]; setCfgDraft(arr);
  };
  const salvarCfg = async () => {
    if (cfgDraft.some(i => !i.nome.trim())) { toast.error('Preencha o nome de todos os itens.'); return; }
    for (const id of removidos) await db.from('calc_preco_itens').delete().eq('id', id);
    for (let k = 0; k < cfgDraft.length; k++) {
      const i = cfgDraft[k];
      const row = { nome: i.nome.trim(), tipo: i.tipo, valor: Number(i.valor) || 0, ordem: k + 1 };
      const { error } = i.id ? await db.from('calc_preco_itens').update(row).eq('id', i.id) : await db.from('calc_preco_itens').insert(row);
      if (error) { toast.error('Erro: ' + error.message); return; }
    }
    toast.success('Configuração salva.');
    setCfgOpen(false); loadItens();
  };

  return (
    <div className="container mx-auto px-2 py-6 max-w-[1500px]">
      <div className="flex flex-wrap items-center gap-3 mb-4 px-2">
        <Calculator className="text-primary" />
        <h1 className="text-2xl font-display font-bold">Calculadora de precificação</h1>
        <div className="flex gap-1 ml-2">
          <Button size="sm" variant={tipo === 'bota' ? 'default' : 'outline'} onClick={() => { setTipo('bota'); setData(null); }}>Bota</Button>
          <Button size="sm" variant={tipo === 'cinto' ? 'default' : 'outline'} onClick={() => { setTipo('cinto'); setData(null); }}>Cinto</Button>
        </div>
        <Button size="icon" variant="outline" className="ml-auto" onClick={abrirCfg} title="Configuração da calculadora"><Settings size={18} /></Button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <div className="min-w-0">
          {tipo === 'bota'
            ? <OrderPage key={`b${resetKey}`} calcMode onCalcChange={setData} />
            : <BeltOrderPage key={`c${resetKey}`} calcMode onCalcChange={setData} />}
        </div>

        <aside className="lg:sticky lg:top-24 space-y-3">
          <div className="bg-card rounded-xl p-4 western-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">O que está incluso</h2>
              <Button size="sm" variant="outline" onClick={() => copiar(discriminacao)}><Copy size={14} /> Copiar</Button>
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-muted rounded-md p-3 max-h-64 overflow-auto font-sans">{discriminacao}</pre>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Preço de custo</span><b>{brl(custo)}</b></div>
              {precos.linhas.map((l, i) => (
                <div key={i} className="flex justify-between text-muted-foreground"><span>+ {l.nome}</span><span>{brl(l.valor)}</span></div>
              ))}
            </div>
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex justify-between font-bold text-lg"><span>Cartão</span><span className="text-primary">{brl(precos.cartao)}</span></div>
              <div className="text-sm text-muted-foreground text-right">3x sem juros de {brl(precos.parcela)}</div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-border"><span>Pix (−10%)</span><span>{brl(precos.pix)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={limpar}><Eraser size={16} /> Limpar</Button>
              <Button onClick={() => setSaveOpen(true)}><Save size={16} /> Salvar orçamento</Button>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 western-shadow">
            <h2 className="font-bold mb-2">Orçamentos ({orcs.length})</h2>
            {orcs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum orçamento salvo.</p>}
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {orcs.map(o => (
                <div key={o.id} className="border border-border rounded-md p-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <button className="text-left font-semibold hover:underline" onClick={() => setVerOrc(o)}>{o.nome}</button>
                    <span className="text-xs text-muted-foreground uppercase">{o.tipo}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{o.whatsapp || 'sem WhatsApp'} · {new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
                  <div className="text-xs">Cartão {brl(Number(o.preco_cartao))} · Pix {brl(Number(o.preco_pix))}</div>
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" variant="default" onClick={() => fazerFicha(o)}><FileText size={14} /> Fazer ficha</Button>
                    {o.discriminacao && <Button size="sm" variant="outline" onClick={() => copiar(o.discriminacao!)}><Copy size={14} /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => excluirOrc(o.id)} title="Remover"><Trash2 size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Salvar orçamento</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
            <Input placeholder="WhatsApp" value={whats} onChange={e => setWhats(e.target.value)} />
            <pre className="whitespace-pre-wrap text-xs bg-muted rounded-md p-2 max-h-48 overflow-auto font-sans">{discriminacao}</pre>
          </div>
          <DialogFooter><Button onClick={salvarOrc}><Save size={16} /> Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verOrc} onOpenChange={o => !o && setVerOrc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{verOrc?.nome}</DialogTitle></DialogHeader>
          <pre className="whitespace-pre-wrap text-xs bg-muted rounded-md p-3 max-h-[60vh] overflow-auto font-sans">{verOrc?.discriminacao}</pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => verOrc?.discriminacao && copiar(verOrc.discriminacao)}><Copy size={14} /> Copiar</Button>
            <Button onClick={() => verOrc && fazerFicha(verOrc)}><FileText size={14} /> Fazer ficha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Configuração da calculadora</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Os itens são somados ao custo nesta ordem. Itens em % incidem sobre o valor acumulado até ele.</p>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {cfgDraft.map((i, idx) => (
              <div key={i.id || idx} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button type="button" onClick={() => moverCfg(idx, -1)} className="text-muted-foreground hover:text-foreground"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => moverCfg(idx, 1)} className="text-muted-foreground hover:text-foreground"><ArrowDown size={14} /></button>
                </div>
                <Input className="flex-1" value={i.nome} onChange={e => setCfgDraft(d => d.map((x, k) => k === idx ? { ...x, nome: e.target.value } : x))} />
                <div className="flex">
                  {(['real', 'percentual'] as const).map(t => (
                    <Button key={t} type="button" size="sm" variant={i.tipo === t ? 'default' : 'outline'} className="px-2"
                      onClick={() => setCfgDraft(d => d.map((x, k) => k === idx ? { ...x, tipo: t } : x))}>{t === 'real' ? 'R$' : '%'}</Button>
                  ))}
                </div>
                <Input type="number" step="0.01" className="w-28" value={i.valor}
                  onChange={e => setCfgDraft(d => d.map((x, k) => k === idx ? { ...x, valor: e.target.value as any } : x))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => { if (i.id) setRemovidos(r => [...r, i.id!]); setCfgDraft(d => d.filter((_, k) => k !== idx)); }}><Trash2 size={16} /></Button>
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setCfgDraft(d => [...d, { nome: '', tipo: 'real', valor: 0, ordem: d.length + 1 }])}><Plus size={16} /> Adicionar item</Button>
            <Button onClick={salvarCfg}><Save size={16} /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
