import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, FileText, Filter } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/order-logic';
import {
  deletePdf, fetchVendedoresList, formatDateBR, openPdf,
  todayISO, uploadPdf, validatePdf,
} from './financeiroHelpers';

interface AReceberRow {
  id: string;
  vendedor: string;
  data_pagamento: string;
  valor: number;
  destinatario: string;
  tipo: 'empresa' | 'fornecedor';
  descricao: string | null;
  comprovante_url: string | null;
  created_at: string;
}

const FinanceiroAReceber = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AReceberRow[]>([]);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AReceberRow | null>(null);

  // filters
  const [filterPeriodo, setFilterPeriodo] = useState<'mes' | '30d' | 'todos'>('mes');
  const [filterVendedor, setFilterVendedor] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  // form
  const [fVendedor, setFVendedor] = useState('');
  const [fTipo, setFTipo] = useState<'empresa' | 'fornecedor'>('empresa');
  const [fDestinatario, setFDestinatario] = useState('');
  const [fData, setFData] = useState(todayISO());
  const [fValor, setFValor] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);

  const resetForm = () => {
    setFVendedor(''); setFTipo('empresa'); setFDestinatario('');
    setFData(todayISO()); setFValor(''); setFDescricao(''); setFFile(null);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('financeiro_a_receber')
      .select('*')
      .order('data_pagamento', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setRows((data || []) as AReceberRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetchVendedoresList().then(setVendedores);
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (filterVendedor !== 'todos') r = r.filter(x => x.vendedor === filterVendedor);
    if (filterTipo !== 'todos') r = r.filter(x => x.tipo === filterTipo);
    if (filterPeriodo !== 'todos') {
      const now = new Date();
      let cutoff: Date;
      if (filterPeriodo === 'mes') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
      }
      const cutoffISO = cutoff.toISOString().slice(0, 10);
      r = r.filter(x => x.data_pagamento >= cutoffISO);
    }
    return r;
  }, [rows, filterPeriodo, filterVendedor, filterTipo]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, r) => s + Number(r.valor), 0);
    const empresa = filtered.filter(r => r.tipo === 'empresa').reduce((s, r) => s + Number(r.valor), 0);
    const fornecedor = filtered.filter(r => r.tipo === 'fornecedor').reduce((s, r) => s + Number(r.valor), 0);
    return { total, empresa, fornecedor };
  }, [filtered]);

  const handleSubmit = async () => {
    if (!fVendedor) { toast({ title: 'Selecione o vendedor', variant: 'destructive' }); return; }
    if (!fData) { toast({ title: 'Informe a data', variant: 'destructive' }); return; }
    const valorNum = parseFloat(fValor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return; }
    const destinatario = fTipo === 'empresa' ? 'Empresa' : fDestinatario.trim();
    if (fTipo === 'fornecedor' && !destinatario) {
      toast({ title: 'Informe o fornecedor', variant: 'destructive' }); return;
    }
    if (!fFile) { toast({ title: 'Anexe o comprovante PDF', variant: 'destructive' }); return; }
    const err = validatePdf(fFile);
    if (err) { toast({ title: err, variant: 'destructive' }); return; }

    setSubmitting(true);
    try {
      const path = await uploadPdf(fFile, 'a-receber');
      const { error } = await supabase.from('financeiro_a_receber').insert({
        vendedor: fVendedor,
        data_pagamento: fData,
        valor: valorNum,
        destinatario,
        tipo: fTipo,
        descricao: fDescricao.trim() || null,
        comprovante_url: path,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: 'Recebimento registrado!' });
      setDialogOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.comprovante_url) await deletePdf(deleteTarget.comprovante_url);
      const { error } = await supabase.from('financeiro_a_receber').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Excluído.' });
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total recebido</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totals.total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Para a Empresa</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.empresa)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Para Fornecedores</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.fornecedor)}</p></CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2"><Filter size={16} className="text-muted-foreground" /></div>
          <div>
            <Label className="text-xs">Período</Label>
            <Select value={filterPeriodo} onValueChange={(v: any) => setFilterPeriodo(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mês atual</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Vendedor</Label>
            <Select value={filterVendedor} onValueChange={setFilterVendedor}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="empresa">Para a Empresa</SelectItem>
                <SelectItem value="fornecedor">Para Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-1" /> Registrar Recebimento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Recebimento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vendedor (quem mandou)</Label>
                <Select value={fVendedor} onValueChange={setFVendedor}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <RadioGroup value={fTipo} onValueChange={(v: any) => setFTipo(v)} className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="empresa" /> Para a Empresa
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="fornecedor" /> Para Fornecedor
                  </label>
                </RadioGroup>
              </div>
              {fTipo === 'fornecedor' && (
                <div>
                  <Label>Destinatário (fornecedor)</Label>
                  <Input value={fDestinatario} onChange={e => setFDestinatario(e.target.value)} placeholder="Nome do fornecedor" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data do pagamento</Label>
                  <Input type="date" value={fData} onChange={e => setFData(e.target.value)} />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={fValor} onChange={e => setFValor(e.target.value)} placeholder="0,00" />
                </div>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={fDescricao} onChange={e => setFDescricao(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Comprovante (PDF, máx. 5MB)</Label>
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
                <TableHead>Vendedor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.vendedor}</TableCell>
                  <TableCell>{formatDateBR(r.data_pagamento)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(Number(r.valor))}</TableCell>
                  <TableCell>{r.destinatario}</TableCell>
                  <TableCell>
                    <Badge variant={r.tipo === 'empresa' ? 'default' : 'secondary'}>
                      {r.tipo === 'empresa' ? 'Empresa' : 'Fornecedor'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.comprovante_url ? (
                      <Button size="sm" variant="ghost" onClick={() => openPdf(r.comprovante_url!)}>
                        <FileText size={14} className="mr-1" /> Ver
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recebimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comprovante PDF também será removido.
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

export default FinanceiroAReceber;
