import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { carregarRegrasNcm, formatNcm } from '@/lib/fiscal/ncm';

type R = { id?: string; palavras: string; ncm: string; referencia: string | null; ordem: number; _dirty?: boolean };
const tbl = () => supabase.from('nfe_ncm_regras' as any);

export function NcmRegrasCard() {
  const [rows, setRows] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await tbl().select('*').order('ordem');
    setRows(((data as any[]) || []) as R[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (i: number, p: Partial<R>) => setRows(a => a.map((r, k) => k === i ? { ...r, ...p, _dirty: true } : r));

  const salvar = async () => {
    const sujos = rows.filter(r => r._dirty);
    for (const r of sujos) {
      const ncm = r.ncm.replace(/\D/g, '');
      if (!r.palavras.trim()) { toast.error('Preencha as palavras-chave.'); return; }
      if (ncm.length !== 8) { toast.error(`NCM inválido em "${r.palavras}" (precisa de 8 dígitos).`); return; }
    }
    setSaving(true);
    try {
      for (const r of sujos) {
        const body = { palavras: r.palavras.trim(), ncm: r.ncm.replace(/\D/g, ''), referencia: r.referencia?.trim() || null, ordem: r.ordem };
        const { error } = r.id ? await tbl().update(body).eq('id', r.id) : await tbl().insert(body);
        if (error) throw error;
      }
      await carregarRegrasNcm(true);
      toast.success('Regras de NCM salvas.');
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const apagar = async (i: number) => {
    const r = rows[i];
    if (!confirm(`Apagar a regra "${r.palavras || 'nova'}"?`)) return;
    if (r.id) {
      const { error } = await tbl().delete().eq('id', r.id);
      if (error) { toast.error(error.message); return; }
      await carregarRegrasNcm(true);
    }
    setRows(a => a.filter((_, k) => k !== i));
  };

  return (
    <Card>
      <CardHeader><CardTitle>Pré-preenchimento de NCM</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Quando o nome do produto tiver uma das palavras-chave, a nota já sai com o NCM da regra. Separe as palavras por vírgula. A primeira regra que bater vale.</p>
        {loading ? <Loader2 className="animate-spin" /> : (
          <div className="space-y-2">
            <div className="hidden grid-cols-12 gap-2 text-xs font-medium text-muted-foreground md:grid">
              <span className="col-span-6">Palavras-chave</span><span className="col-span-3">NCM</span><span className="col-span-2">Referência</span>
            </div>
            {rows.map((r, i) => (
              <div key={r.id ?? `n${i}`} className="grid grid-cols-12 items-center gap-2">
                <Input className="col-span-12 md:col-span-6" placeholder="ex.: texana, texanas" value={r.palavras} onChange={e => set(i, { palavras: e.target.value })} />
                <div className="col-span-6 md:col-span-3">
                  <Input inputMode="numeric" placeholder="64029990" value={r.ncm} onChange={e => set(i, { ncm: e.target.value })} />
                  {r.ncm.replace(/\D/g, '').length === 8 && <span className="text-[10px] text-muted-foreground">{formatNcm(r.ncm.replace(/\D/g, ''))}</span>}
                </div>
                <Input className="col-span-4 md:col-span-2" placeholder="BOTA" value={r.referencia ?? ''} onChange={e => set(i, { referencia: e.target.value })} />
                <Button type="button" variant="ghost" size="icon" className="col-span-2 md:col-span-1" onClick={() => apagar(i)} aria-label="Apagar regra"><Trash2 size={16} /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setRows(a => [...a, { palavras: '', ncm: '', referencia: '', ordem: (a.at(-1)?.ordem ?? 0) + 1, _dirty: true }])}>
            <Plus size={16} className="mr-1" /> Adicionar regra
          </Button>
          <Button type="button" onClick={salvar} disabled={saving || !rows.some(r => r._dirty)}>
            {saving ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Save size={16} className="mr-1" />} Salvar regras
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
