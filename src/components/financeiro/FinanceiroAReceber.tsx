import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, FileText, Filter, Loader2, Upload, X, Pencil } from 'lucide-react';
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
  checkDuplicates, deletePdf, fetchVendedoresList, fileHash, formatDateBR,
  todayISO, validateComprovante, type DupMatch,
} from './financeiroHelpers';
import { ComprovanteViewer } from './ComprovanteViewer';
import { DuplicateConfirmDialog } from './DuplicateConfirmDialog';
import { ComprovantesRevendedorPendentes } from './saldo/ComprovantesRevendedorPendentes';

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

type ExtractedItem = {
  id: string;
  file: File;
  hash: string;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'saving' | 'saved';
  error?: string;
  data_pagamento: string;
  valor: string;
  destinatario: string;
  tipo: 'empresa' | 'fornecedor';
  descricao: string;
};

type EditState = {
  row: AReceberRow;
  vendedor: string;
  data_pagamento: string;
  valor: string;
  tipo: 'empresa' | 'fornecedor';
  destinatario: string;
  descricao: string;
  newFile: File | null;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const FinanceiroAReceber = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AReceberRow[]>([]);
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AReceberRow | null>(null);
  const [viewerPath, setViewerPath] = useState<string | null>(null);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // edit
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // filters
  const [filterPeriodo, setFilterPeriodo] = useState<'mes' | '30d' | 'todos'>('mes');
  const [filterVendedor, setFilterVendedor] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  // form (multi-PDF flow)
  const [fVendedor, setFVendedor] = useState('');
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  // duplicate confirmation
  const [dupMatches, setDupMatches] = useState<DupMatch[]>([]);
  const [dupDialogOpen, setDupDialogOpen] = useState(false);

  const resetForm = () => {
    setFVendedor('');
    setItems([]);
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

  const selection = useMemo(() => {
    const selectedRows = filtered.filter(r => selectedIds.has(r.id));
    const total = selectedRows.reduce((s, r) => s + Number(r.valor), 0);
    return { count: selectedRows.length, total, rows: selectedRows };
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

  const processFile = async (item: ExtractedItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing', error: undefined } : i));
    try {
      const base64 = await fileToBase64(item.file);
      const mimeType = item.file.type || (item.file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const { data, error } = await supabase.functions.invoke('extract-comprovante', {
        body: { fileBase64: base64, fileName: item.file.name, mimeType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: 'ready',
        data_pagamento: data.data_pagamento || todayISO(),
        valor: data.valor ? String(data.valor) : '',
        destinatario: data.destinatario || '',
        tipo: (data.tipo === 'empresa' ? 'empresa' : 'fornecedor') as 'empresa' | 'fornecedor',
        descricao: data.descricao || '',
      } : i));
    } catch (e: any) {
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i, status: 'error', error: e.message || 'Falha ao extrair',
      } : i));
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ExtractedItem[] = [];
    const existingHashes = new Set(items.map(i => i.hash));
    for (const file of Array.from(files)) {
      const err = validateComprovante(file);
      if (err) {
        toast({ title: `${file.name}: ${err}`, variant: 'destructive' });
        continue;
      }
      const hash = await fileHash(file);
      if (existingHashes.has(hash) || newItems.some(n => n.hash === hash)) {
        toast({ title: `${file.name}: já adicionado nesta sessão`, variant: 'destructive' });
        continue;
      }
      newItems.push({
        id: crypto.randomUUID(),
        file,
        hash,
        status: 'pending',
        data_pagamento: todayISO(),
        valor: '',
        destinatario: '',
        tipo: 'empresa',
        descricao: '',
      });
    }
    if (newItems.length === 0) return;
    setItems(prev => [...prev, ...newItems]);
    for (let i = 0; i < newItems.length; i += 3) {
      const batch = newItems.slice(i, i + 3);
      await Promise.all(batch.map(processFile));
    }
  };

  const updateItem = (id: string, patch: Partial<ExtractedItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSaveAll = async () => {
    if (savingAll) return;
    if (!fVendedor) { toast({ title: 'Selecione o vendedor', variant: 'destructive' }); return; }
    const ready = items.filter(i => i.status === 'ready');
    if (ready.length === 0) { toast({ title: 'Nenhum comprovante pronto pra salvar', variant: 'destructive' }); return; }

    for (const it of ready) {
      const v = parseFloat(it.valor.replace(',', '.'));
      if (!v || v <= 0) { toast({ title: `Valor inválido em ${it.file.name}`, variant: 'destructive' }); return; }
      if (!it.data_pagamento) { toast({ title: `Data inválida em ${it.file.name}`, variant: 'destructive' }); return; }
      const dest = it.tipo === 'empresa' ? 'Empresa' : it.destinatario.trim();
      if (it.tipo === 'fornecedor' && !dest) {
        toast({ title: `Destinatário obrigatório em ${it.file.name}`, variant: 'destructive' }); return;
      }
    }

    setSavingAll(true);
    try {
      const candidates = ready.map(it => ({
        itemId: it.id,
        hash: it.hash,
        valor: parseFloat(it.valor.replace(',', '.')),
        data_pagamento: it.data_pagamento,
        destinatario: it.tipo === 'empresa' ? 'Empresa' : it.destinatario.trim(),
        fileName: it.file.name,
      }));
      const matches = await checkDuplicates('financeiro_a_receber', candidates, 'destinatario');
      if (matches.length > 0) {
        setDupMatches(matches);
        setDupDialogOpen(true);
        setSavingAll(false);
        return;
      }
      await proceedSave(ready);
    } catch (e: any) {
      toast({ title: 'Erro ao verificar duplicatas', description: e.message, variant: 'destructive' });
      setSavingAll(false);
    }
  };

  const proceedSave = async (toSave: ExtractedItem[]) => {
    setSavingAll(true);
    let okCount = 0;
    const savedIds: string[] = [];
    for (const it of toSave) {
      updateItem(it.id, { status: 'saving' });
      try {
        const path = await uploadPdf(it.file, 'a-receber');
        const valorNum = parseFloat(it.valor.replace(',', '.'));
        const destinatario = it.tipo === 'empresa' ? 'Empresa' : it.destinatario.trim();
        const { error } = await supabase.from('financeiro_a_receber').insert({
          vendedor: fVendedor,
          data_pagamento: it.data_pagamento,
          valor: valorNum,
          destinatario,
          tipo: it.tipo,
          descricao: it.descricao.trim() || null,
          comprovante_url: path,
          comprovante_hash: it.hash,
          created_by: user?.id,
        });
        if (error) throw error;
        savedIds.push(it.id);
        okCount++;
      } catch (e: any) {
        updateItem(it.id, { status: 'error', error: e.message });
      }
    }
    setSavingAll(false);
    toast({ title: `${okCount} recebimento(s) salvo(s)!` });
    if (okCount > 0) {
      const remainingItems = items.filter(i => !savedIds.includes(i.id));
      setItems(prev => prev.filter(i => !savedIds.includes(i.id)));
      if (remainingItems.length === 0) {
        setDialogOpen(false);
        resetForm();
      }
      load();
    }
  };

  const handleDupSaveAll = async () => {
    const ready = items.filter(i => i.status === 'ready');
    setDupDialogOpen(false);
    setDupMatches([]);
    await proceedSave(ready);
  };

  const handleDupSaveOnlyNew = async () => {
    const dupIds = new Set(dupMatches.map(m => m.itemId));
    const ready = items.filter(i => i.status === 'ready' && !dupIds.has(i.id));
    setDupDialogOpen(false);
    setDupMatches([]);
    if (ready.length === 0) {
      toast({ title: 'Nenhum comprovante novo pra salvar — todos eram duplicatas.' });
      return;
    }
    await proceedSave(ready);
  };

  const handleDupCancel = () => {
    setDupDialogOpen(false);
    setDupMatches([]);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.comprovante_url) await deletePdf(deleteTarget.comprovante_url);
      const { error } = await supabase.from('financeiro_a_receber').delete().eq('id', deleteTarget.id);
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
        if (r.comprovante_url) await deletePdf(r.comprovante_url);
        const { error } = await supabase.from('financeiro_a_receber').delete().eq('id', r.id);
        if (error) throw error;
        okCount++;
      } catch (e: any) {
        toast({ title: `Erro ao excluir ${r.destinatario}`, description: e.message, variant: 'destructive' });
      }
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    clearSelection();
    toast({ title: `${okCount} lançamento(s) excluído(s).` });
    load();
  };

  const openEdit = (row: AReceberRow) => {
    setEditState({
      row,
      vendedor: row.vendedor,
      data_pagamento: row.data_pagamento,
      valor: String(row.valor),
      tipo: row.tipo,
      destinatario: row.destinatario,
      descricao: row.descricao || '',
      newFile: null,
    });
  };

  const handleSaveEdit = async () => {
    if (!editState) return;
    const e = editState;
    const valorNum = parseFloat(e.valor.replace(',', '.'));
    if (!e.vendedor) { toast({ title: 'Vendedor obrigatório', variant: 'destructive' }); return; }
    if (!e.data_pagamento) { toast({ title: 'Data obrigatória', variant: 'destructive' }); return; }
    if (!valorNum || valorNum <= 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return; }
    const destinatario = e.tipo === 'empresa' ? 'Empresa' : e.destinatario.trim();
    if (e.tipo === 'fornecedor' && !destinatario) {
      toast({ title: 'Destinatário obrigatório', variant: 'destructive' }); return;
    }
    if (e.newFile) {
      const verr = validateComprovante(e.newFile);
      if (verr) { toast({ title: verr, variant: 'destructive' }); return; }
    }

    setEditSaving(true);
    try {
      let comprovante_url = e.row.comprovante_url;
      let comprovante_hash: string | null | undefined = undefined;
      if (e.newFile) {
        comprovante_url = await replaceUploadedFile(e.row.comprovante_url, e.newFile, 'a-receber');
        comprovante_hash = await fileHash(e.newFile);
      }

      const patch: any = {
        vendedor: e.vendedor,
        data_pagamento: e.data_pagamento,
        valor: valorNum,
        tipo: e.tipo,
        destinatario,
        descricao: e.descricao.trim() || null,
      };
      if (e.newFile) {
        patch.comprovante_url = comprovante_url;
        patch.comprovante_hash = comprovante_hash;
      }
      const { error } = await supabase.from('financeiro_a_receber').update(patch).eq('id', e.row.id);
      if (error) throw error;
      toast({ title: 'Lançamento atualizado.' });
      setEditState(null);
      load();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Comprovantes enviados pelos vendedores aguardando aprovação */}
      <ComprovantesRevendedorPendentes onChanged={load} showAdminUpload />

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Recebimento (extração automática via IA)</DialogTitle>
            </DialogHeader>
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
                <Label>Comprovantes (PDF ou foto — pode arrastar vários)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-1">
                  <Upload className="mx-auto mb-2 text-muted-foreground" size={28} />
                  <Input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">Aceita PDF, JPG, PNG ou foto da tela. A IA extrai data, valor e destinatário automaticamente.</p>
                </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Comprovantes ({items.length})</h4>
                  {items.map((it) => (
                    <Card key={it.id} className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText size={16} className="shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{it.file.name}</span>
                          {it.status === 'processing' && <Loader2 size={14} className="animate-spin text-primary shrink-0" />}
                          {it.status === 'ready' && <Badge variant="default" className="shrink-0">Pronto</Badge>}
                          {it.status === 'saving' && <Badge variant="secondary" className="shrink-0">Salvando...</Badge>}
                          {it.status === 'saved' && <Badge variant="default" className="shrink-0">Salvo</Badge>}
                          {it.status === 'error' && <Badge variant="destructive" className="shrink-0">Erro</Badge>}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeItem(it.id)} disabled={it.status === 'saving'}>
                          <X size={14} />
                        </Button>
                      </div>

                      {it.status === 'error' && (
                        <div className="text-xs text-destructive mb-2">
                          {it.error}
                          <Button size="sm" variant="link" className="h-auto p-0 ml-2" onClick={() => processFile(it)}>
                            Tentar novamente
                          </Button>
                        </div>
                      )}

                      {(it.status === 'ready' || it.status === 'saving' || it.status === 'saved') && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Data</Label>
                              <Input type="date" value={it.data_pagamento}
                                onChange={(e) => updateItem(it.id, { data_pagamento: e.target.value })}
                                disabled={it.status !== 'ready'} />
                            </div>
                            <div>
                              <Label className="text-xs">Valor (R$)</Label>
                              <Input type="number" step="0.01" min="0" value={it.valor}
                                onChange={(e) => updateItem(it.id, { valor: e.target.value })}
                                disabled={it.status !== 'ready'} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <RadioGroup
                              value={it.tipo}
                              onValueChange={(v: any) => updateItem(it.id, { tipo: v, destinatario: v === 'empresa' ? 'Empresa' : '' })}
                              className="flex gap-4 mt-1"
                              disabled={it.status !== 'ready'}
                            >
                              <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <RadioGroupItem value="empresa" /> Para a Empresa
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <RadioGroupItem value="fornecedor" /> Para Fornecedor
                              </label>
                            </RadioGroup>
                          </div>
                          {it.tipo === 'fornecedor' && (
                            <div>
                              <Label className="text-xs">Destinatário (fornecedor)</Label>
                              <Input value={it.destinatario}
                                onChange={(e) => updateItem(it.id, { destinatario: e.target.value })}
                                placeholder="Nome do fornecedor"
                                disabled={it.status !== 'ready'} />
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">Descrição</Label>
                            <Textarea value={it.descricao} rows={1}
                              onChange={(e) => updateItem(it.id, { descricao: e.target.value })}
                              disabled={it.status !== 'ready'} />
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={savingAll}>Cancelar</Button>
              <Button
                onClick={handleSaveAll}
                disabled={savingAll || items.filter(i => i.status === 'ready').length === 0 || !fVendedor}
              >
                {savingAll ? <><Loader2 size={14} className="animate-spin mr-1" /> Salvando...</> : `Salvar ${items.filter(i => i.status === 'ready').length} recebimento(s)`}
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
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clearSelection}>Limpar seleção</Button>
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
                <TableHead>Vendedor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} data-state={selectedIds.has(r.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label={`Selecionar ${r.destinatario}`}
                    />
                  </TableCell>
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
                      <Button size="sm" variant="ghost" onClick={() => setViewerPath(r.comprovante_url!)}>
                        <FileText size={14} className="mr-1" /> Ver
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Editar" onClick={() => openEdit(r)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" title="Excluir" onClick={() => setDeleteTarget(r)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edição */}
      <Dialog open={!!editState} onOpenChange={(o) => !o && !editSaving && setEditState(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar recebimento</DialogTitle></DialogHeader>
          {editState && (
            <div className="space-y-3">
              <div>
                <Label>Vendedor</Label>
                <Select value={editState.vendedor} onValueChange={(v) => setEditState({ ...editState, vendedor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={editState.data_pagamento}
                    onChange={(e) => setEditState({ ...editState, data_pagamento: e.target.value })} />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={editState.valor}
                    onChange={(e) => setEditState({ ...editState, valor: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Tipo</Label>
                <RadioGroup
                  value={editState.tipo}
                  onValueChange={(v: any) => setEditState({
                    ...editState, tipo: v,
                    destinatario: v === 'empresa' ? 'Empresa' : (editState.tipo === 'empresa' ? '' : editState.destinatario),
                  })}
                  className="flex gap-4 mt-1"
                >
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value="empresa" /> Para a Empresa
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value="fornecedor" /> Para Fornecedor
                  </label>
                </RadioGroup>
              </div>
              {editState.tipo === 'fornecedor' && (
                <div>
                  <Label>Destinatário</Label>
                  <Input value={editState.destinatario}
                    onChange={(e) => setEditState({ ...editState, destinatario: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={editState.descricao}
                  onChange={(e) => setEditState({ ...editState, descricao: e.target.value })} />
              </div>
              <div>
                <Label>Comprovante</Label>
                <div className="flex items-center gap-2 mt-1">
                  {editState.row.comprovante_url && (
                    <Button size="sm" variant="outline" type="button"
                      onClick={() => setViewerPath(editState.row.comprovante_url!)}>
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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !bulkDeleting && setBulkDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selection.count} lançamento(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os comprovantes PDF anexados também serão removidos.
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
        onSaveOnlyNew={handleDupSaveOnlyNew}
        saving={savingAll}
      />
    </div>
  );
};

export default FinanceiroAReceber;
