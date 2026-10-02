import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Undo2, CheckCircle2 } from 'lucide-react';
import { emitirDevolucao } from '@/lib/fiscal/nfeBagy';
import { useNfeAccess } from '@/hooks/useNfeAccess';

const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Nota = { id: string; numero: number; status: string };

/** Aparece ao digitar um número TROCA[pedido]: permite emitir a devolução da NF-e original na hora. */
export function TrocaDevolucaoBanner({ numero }: { numero: string }) {
  const acesso = useNfeAccess();
  const base = (numero || '').trim().match(/^TROCA[\s-]*(?:RC[\s-]*)?(\d{10,})/i)?.[1] || null;
  const [nota, setNota] = useState<Nota | null>(null);
  const [devolvida, setDevolvida] = useState<Nota | null>(null);
  const [open, setOpen] = useState(false);
  const [itens, setItens] = useState<any[]>([]);
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (b: string) => {
    const { data: ped } = await supabase.from('bagy_pedidos').select('id').eq('numero_bagy', b).maybeSingle();
    if (!ped) { setNota(null); setDevolvida(null); return; }
    const { data } = await supabase.from('nfe_notas').select('id, numero, status')
      .eq('bagy_pedido_id', ped.id).eq('tipo_nota', 'normal').order('created_at', { ascending: false });
    const rows = (data ?? []) as Nota[];
    setNota(rows.find(r => r.status === 'autorizada') ?? null);
    setDevolvida(rows.find(r => r.status === 'devolvida') ?? null);
  };

  useEffect(() => {
    if (!base || !acesso) { setNota(null); setDevolvida(null); return; }
    const t = setTimeout(() => load(base), 400);
    return () => clearTimeout(t);
  }, [base, acesso]);

  if (!base || !acesso || (!nota && !devolvida)) return null;

  if (!nota && devolvida) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-2 text-sm">
        <CheckCircle2 size={16} className="text-primary" />
        Foi gerada troca: NF-e nº {devolvida.numero} do pedido {base} já está devolvida.
      </div>
    );
  }

  const abrir = async () => {
    const { data } = await supabase.from('nfe_itens').select('*').eq('nota_id', nota!.id).order('ordem');
    setItens(data || []);
    setQtd(Object.fromEntries((data || []).map((i: any) => [i.id, Number(i.quantidade)])));
    setOpen(true);
  };

  const total = itens.reduce((s, i) => s + (qtd[i.id] || 0) * Number(i.valor_unitario), 0);

  const emitir = async () => {
    setBusy(true);
    try {
      const r = await emitirDevolucao(nota!.id, itens.map(i => ({ itemId: i.id, quantidade: qtd[i.id] || 0 })), motivo.trim());
      if (r.autorizada) {
        toast.success(`Foi gerada troca: devolução nº ${r.numero} autorizada. Continue a ficha normalmente.`, { duration: 10000 });
        setOpen(false); setMotivo('');
        await load(base);
      } else toast.error(`Devolução rejeitada: ${r.motivo}`);
    } catch (e: any) { toast.error(e.message || 'Falha ao emitir devolução.'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm">
        <span className="flex-1">Pedido {base} tem a NF-e nº {nota!.numero} autorizada.</span>
        <Button type="button" size="sm" variant="destructive" onClick={abrir}>
          <Undo2 size={14} className="mr-1" /> Gerar devolução da nota
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar devolução — NF-e nº {nota!.numero}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ajuste a quantidade de cada item que voltou (0 = não devolve).</p>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {itens.map(i => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{i.descricao}</span>
                <span className="text-muted-foreground">{brl(Number(i.valor_unitario))}</span>
                <Input type="number" min={0} max={Number(i.quantidade)} className="w-20 h-8"
                  value={qtd[i.id] ?? 0}
                  onChange={e => setQtd(q => ({ ...q, [i.id]: Math.max(0, Math.min(Number(i.quantidade), Number(e.target.value) || 0)) }))} />
              </div>
            ))}
          </div>
          <div className="text-sm font-semibold">Total da devolução: {brl(total)}</div>
          <label className="text-xs font-semibold">Motivo da devolução *</label>
          <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: troca de tamanho" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={total <= 0 || motivo.trim().length < 5 || busy} onClick={emitir}>
              {busy && <Loader2 size={14} className="mr-1 animate-spin" />} Emitir devolução
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
