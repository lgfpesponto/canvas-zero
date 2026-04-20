import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, FileText, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import {
  deletePdf, formatDateBR, openPdf, todayISO, uploadPdf, validatePdf,
} from './financeiroHelpers';

interface APagarRow {
  id: string;
  fornecedor: string;
  numero_nota: string;
  data_emissao: string;
  data_vencimento: string;
  valor: number;
  status: 'em_aberto' | 'pago';
  data_pagamento: string | null;
  nota_url: string | null;
  descricao: string | null;
  created_at: string;
}

const FinanceiroAPagar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<APagarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<APagarRow | null>(null);
  const [payTarget, setPayTarget] = useState<APagarRow | null>(null);
  const [payDate, setPayDate] = useState(todayISO());

  // filters
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterFornecedor, setFilterFornecedor] = useState<string>('todos');

  // form
  const [fFornecedor, setFFornecedor] = useState('');
  const [fNumeroNota, setFNumeroNota] = useState('');
  const [fEmissao, setFEmissao] = useState(todayISO());
  const [fVencimento, setFVencimento] = useState(todayISO());
  const [fValor, setFValor] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);

  const resetForm = () => {
    setFFornecedor(''); setFNumeroNota(''); setFEmissao(todayISO());
    setFVencimento(todayISO()); setFValor(''); setFDescricao(''); setFFile(null);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('financeiro_a_pagar')
      .select('*')
      .order('data_vencimento', { ascending: true });
    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setRows((data || []) as APagarRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fornecedores = useMemo(
    () => [...new Set(rows.map(r => r.fornecedor))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (filterStatus !== 'todos') r = r.filter(x => x.status === filterStatus);
    if (filterFornecedor !== 'todos') r = r.filter(x => x.fornecedor === filterFornecedor);
    return r;
  }, [rows, filterStatus, filterFornecedor]);

  const totals = useMemo(() => {
    const aberto = rows.filter(r => r.status === 'em_aberto').reduce((s, r) => s + Number(r.valor), 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const pagoMes = rows
      .filter(r => r.status === 'pago' && r.data_pagamento && r.data_pagamento >= monthStart)
      .reduce((s, r) => s + Number(r.valor), 0);
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7ISO = in7.toISOString().slice(0, 10);
    const todayISOStr = todayISO();
    const vencendo = rows.filter(r =>
      r.status === 'em_aberto' &&
      r.data_vencimento >= todayISOStr &&
      r.data_vencimento <= in7ISO
    );
    return { aberto, pagoMes, vencendoCount: vencendo.length, vencendoValor: vencendo.reduce((s, r) => s + Number(r.valor), 0) };
  }, [rows]);

  const handleSubmit = async () => {
    if (!fFornecedor.trim()) { toast({ title: 'Informe o fornecedor', variant: 'destructive' }); return; }
    if (!fNumeroNota.trim()) { toast({ title: 'Informe o número da nota', variant: 'destructive' }); return; }
    const valorNum = parseFloat(fValor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return; }
    if (!fEmissao || !fVencimento) { toast({ title: 'Informe as datas', variant: 'destructive' }); return; }

    let path: string | null = null;
    if (fFile) {
      const err = validatePdf(fFile);
      if (err) { toast({ title: err, variant: 'destructive' }); return; }
    }

    setSubmitting(true);
    try {
      if (fFile) path = await uploadPdf(fFile, 'a-pagar');
      const { error } = await supabase.from('financeiro_a_pagar').insert({
        fornecedor: fFornecedor.trim(),
        numero_nota: fNumeroNota.trim(),
        data_emissao: fEmissao,
        data_vencimento: fVencimento,
        valor: valorNum,
        status: 'em_aberto',
        nota_url: path,
        descricao: fDescricao.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: 'Nota lançada!' });
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payTarget) return;
    try {
      const { error } = await supabase
        .from('financeiro_a_pagar')
        .update({ status: 'pago', data_pagamento: payDate })
        .eq('id', payTarget.id);
      if (error) throw error;
      toast({ title: 'Marcado como pago.' });
      setPayTarget(null);
      setPayDate(todayISO());
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.nota_url) await deletePdf(deleteTarget.nota_url);
      const { error } = await supabase.from('financeiro_a_pagar').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Excluído.' });
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    }
  };

  const todayISOStr = todayISO();

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total a pagar (em aberto)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(totals.aberto)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pago no mês</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totals.pagoMes)}</p></CardContent>
        </Card>
        <Card className={totals.vencendoCount > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              {totals.vencendoCount > 0 && <AlertTriangle size={14} className="text-destructive" />}
              Vencendo em 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.vencendoCount}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.vencendoValor)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2"><Filter size={16} className="text-muted-foreground" /></div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="em_aberto">Em aberto</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fornecedor</Label>
            <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {fornecedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-1" /> Lançar Nota</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova Nota a Pagar</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={fFornecedor} onChange={e => setFFornecedor(e.target.value)} />
                </div>
                <div>
                  <Label>Número da nota</Label>
                  <Input value={fNumeroNota} onChange={e => setFNumeroNota(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Emissão</Label>
                  <Input type="date" value={fEmissao} onChange={e => setFEmissao(e.target.value)} />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={fVencimento} onChange={e => setFVencimento(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={fValor} onChange={e => setFValor(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={fDescricao} onChange={e => setFDescricao(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Nota PDF (opcional, máx. 5MB)</Label>
                <Input type="file" accept="application/pdf" onChange={e => setFFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Nº Nota</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : filtered.map(r => {
                const overdue = r.status === 'em_aberto' && r.data_vencimento < todayISOStr;
                return (
                  <TableRow key={r.id} className={overdue ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{r.fornecedor}</TableCell>
                    <TableCell>{r.numero_nota}</TableCell>
                    <TableCell>{formatDateBR(r.data_emissao)}</TableCell>
                    <TableCell className={overdue ? 'text-destructive font-semibold' : ''}>
                      {formatDateBR(r.data_vencimento)}
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(r.valor))}</TableCell>
                    <TableCell>
                      {r.status === 'pago' ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700">Pago</Badge>
                      ) : (
                        <Badge variant="destructive">Em aberto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.nota_url ? (
                        <Button size="sm" variant="ghost" onClick={() => openPdf(r.nota_url!)}>
                          <FileText size={14} className="mr-1" /> Ver
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === 'em_aberto' && (
                          <Button size="sm" variant="ghost" title="Marcar como pago"
                            onClick={() => { setPayTarget(r); setPayDate(todayISO()); }}>
                            <CheckCircle2 size={14} className="text-emerald-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Marcar como pago */}
      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Marcar como pago</DialogTitle></DialogHeader>
          <div>
            <Label>Data do pagamento</Label>
            <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Cancelar</Button>
            <Button onClick={handleMarkPaid}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O PDF anexado também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinanceiroAPagar;
