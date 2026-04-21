import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, FileText, Filter, CheckCircle2, AlertTriangle, Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  checkDuplicates, deletePdf, fileHash, formatDateBR, replaceUploadedFile,
  todayISO, uploadPdf, validatePdf, type DupMatch,
} from './financeiroHelpers';
import { ComprovanteViewer } from './ComprovanteViewer';
import { DuplicateConfirmDialog } from './DuplicateConfirmDialog';

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

type EditState = {
  row: APagarRow;
  fornecedor: string;
  numero_nota: string;
  data_emissao: string;
  data_vencimento: string;
  valor: string;
  descricao: string;
  status: 'em_aberto' | 'pago';
  data_pagamento: string;
  newFile: File | null;
};

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
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  const [dupMatches, setDupMatches] = useState<DupMatch[]>([]);
  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [bulkPayDate, setBulkPayDate] = useState(todayISO());
  const [bulkPaying, setBulkPaying] = useState(false);

  // edit
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

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

  const selection = useMemo(() => {
    const selectedRows = filtered.filter(r => selectedIds.has(r.id));
    const total = selectedRows.reduce((s, r) => s + Number(r.valor), 0);
    const openOnes = selectedRows.filter(r => r.status === 'em_aberto');
    return { count: selectedRows.length, total, rows: selectedRows, openCount: openOnes.length, openRows: openOnes };
  }, [filtered, selectedIds]);

  const allVisibleSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const someVisibleSelected = filtered.some(r => selectedIds.has(r.id));

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach(r => next.delete(r.id));
      } else {
        filtered.forEach(r => next.add(r.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleSubmit = async () => {
    if (!fFornecedor.trim()) { toast({ title: 'Informe o fornecedor', variant: 'destructive' }); return; }
    if (!fNumeroNota.trim()) { toast({ title: 'Informe o número da nota', variant: 'destructive' }); return; }
    const valorNum = parseFloat(fValor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return; }
    if (!fEmissao || !fVencimento) { toast({ title: 'Informe as datas', variant: 'destructive' }); return; }

    if (fFile) {
      const err = validatePdf(fFile);
      if (err) { toast({ title: err, variant: 'destructive' }); return; }
    }

    setSubmitting(true);
    try {
      const hash = fFile ? await fileHash(fFile) : null;
      const matches = await checkDuplicates(
        'financeiro_a_pagar',
        [{
          itemId: 'single',
          hash,
          valor: valorNum,
          data_pagamento: fVencimento,
          destinatario: fFornecedor.trim(),
          fileName: fFile?.name,
        }],
        'fornecedor'
      );

      const payload = {
        fornecedor: fFornecedor.trim(),
        numero_nota: fNumeroNota.trim(),
        data_emissao: fEmissao,
        data_vencimento: fVencimento,
        valor: valorNum,
        status: 'em_aberto',
        descricao: fDescricao.trim() || null,
        created_by: user?.id,
        _file: fFile,
        _hash: hash,
      };

      if (matches.length > 0) {
        setDupMatches(matches);
        setPendingPayload(payload);
        setDupDialogOpen(true);
        setSubmitting(false);
        return;
      }

      await actualInsert(payload);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  const actualInsert = async (payload: any) => {
    setSubmitting(true);
    try {
      let path: string | null = null;
      if (payload._file) path = await uploadPdf(payload._file, 'a-pagar');
      const { _file, _hash, ...insertData } = payload;
      const { error } = await supabase.from('financeiro_a_pagar').insert({
        ...insertData,
        nota_url: path,
        comprovante_hash: _hash,
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

  const handleDupSaveAll = async () => {
    setDupDialogOpen(false);
    const p = pendingPayload;
    setPendingPayload(null);
    setDupMatches([]);
    if (p) await actualInsert(p);
  };

  const handleDupCancel = () => {
    setDupDialogOpen(false);
    setPendingPayload(null);
    setDupMatches([]);
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
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      load();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    if (selection.count === 0) return;
    setBulkDeleting(true);
    let okCount = 0;
    for (const r of selection.rows) {
      try {
        if (r.nota_url) await deletePdf(r.nota_url);
        const { error } = await supabase.from('financeiro_a_pagar').delete().eq('id', r.id);
        if (error) throw error;
        okCount++;
      } catch (e: any) {
        toast({ title: `Erro ao excluir ${r.fornecedor}`, description: e.message, variant: 'destructive' });
      }
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    clearSelection();
    toast({ title: `${okCount} nota(s) excluída(s).` });
    load();
  };

  const handleBulkPay = async () => {
    if (selection.openCount === 0) return;
    if (!bulkPayDate) { toast({ title: 'Informe a data de pagamento', variant: 'destructive' }); return; }
    setBulkPaying(true);
    const ids = selection.openRows.map(r => r.id);
    try {
      const { error } = await supabase
        .from('financeiro_a_pagar')
        .update({ status: 'pago', data_pagamento: bulkPayDate })
        .in('id', ids);
      if (error) throw error;
      toast({ title: `${ids.length} nota(s) marcada(s) como paga(s).` });
      setBulkPayOpen(false);
      clearSelection();
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setBulkPaying(false);
    }
  };

  const openEdit = (row: APagarRow) => {
    setEditState({
      row,
      fornecedor: row.fornecedor,
      numero_nota: row.numero_nota,
      data_emissao: row.data_emissao,
      data_vencimento: row.data_vencimento,
      valor: String(row.valor),
      descricao: row.descricao || '',
      status: row.status,
      data_pagamento: row.data_pagamento || todayISO(),
      newFile: null,
    });
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    const e = editState;
    if (!e.fornecedor.trim()) { toast({ title: 'Fornecedor obrigatório', variant: 'destructive' }); return; }
    if (!e.numero_nota.trim()) { toast({ title: 'Número da nota obrigatório', variant: 'destructive' }); return; }
    const valorNum = parseFloat(e.valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return; }
    if (!e.data_emissao || !e.data_vencimento) { toast({ title: 'Datas obrigatórias', variant: 'destructive' }); return; }
    if (e.status === 'pago' && !e.data_pagamento) { toast({ title: 'Informe a data de pagamento', variant: 'destructive' }); return; }
    if (e.newFile) {
      const verr = validatePdf(e.newFile);
      if (verr) { toast({ title: verr, variant: 'destructive' }); return; }
    }

    setEditSaving(true);
    try {
      let nota_url = e.row.nota_url;
      let comprovante_hash: string | null | undefined = undefined;
      if (e.newFile) {
        nota_url = await replaceUploadedFile(e.row.nota_url, e.newFile, 'a-pagar');
        comprovante_hash = await fileHash(e.newFile);
      }

      const patch: any = {
        fornecedor: e.fornecedor.trim(),
        numero_nota: e.numero_nota.trim(),
        data_emissao: e.data_emissao,
        data_vencimento: e.data_vencimento,
        valor: valorNum,
        descricao: e.descricao.trim() || null,
        status: e.status,
        data_pagamento: e.status === 'pago' ? e.data_pagamento : null,
      };
      if (e.newFile) {
        patch.nota_url = nota_url;
        patch.comprovante_hash = comprovante_hash;
      }
      const { error } = await supabase.from('financeiro_a_pagar').update(patch).eq('id', e.row.id);
      if (error) throw error;
      toast({ title: 'Nota atualizada.' });
      setEditState(null);
      load();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const todayISOStr = todayISO();

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <Card className={selection.count > 0 ? 'border-primary' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Selecionado</CardTitle>
          </CardHeader>
          <CardContent>
            {selection.count === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">Nenhum selecionado</p>
                <p className="text-xs text-muted-foreground mt-1">marque os itens da tabela</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">{formatCurrency(selection.total)}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{selection.count} {selection.count === 1 ? 'item' : 'itens'}</p>
                  <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={clearSelection}>Limpar</Button>
                </div>
              </>
            )}
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
                <Label>Nota PDF (opcional, máx. 10MB)</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={e => setFFile(e.target.files?.[0] || null)} />
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

      {/* Barra de ações em massa */}
      {selection.count > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-primary/40 bg-primary/5">
          <p className="text-sm font-medium">
            {selection.count} selecionado(s) — Total <span className="font-bold">{formatCurrency(selection.total)}</span>
            {selection.openCount > 0 && selection.openCount !== selection.count && (
              <span className="text-muted-foreground"> · {selection.openCount} em aberto</span>
            )}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={clearSelection}>Limpar seleção</Button>
            {selection.openCount > 0 && (
              <Button size="sm" onClick={() => { setBulkPayDate(todayISO()); setBulkPayOpen(true); }}>
                <CheckCircle2 size={14} className="mr-1" /> Marcar {selection.openCount} como pago(s)
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 size={14} className="mr-1" /> Excluir selecionados
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAllVisible}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Nº Nota</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : filtered.map(r => {
                const overdue = r.status === 'em_aberto' && r.data_vencimento < todayISOStr;
                return (
                  <TableRow key={r.id} className={overdue ? 'bg-destructive/5' : ''} data-state={selectedIds.has(r.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={() => toggleOne(r.id)}
                        aria-label={`Selecionar ${r.fornecedor}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.fornecedor}</TableCell>
                    <TableCell>{r.numero_nota}</TableCell>
                    <TableCell>{formatDateBR(r.data_emissao)}</TableCell>
                    <TableCell className={overdue ? 'text-destructive font-semibold' : ''}>
                      {formatDateBR(r.data_vencimento)}
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(r.valor))}</TableCell>
                    <TableCell>
                      {r.status === 'pago' ? (
                        <Badge className="bg-primary hover:bg-primary/90">Pago</Badge>
                      ) : (
                        <Badge variant="destructive">Em aberto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.nota_url ? (
                        <Button size="sm" variant="ghost" onClick={() => setViewerPath(r.nota_url!)}>
                          <FileText size={14} className="mr-1" /> Ver
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === 'em_aberto' && (
                          <Button size="sm" variant="ghost" title="Marcar como pago"
                            onClick={() => { setPayTarget(r); setPayDate(todayISO()); }}>
                            <CheckCircle2 size={14} className="text-primary" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => openEdit(r)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" title="Excluir" onClick={() => setDeleteTarget(r)}>
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

      {/* Marcar como pago (single) */}
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

      {/* Marcar como pago em massa */}
      <Dialog open={bulkPayOpen} onOpenChange={(o) => !bulkPaying && setBulkPayOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar {selection.openCount} nota(s) como paga(s)</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Data do pagamento (aplica em todas)</Label>
            <Input type="date" value={bulkPayDate} onChange={e => setBulkPayDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-2">
              Total: <strong>{formatCurrency(selection.openRows.reduce((s, r) => s + Number(r.valor), 0))}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPayOpen(false)} disabled={bulkPaying}>Cancelar</Button>
            <Button onClick={handleBulkPay} disabled={bulkPaying}>
              {bulkPaying ? 'Aplicando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edição */}
      <Dialog open={!!editState} onOpenChange={(o) => !o && !editSaving && setEditState(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar nota</DialogTitle></DialogHeader>
          {editState && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={editState.fornecedor}
                    onChange={(e) => setEditState({ ...editState, fornecedor: e.target.value })} />
                </div>
                <div>
                  <Label>Número da nota</Label>
                  <Input value={editState.numero_nota}
                    onChange={(e) => setEditState({ ...editState, numero_nota: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Emissão</Label>
                  <Input type="date" value={editState.data_emissao}
                    onChange={(e) => setEditState({ ...editState, data_emissao: e.target.value })} />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={editState.data_vencimento}
                    onChange={(e) => setEditState({ ...editState, data_vencimento: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={editState.valor}
                  onChange={(e) => setEditState({ ...editState, valor: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={editState.descricao}
                  onChange={(e) => setEditState({ ...editState, descricao: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <RadioGroup
                  value={editState.status}
                  onValueChange={(v: any) => setEditState({ ...editState, status: v })}
                  className="flex gap-4 mt-1"
                >
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value="em_aberto" /> Em aberto
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value="pago" /> Pago
                  </label>
                </RadioGroup>
              </div>
              {editState.status === 'pago' && (
                <div>
                  <Label>Data do pagamento</Label>
                  <Input type="date" value={editState.data_pagamento}
                    onChange={(e) => setEditState({ ...editState, data_pagamento: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Nota / Comprovante</Label>
                <div className="flex items-center gap-2 mt-1">
                  {editState.row.nota_url && (
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => setViewerPath(editState.row.nota_url!)}>
                      <FileText size={14} className="mr-1" /> Ver atual
                    </Button>
                  )}
                </div>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  className="mt-2"
                  onChange={(e) => setEditState({ ...editState, newFile: e.target.files?.[0] || null })}
                />
                {editState.newFile && (
                  <p className="text-xs text-muted-foreground mt-1">Novo: {editState.newFile.name}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditState(null)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? <><Loader2 size={14} className="animate-spin mr-1" /> Salvando...</> : 'Salvar alterações'}
            </Button>
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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !bulkDeleting && setBulkDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selection.count} nota(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os PDFs anexados também serão removidos.
              Total: <strong>{formatCurrency(selection.total)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? 'Excluindo...' : 'Excluir todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComprovanteViewer
        path={viewerPath}
        open={!!viewerPath}
        onOpenChange={(o) => !o && setViewerPath(null)}
      />

      <DuplicateConfirmDialog
        open={dupDialogOpen}
        matches={dupMatches}
        onCancel={handleDupCancel}
        onSaveAll={handleDupSaveAll}
        onSaveOnlyNew={handleDupCancel}
        saving={submitting}
      />
    </div>
  );
};

export default FinanceiroAPagar;
