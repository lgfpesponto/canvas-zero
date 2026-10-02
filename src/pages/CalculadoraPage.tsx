import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Calculator, Settings, Copy, Eraser, Save, Trash2, Plus, ArrowUp, ArrowDown, FileText, Pencil, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import OrderPage from './OrderPage';
import BeltOrderPage from './BeltOrderPage';
import type { CalcData } from '@/components/calculadora/CalcEmitter';
import { useCalcAccess } from '@/hooks/useCalcAccess';

type Item = { id?: string; nome: string; tipo: 'real' | 'percentual'; valor: number; ordem: number };
type ItemOrc = {
  uid: string; tipo: 'bota' | 'cinto' | 'extra'; custo: number; qtd: number;
  formData: Record<string, any>; grupos: { categoria: string; itens: [string, string][] }[];
  extra?: { produtoId?: string; nome: string; descricao: string; precoUnit: number };
};
type Orcamento = {
  id: string; nome: string; whatsapp: string | null; tipo: string; form_data: any;
  discriminacao: string | null; preco_custo: number; preco_cartao: number; preco_pix: number; created_at: string;
};
type ExtraProd = { id: string; nome: string; preco_base: number | null };

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const db = supabase as any;
const IGNORAR = /identifica|finaliza/i;
const rotuloTipo = (t: ItemOrc['tipo']) => (t === 'bota' ? 'Bota' : t === 'cinto' ? 'Cinto' : 'Extra');
const resumoItem = (it: ItemOrc) => {
  if (it.tipo === 'extra') return it.extra?.nome || 'Extra';
  const m = it.grupos.flatMap(g => g.itens).find(([k]) => /modelo/i.test(k));
  return m ? String(m[1]) : rotuloTipo(it.tipo);
};

export function calcularPrecos(custo: number, itens: Item[]) {
  let acc = custo;
  [...itens].sort((a, b) => a.ordem - b.ordem).forEach(i => {
    acc += i.tipo === 'percentual' ? acc * (Number(i.valor) || 0) / 100 : Number(i.valor) || 0;
  });
  const cartao = Math.round(acc * 100) / 100;
  return { cartao, parcela: cartao / 3, pix: Math.round(cartao * 0.9 * 100) / 100 };
}

