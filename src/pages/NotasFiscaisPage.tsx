import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Pencil, Plus } from 'lucide-react';
import { BagyNfeMenu } from '@/components/fiscal/BagyNfeMenu';
import NovaNotaFiscalForm from '@/components/fiscal/NovaNotaFiscalForm';
import { useNfeAccess, useNfePagesAccess } from "@/hooks/useNfeAccess";

const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const POR_PAGINA = 20;
const STATUS = ['autorizada', 'rascunho', 'processando', 'rejeitada', 'erro', 'cancelada'];
const STATUS_CLS: Record<string, string> = {
  autorizada: 'bg-primary text-primary-foreground', cancelada: 'bg-muted text-muted-foreground',
  rejeitada: 'bg-destructive text-destructive-foreground', erro: 'bg-destructive text-destructive-foreground',
  processando: 'bg-secondary text-secondary-foreground', rascunho: 'border bg-background text-foreground',
};
const ehEntrada = (n: any) => String(n.natureza_operacao || '').toUpperCase().includes('DEVOLU');

type Filtros = { de: string; ate: string; status: string; cliente: string };
const vazio: Filtros = { de: '', ate: '', status: '', cliente: '' };

export function NotasFiscaisInner() {
  const [aba, setAba] = useState<'saidas' | 'entradas'>('saidas');
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Filtros>(vazio);
  const [filtros, setFiltros] = useState<Filtros>(vazio);
  const [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<{ id: string | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('nfe_notas')
      .select('id, numero, serie, status, ambiente, natureza_operacao, valor_total, data_emissao, created_at, destinatario_snapshot, motivo_rejeicao, bagy_pedido_id, pedido_id')
      .order('created_at', { ascending: false }).limit(1000);
    if (filtros.de) q = q.gte('created_at', `${filtros.de}T00:00:00-03:00`);
    if (filtros.ate) q = q.lte('created_at', `${filtros.ate}T23:59:59-03:00`);
    if (filtros.status) q = q.eq('status', filtros.status);
    const { data } = await q;
    setNotas(data || []); setLoading(false);
  }, [filtros]);
  useEffect(() => { load(); }, [load]);

  const filtradas = useMemo(() => notas.filter(n =>
    (aba === 'entradas') === ehEntrada(n) &&
    (!filtros.cliente || String((n.destinatario_snapshot as any)?.nome ?? '').toLowerCase().includes(filtros.cliente.toLowerCase()))
  ), [notas, aba, filtros.cliente]);

  const resumo = useMemo(() => {
    const aut = filtradas.filter(n => n.status === 'autorizada');
    const c = (s: string[]) => filtradas.filter(n => s.includes(n.status)).length;
    return { autQtd: aut.length, autValor: aut.reduce((s, n) => s + Number(n.valor_total || 0), 0),
      canceladas: c(['cancelada']), rejeitadas: c(['rejeitada', 'erro']), rascunhos: c(['rascunho', 'processando']) };
  }, [filtradas]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const pag = Math.min(pagina, paginas);
  const visiveis = filtradas.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA);

  if (editor) return <NovaNotaFiscalForm rascunhoId={editor.id} onClose={() => { setEditor(null); load(); }} />;

  const Card = ({ label, valor, sub }: { label: string; valor: string | number; sub?: string }) => (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{valor}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-2xl font-bold">Notas Fiscais</h2>
          <p className="text-sm text-muted-foreground">Todas as notas geradas no sistema</p>
        </div>
        <Button onClick={() => setEditor({ id: null })}><Plus size={16} className="mr-1" /> Nova Nota Fiscal</Button>
      </div>

      <div className="flex gap-4 border-b">
        {(['saidas', 'entradas'] as const).map(k => (
          <button key={k} onClick={() => { setAba(k); setPagina(1); }}
            className={`-mb-px border-b-2 px-2 pb-2 text-sm ${aba === k ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground'}`}>
            {k === 'saidas' ? 'Saídas' : 'Entradas'}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {aba === 'saidas' ? 'Documentos fiscais de saída (NF-e modelo 55).' : 'Notas de entrada (devoluções).'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Autorizadas" valor={resumo.autQtd} sub={brl(resumo.autValor)} />
        <Card label="Canceladas" valor={resumo.canceladas} />
        <Card label="Rejeitadas / com erro" valor={resumo.rejeitadas} />
        <Card label="Rascunhos / processando" valor={resumo.rascunhos} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <div><label className="mb-1 block text-xs font-semibold">Período — de</label><Input type="date" value={form.de} onChange={e => setForm({ ...form, de: e.target.value })} /></div>
        <div><label className="mb-1 block text-xs font-semibold">Período — até</label><Input type="date" value={form.ate} onChange={e => setForm({ ...form, ate: e.target.value })} /></div>
        <div><label className="mb-1 block text-xs font-semibold">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todos</option>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div className="min-w-[200px] flex-1"><label className="mb-1 block text-xs font-semibold">Cliente</label><Input placeholder="Todos" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} /></div>
        <Button onClick={() => { setFiltros(form); setPagina(1); }}><Filter size={14} className="mr-1" /> Filtrar</Button>
        <Button variant="outline" onClick={() => { setForm(vazio); setFiltros(vazio); setPagina(1); }}>Limpar</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Nº da nota</th><th className="p-3">Destinatário</th><th className="p-3">Origem</th><th className="p-3">Emissão</th><th className="p-3">Valor</th><th className="p-3">Ambiente</th><th className="p-3">Status</th><th /></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
            {!loading && visiveis.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Nenhuma nota encontrada.</td></tr>}
            {visiveis.map(n => (
              <tr key={n.id} className="border-b last:border-0">
                <td className="p-3 font-mono text-xs">{n.numero || '—'}</td>
                <td className="p-3">{(n.destinatario_snapshot as any)?.nome || '—'}</td>
                <td className="p-3 text-xs text-muted-foreground">{n.bagy_pedido_id ? 'Bagy' : n.pedido_id ? 'Pedido' : 'Avulsa'}</td>
                <td className="p-3">{new Date(n.data_emissao || n.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">{brl(Number(n.valor_total))}</td>
                <td className="p-3"><span className="rounded border px-2 py-0.5 text-xs font-semibold">{n.ambiente === 1 ? 'Produção' : 'Homolog'}</span></td>
                <td className="p-3"><span title={n.motivo_rejeicao || undefined} className={`rounded px-2 py-0.5 text-xs font-bold ${STATUS_CLS[n.status] ?? 'border'}`}>{n.status}</span></td>
                <td className="p-2 text-right">
                  {n.status === 'rascunho'
                    ? <Button size="sm" variant="ghost" onClick={() => setEditor({ id: n.id })}><Pencil size={14} className="mr-1" /> Continuar</Button>
                    : <BagyNfeMenu notaId={n.id} hideSello onChanged={load} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t p-3 text-sm">
          <span>Mostrando {filtradas.length ? (pag - 1) * POR_PAGINA + 1 : 0}–{Math.min(pag * POR_PAGINA, filtradas.length)} de {filtradas.length} notas</span>
          <div className="flex items-center gap-1">
            <span className="mr-2">Página {pag} de {paginas}</span>
            <Button size="sm" variant="outline" disabled={pag === 1} onClick={() => setPagina(1)}><ChevronsLeft size={14} /></Button>
            <Button size="sm" variant="outline" disabled={pag === 1} onClick={() => setPagina(pag - 1)}><ChevronLeft size={14} /></Button>
            <Button size="sm" variant="outline" disabled={pag === paginas} onClick={() => setPagina(pag + 1)}><ChevronRight size={14} /></Button>
            <Button size="sm" variant="outline" disabled={pag === paginas} onClick={() => setPagina(paginas)}><ChevronsRight size={14} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotasFiscaisPage() {
  const acesso = useNfePagesAccess();
  if (!acesso) return <div className="p-8 text-center text-muted-foreground">Sem acesso às notas fiscais.</div>;
  return <div className="min-h-screen bg-background px-4 py-8 md:px-8"><div className="mx-auto max-w-7xl"><NotasFiscaisInner /></div></div>;
}
