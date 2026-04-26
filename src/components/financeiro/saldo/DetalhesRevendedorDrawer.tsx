import { useEffect, useMemo, useState } from 'react';
import { Loader2, FileText, CheckCircle2, XCircle, RotateCcw, Pencil, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import {
  fetchMovimentos, fetchBaixasVendedor, fetchPedidosCobrados, estornarBaixa,
  quitarPedidosHistorico,
  type RevendedorMovimento, type RevendedorBaixa, type PedidoCobrado, type RevendedorSaldo,
  tipoMovimentoLabel,
} from '@/lib/revendedorSaldo';
import { formatDateBR } from '@/components/financeiro/financeiroHelpers';
import { AjusteSaldoDialog } from './AjusteSaldoDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldo: RevendedorSaldo | null;
  onChanged: () => void;
}

export const DetalhesRevendedorDrawer = ({ open, onOpenChange, saldo, onChanged }: Props) => {
  const { toast } = useToast();
  const [movs, setMovs] = useState<RevendedorMovimento[]>([]);
  const [baixas, setBaixas] = useState<RevendedorBaixa[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCobrado[]>([]);
  const [loading, setLoading] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [estornoTarget, setEstornoTarget] = useState<RevendedorBaixa | null>(null);
  const [estornoMotivo, setEstornoMotivo] = useState('');
  const [estornoSaving, setEstornoSaving] = useState(false);
  const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
  const [quitarOpen, setQuitarOpen] = useState(false);
  const [quitarMotivo, setQuitarMotivo] = useState('');
  const [quitarSaving, setQuitarSaving] = useState(false);

  const vendedor = saldo?.vendedor || '';

  const reload = async () => {
    if (!vendedor) return;
    setLoading(true);
    try {
      const [m, b, p] = await Promise.all([
        fetchMovimentos(vendedor),
        fetchBaixasVendedor(vendedor),
        fetchPedidosCobrados(vendedor),
      ]);
      setMovs(m); setBaixas(b); setPedidos(p);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar detalhes', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open && vendedor) reload(); }, [open, vendedor]);

  const baixasMap = useMemo(() => new Set(baixas.map(b => b.order_id)), [baixas]);

  const filaPedidos = useMemo(() => {
    let saldoSimulado = saldo?.saldo_disponivel || 0;
    return pedidos
      .filter(p => !baixasMap.has(p.id))
      .map(p => {
        const valor = (p.preco || 0) * (p.quantidade || 1);
        const cabe = saldoSimulado >= valor;
        const restante = cabe ? 0 : valor - saldoSimulado;
        if (cabe) saldoSimulado -= valor;
        return { ...p, valorTotal: valor, cabe, restante };
      });
  }, [pedidos, baixasMap, saldo]);

  const handleEstorno = async () => {
    if (!estornoTarget) return;
    if (!estornoMotivo.trim()) { toast({ title: 'Motivo obrigatório', variant: 'destructive' }); return; }
    setEstornoSaving(true);
    try {
      await estornarBaixa(estornoTarget.id, estornoMotivo.trim());
      toast({ title: 'Baixa estornada.' });
      setEstornoTarget(null);
      setEstornoMotivo('');
      reload();
      onChanged();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setEstornoSaving(false);
    }
  };

  // Limpa seleção quando muda a fila
  useEffect(() => {
    setSelectedPedidos(prev => {
      const visible = new Set(filaPedidos.map(p => p.id));
      const next = new Set<string>();
      prev.forEach(id => { if (visible.has(id)) next.add(id); });
      return next;
    });
  }, [filaPedidos]);

  const allPedSelected = filaPedidos.length > 0 && selectedPedidos.size === filaPedidos.length;
  const somePedSelected = selectedPedidos.size > 0 && !allPedSelected;
  const togglePedAll = () => {
    setSelectedPedidos(allPedSelected ? new Set() : new Set(filaPedidos.map(p => p.id)));
  };
  const togglePedOne = (id: string) => {
    setSelectedPedidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const totalSelecionado = useMemo(
    () => filaPedidos.filter(p => selectedPedidos.has(p.id)).reduce((s, p) => s + p.valorTotal, 0),
    [filaPedidos, selectedPedidos]
  );

  const handleQuitarHistorico = async () => {
    if (!quitarMotivo.trim()) {
      toast({ title: 'Motivo obrigatório', variant: 'destructive' });
      return;
    }
    setQuitarSaving(true);
    try {
      const ids = Array.from(selectedPedidos);
      const result = await quitarPedidosHistorico(ids, quitarMotivo.trim());
      toast({
        title: `${result.quitados} pedido(s) marcado(s) como quitado(s)`,
        description: result.pulados > 0
          ? `${result.pulados} pulado(s) (já tinham baixa ou valor zero). Saldo do revendedor não foi alterado.`
          : 'Saldo do revendedor não foi alterado.',
      });
      setQuitarOpen(false);
      setQuitarMotivo('');
      setSelectedPedidos(new Set());
      await reload();
      onChanged();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setQuitarSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{vendedor}</SheetTitle>
          </SheetHeader>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="font-bold">{formatCurrency(saldo?.total_recebido || 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Utilizado</p>
              <p className="font-bold">{formatCurrency(saldo?.total_utilizado || 0)}</p>
            </CardContent></Card>
            <Card className="border-primary border-2"><CardContent className="p-3">
              <p className="text-xs text-primary">Saldo</p>
              <p className="font-bold text-primary">{formatCurrency(saldo?.saldo_disponivel || 0)}</p>
            </CardContent></Card>
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAjusteOpen(true)}>
              <Pencil size={14} /> Ajustar saldo
            </Button>
          </div>

          {loading && <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>}

          {/* Pedidos pendentes */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground">Pedidos cobrados pendentes (FIFO)</h3>
              {selectedPedidos.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedPedidos.size} sel · {formatCurrency(totalSelecionado)}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setQuitarOpen(true)}>
                    <Archive size={14} className="mr-1" /> Quitar como histórico
                  </Button>
                </div>
              )}
            </div>
            {filaPedidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido cobrado em aberto.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={allPedSelected ? true : somePedSelected ? 'indeterminate' : false}
                        onCheckedChange={togglePedAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filaPedidos.map(p => (
                    <TableRow key={p.id} data-state={selectedPedidos.has(p.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPedidos.has(p.id)}
                          onCheckedChange={() => togglePedOne(p.id)}
                          aria-label="Selecionar"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                      <TableCell className="text-xs">
                        {p.tipo_extra || p.modelo || '—'} {p.tamanho ? `· ${p.tamanho}` : ''}
                        {p.quantidade > 1 && ` ×${p.quantidade}`}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(p.valorTotal)}</TableCell>
                      <TableCell>
                        {p.cabe ? (
                          <Badge variant="outline" className="text-xs">Cabe no saldo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Faltam {formatCurrency(p.restante)}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          {/* Baixas realizadas */}
          <section className="mt-6">
            <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Baixas realizadas</h3>
            {baixas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma baixa realizada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baixas.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs">{formatDateBR(b.created_at.slice(0, 10))}</TableCell>
                      <TableCell className="font-mono text-xs">{b.order_id.slice(0, 8)}…</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(b.valor_pedido))}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEstornoTarget(b)}>
                          <RotateCcw size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          {/* Extrato (movimentos) */}
          <section className="mt-6">
            <h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">Extrato completo</h3>
            {movs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem movimentos.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo após</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movs.map(m => {
                    const isOut = m.tipo === 'baixa_pedido';
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">
                          {new Date(m.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-xs">{tipoMovimentoLabel(m.tipo)}</TableCell>
                        <TableCell className="text-xs max-w-[280px] truncate">{m.descricao || '—'}</TableCell>
                        <TableCell className={`text-right font-mono text-xs ${isOut ? 'text-destructive' : 'text-primary'}`}>
                          {isOut ? '−' : '+'} {formatCurrency(Number(m.valor))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(Number(m.saldo_posterior))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>
        </SheetContent>
      </Sheet>

      <AjusteSaldoDialog
        open={ajusteOpen}
        onOpenChange={setAjusteOpen}
        vendedor={vendedor}
        saldoAtual={saldo?.saldo_disponivel || 0}
        onSaved={() => { reload(); onChanged(); }}
      />

      <AlertDialog open={!!estornoTarget} onOpenChange={(o) => { if (!o) { setEstornoTarget(null); setEstornoMotivo(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar baixa</AlertDialogTitle>
            <AlertDialogDescription>
              O valor de {formatCurrency(Number(estornoTarget?.valor_pedido || 0))} voltará para o saldo
              do revendedor e o pedido ficará disponível para uma nova baixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Textarea
              placeholder="Motivo do estorno (obrigatório)"
              value={estornoMotivo}
              onChange={(e) => setEstornoMotivo(e.target.value)}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={estornoSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEstorno} disabled={estornoSaving}>
              {estornoSaving ? <><Loader2 className="animate-spin" /> Estornando...</> : 'Confirmar estorno'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