export default function CalculadoraPage() {
  const { user, loading } = useAuth();
  const hasAccess = useCalcAccess();
  const navigate = useNavigate();
  const [lista, setLista] = useState<ItemOrc[]>([]);
  // Editor de bota/cinto
  const [editor, setEditor] = useState<{ tipo: 'bota' | 'cinto'; uid?: string; key: number } | null>(null);
  const [edData, setEdData] = useState<CalcData | null>(null);
  // Editor de extra
  const [extraEd, setExtraEd] = useState<{ uid?: string; produtoId: string; nome: string; descricao: string; preco: string; qtd: string } | null>(null);
  const [extrasProd, setExtrasProd] = useState<ExtraProd[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgDraft, setCfgDraft] = useState<Item[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [orcs, setOrcs] = useState<Orcamento[]>([]);
  const [orcsOpen, setOrcsOpen] = useState(false);
  const [verOrc, setVerOrc] = useState<Orcamento | null>(null);

  const loadItens = async () => {
    const { data: rows } = await db.from('calc_preco_itens').select('*').order('ordem');
    setItens((rows || []).map((r: any) => ({ ...r, valor: Number(r.valor) })));
  };
  const loadOrcs = async () => {
    const { data: rows } = await db.from('calc_orcamentos').select('*').order('created_at', { ascending: false }).limit(200);
    setOrcs(rows || []);
  };
  useEffect(() => {
    if (!hasAccess) return;
    loadItens(); loadOrcs();
    db.from('extra_produtos').select('id,nome,preco_base').eq('ativo', true).order('ordem').then(({ data }: any) => setExtrasProd(data || []));
  }, [hasAccess]);

  const custo = useMemo(() => lista.reduce((s, i) => s + (Number(i.custo) || 0), 0), [lista]);
  const precos = useMemo(() => calcularPrecos(custo, itens), [custo, itens]);
  const qtdTotal = lista.reduce((s, i) => s + (i.qtd || 1), 0);

  const discriminacao = useMemo(() => {
    const L: string[] = [`*Orçamento ${new Date().toLocaleDateString('pt-BR')}*`, ''];
    L.push(`💳 Cartão: ${brl(precos.cartao)} em até 3x sem juros de ${brl(precos.parcela)}`);
    L.push(`💰 Pix: ${brl(precos.pix)} (10% de desconto)`);
    L.push('');
    lista.forEach((it, idx) => {
      L.push(`*Item ${idx + 1}: ${rotuloTipo(it.tipo)}*`);
      if (it.tipo === 'extra') {
        L.push(`• ${it.extra?.nome}${it.qtd > 1 ? ` (x${it.qtd})` : ''}`);
        if (it.extra?.descricao) L.push(`• ${it.extra.descricao}`);
      } else {
        it.grupos.filter(g => !IGNORAR.test(g.categoria)).forEach(g =>
          g.itens.filter(([, v]) => v && String(v).trim()).forEach(([k, v]) => L.push(`• ${k}: ${v}`)));
      }
      L.push('');
    });
    L.push(`Quantidade de itens: ${qtdTotal}`);
    return L.join('\n');
  }, [lista, precos, qtdTotal]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!user || !hasAccess) return <Navigate to="/" replace />;

  const limpar = () => { if (lista.length && !window.confirm('Apagar todos os itens?')) return; setLista([]); };
  const copiar = async (txt: string) => { await navigator.clipboard.writeText(txt); toast.success('Mensagem copiada.'); };

  const abrirEditor = (tipo: 'bota' | 'cinto', it?: ItemOrc) => {
    navigate('/calculadora', { replace: true, state: it ? { templateData: it.formData, fromOrcamento: true } : null });
    setEdData(null);
    setEditor({ tipo, uid: it?.uid, key: Date.now() });
  };
  const salvarEditor = () => {
    if (!editor || !edData) { toast.error('Preencha a ficha.'); return; }
    const novo: ItemOrc = { uid: editor.uid || crypto.randomUUID(), tipo: editor.tipo, custo: edData.total, qtd: 1, formData: edData.formData, grupos: edData.grupos };
    setLista(l => editor.uid ? l.map(x => x.uid === editor.uid ? novo : x) : [...l, novo]);
    setEditor(null);
    navigate('/calculadora', { replace: true, state: null });
  };

  const abrirExtra = (it?: ItemOrc) => setExtraEd(it ? {
    uid: it.uid, produtoId: it.extra?.produtoId || '', nome: it.extra?.nome || '', descricao: it.extra?.descricao || '',
    preco: String(it.extra?.precoUnit ?? ''), qtd: String(it.qtd),
  } : { produtoId: '', nome: '', descricao: '', preco: '', qtd: '1' });
  const salvarExtra = () => {
    if (!extraEd || !extraEd.nome.trim()) { toast.error('Selecione o extra.'); return; }
    const qtd = Math.max(1, Number(extraEd.qtd) || 1); const pu = Number(String(extraEd.preco).replace(',', '.')) || 0;
    const novo: ItemOrc = { uid: extraEd.uid || crypto.randomUUID(), tipo: 'extra', custo: pu * qtd, qtd, formData: {}, grupos: [],
      extra: { produtoId: extraEd.produtoId, nome: extraEd.nome.trim(), descricao: extraEd.descricao.trim(), precoUnit: pu } };
    setLista(l => extraEd.uid ? l.map(x => x.uid === extraEd.uid ? novo : x) : [...l, novo]);
    setExtraEd(null);
  };

  const salvarOrc = async () => {
    if (!nome.trim()) { toast.error('Informe o nome.'); return; }
    const tipos = Array.from(new Set(lista.map(i => i.tipo)));
    const { error } = await db.from('calc_orcamentos').insert({
      nome: nome.trim(), whatsapp: whats.trim() || null, tipo: tipos.length === 1 ? tipos[0] : 'multi', form_data: { itens: lista },
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

  const itensDoOrc = (o: Orcamento): ItemOrc[] => Array.isArray(o.form_data?.itens) ? o.form_data.itens
    : [{ uid: o.id, tipo: o.tipo === 'cinto' ? 'cinto' : 'bota', custo: Number(o.preco_custo), qtd: 1, formData: o.form_data || {}, grupos: [] }];
  const fazerFicha = (o: Orcamento, it: ItemOrc) => {
    const templateData = { ...(it.formData || {}), cliente: o.nome, clienteWhatsapp: o.whatsapp || '' };
    navigate(it.tipo === 'cinto' ? '/pedido-cinto' : '/pedido', { state: { templateData, fromOrcamento: true, productChoice: 'bota' } });
  };
  const carregarOrc = (o: Orcamento) => { setLista(itensDoOrc(o).map(i => ({ ...i, uid: crypto.randomUUID() }))); setVerOrc(null); toast.success('Orçamento carregado para edição.'); };

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

  const botoesAdd = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => abrirEditor('bota')}><Plus size={16} /> Bota</Button>
      <Button variant="outline" onClick={() => abrirEditor('cinto')}><Plus size={16} /> Cinto</Button>
      <Button variant="outline" onClick={() => abrirExtra()}><Plus size={16} /> Extras</Button>
    </div>
  );

  return (
    <div className="container mx-auto px-2 py-6 max-w-[1300px]">
      <div className="flex flex-wrap items-center gap-3 mb-4 px-2">
        <Calculator className="text-primary" />
        <h1 className="text-2xl font-display font-bold">Calculadora de precificação</h1>
        <Button variant="outline" className="ml-auto relative" onClick={() => setOrcsOpen(true)} title="Orçamentos salvos"><FolderOpen size={18} />{orcs.length > 0 && <span className="text-xs font-semibold">{orcs.length}</span>}</Button>
        <Button size="icon" variant="outline" onClick={abrirCfg} title="Configuração da calculadora"><Settings size={18} /></Button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <div className="min-w-0 space-y-4">
          <div className="bg-card rounded-xl p-4 western-shadow space-y-3">
            <h2 className="font-bold text-lg">Itens:</h2>
            {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item. Adicione uma bota, cinto ou extra.</p>}
            {lista.map((it, idx) => (
              <div key={it.uid} className="flex items-center gap-3 border border-border rounded-md p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">Item {idx + 1}: {rotuloTipo(it.tipo)}{it.qtd > 1 ? ` (x${it.qtd})` : ''}</div>
                  <div className="text-sm text-muted-foreground truncate">{resumoItem(it)}{it.extra?.descricao ? ` — ${it.extra.descricao}` : ''}</div>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">{brl(it.custo)}</span>
                <Button size="icon" variant="ghost" title="Editar" onClick={() => it.tipo === 'extra' ? abrirExtra(it) : abrirEditor(it.tipo, it)}><Pencil size={16} /></Button>
                <Button size="icon" variant="ghost" title="Remover" onClick={() => setLista(l => l.filter(x => x.uid !== it.uid))}><Trash2 size={16} /></Button>
              </div>
            ))}
            {botoesAdd}
          </div>

        </div>

        <aside className="lg:sticky lg:top-24 space-y-3">
          <div className="bg-card rounded-xl p-4 western-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">O que está incluso</h2>
              <Button size="sm" variant="outline" onClick={() => copiar(discriminacao)}><Copy size={14} /> Copiar</Button>
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-muted rounded-md p-3 max-h-72 overflow-auto font-sans">{discriminacao}</pre>
            <div className="flex justify-between text-sm"><span>Preço de custo</span><b>{brl(custo)}</b></div>
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Preço de venda</div>
              <div className="flex justify-between font-bold text-lg"><span>Cartão</span><span className="text-primary">{brl(precos.cartao)}</span></div>
              <div className="text-sm text-muted-foreground text-right">3x sem juros de {brl(precos.parcela)}</div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-border"><span>Pix (−10%)</span><span>{brl(precos.pix)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={limpar}><Eraser size={16} /> Limpar</Button>
              <Button onClick={() => lista.length ? setSaveOpen(true) : toast.error('Adicione pelo menos um item.')}><Save size={16} /> Salvar orçamento</Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Ficha bota/cinto */}
      <Dialog open={!!editor} onOpenChange={o => !o && setEditor(null)}>
        <DialogContent className="max-w-[1100px] w-[96vw] h-[94vh] p-0 flex flex-col">
          <DialogHeader className="px-4 pt-4"><DialogTitle>{editor?.uid ? 'Editar' : 'Adicionar'} {editor?.tipo === 'cinto' ? 'cinto' : 'bota'}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-auto px-2">
            {editor && (editor.tipo === 'bota'
              ? <OrderPage key={editor.key} calcMode onCalcChange={setEdData} />
              : <BeltOrderPage key={editor.key} calcMode onCalcChange={setEdData} />)}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border p-3">
            <span className="text-sm">Custo deste item: <b>{brl(edData?.total || 0)}</b></span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditor(null)}>Cancelar</Button>
              <Button onClick={salvarEditor}><Save size={16} /> Salvar item</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extra */}
      <Dialog open={!!extraEd} onOpenChange={o => !o && setExtraEd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{extraEd?.uid ? 'Editar extra' : 'Adicionar extra'}</DialogTitle></DialogHeader>
          {extraEd && (
            <div className="space-y-2">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={extraEd.produtoId}
                onChange={e => { const p = extrasProd.find(x => x.id === e.target.value);
                  setExtraEd({ ...extraEd, produtoId: e.target.value, nome: p?.nome || extraEd.nome, preco: p?.preco_base != null ? String(p.preco_base) : extraEd.preco }); }}>
                <option value="">Selecione o extra...</option>
                {extrasProd.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <Input placeholder="Nome do extra" value={extraEd.nome} onChange={e => setExtraEd({ ...extraEd, nome: e.target.value })} />
              <Textarea placeholder="Descrição (cor, tamanho, detalhes...)" value={extraEd.descricao} onChange={e => setExtraEd({ ...extraEd, descricao: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs">Custo unitário (R$)</label><Input type="number" step="0.01" value={extraEd.preco} onChange={e => setExtraEd({ ...extraEd, preco: e.target.value })} /></div>
                <div><label className="text-xs">Quantidade</label><Input type="number" min={1} value={extraEd.qtd} onChange={e => setExtraEd({ ...extraEd, qtd: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={salvarExtra}><Save size={16} /> Salvar item</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orcsOpen} onOpenChange={setOrcsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Orçamentos salvos ({orcs.length})</DialogTitle></DialogHeader>
          <div>
            
            {orcs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum orçamento salvo.</p>}
            <div className="space-y-2 max-h-[65vh] overflow-auto">
              {orcs.map(o => (
                <div key={o.id} className="border border-border rounded-md p-2 text-sm flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[180px]">
                    <button className="text-left font-semibold hover:underline" onClick={() => { setOrcsOpen(false); setVerOrc(o); }}>{o.nome}</button>
                    <div className="text-xs text-muted-foreground">{o.whatsapp || 'sem WhatsApp'} · {new Date(o.created_at).toLocaleDateString('pt-BR')} · {itensDoOrc(o).length} item(ns)</div>
                    <div className="text-xs">Cartão {brl(Number(o.preco_cartao))} · Pix {brl(Number(o.preco_pix))}</div>
                  </div>
                  <Button size="sm" onClick={() => { setOrcsOpen(false); setVerOrc(o); }}><FileText size={14} /> Fazer ficha</Button>
                  {o.discriminacao && <Button size="sm" variant="outline" onClick={() => copiar(o.discriminacao!)}><Copy size={14} /></Button>}
                  <Button size="sm" variant="ghost" onClick={() => excluirOrc(o.id)} title="Remover"><Trash2 size={14} /></Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          <pre className="whitespace-pre-wrap text-xs bg-muted rounded-md p-3 max-h-[40vh] overflow-auto font-sans">{verOrc?.discriminacao}</pre>
          {verOrc && (
            <div className="space-y-1">
              {itensDoOrc(verOrc).map((it, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm border border-border rounded-md p-2">
                  <span>Item {i + 1}: {rotuloTipo(it.tipo)} — {resumoItem(it)}</span>
                  {it.tipo !== 'extra' && <Button size="sm" onClick={() => fazerFicha(verOrc, it)}><FileText size={14} /> Fazer ficha</Button>}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => verOrc && carregarOrc(verOrc)}><Pencil size={14} /> Editar itens</Button>
            <Button variant="outline" onClick={() => verOrc?.discriminacao && copiar(verOrc.discriminacao)}><Copy size={14} /> Copiar</Button>
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
