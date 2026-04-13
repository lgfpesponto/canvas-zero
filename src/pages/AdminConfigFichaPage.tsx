import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  useFichaTipoBySlug, useFichaCategorias, useStatusEtapas,
  useFichaWorkflow, useToggleWorkflow, useInsertCategoria,
  useFichaVariacoes, useUpdateVariacao, useDeleteVariacao,
  useInsertVariacao, useUpdateCategoria, useDeleteCategoria,
  useFichaCampos, useInsertFichaCampo, useUpdateFichaCampo, useDeleteFichaCampo,
  useAllVariacoesByFichaTipo,
  type FichaCategoria, type FichaVariacao, type FichaCampo,
} from '@/hooks/useAdminConfig';
import { motion, AnimatePresence } from 'framer-motion';
import SearchableSelect from '@/components/SearchableSelect';
import React from 'react';
import {
  ArrowLeft, Layers, CheckCircle, Plus, ChevronDown, ChevronRight,
  Trash2, ArrowUp, ArrowDown, GripVertical, Link2, Pencil, Search, Save,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  MODELOS, TAMANHOS, GENEROS, ACESSORIOS, TIPOS_COURO, CORES_COURO,
  BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA, LASER_OPTIONS,
  COR_GLITTER, COR_LINHA, COR_BORRACHINHA, COR_VIVO,
  DESENVOLVIMENTO, AREA_METAL, TIPO_METAL, COR_METAL,
  SOLADO, COR_SOLA, COR_VIRA, FORMATO_BICO, CARIMBO,
  SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO,
  PINTURA_PRECO, TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO,
  FRANJA_PRECO, CORRENTE_PRECO, STRASS_PRECO, CRUZ_METAL_PRECO,
  BRIDAO_METAL_PRECO, CAVALO_METAL_PRECO,
  LASER_CANO_PRECO, LASER_GASPEA_PRECO, LASER_TALONEIRA_PRECO,
  GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO, GLITTER_TALONEIRA_PRECO,
} from '@/lib/orderFieldsConfig';

/* ─── Helpers ─── */
function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const TIPOS_CAMPO = [
  { value: 'texto', label: 'Texto Aberto' },
  { value: 'selecao', label: 'Seleção Única' },
  { value: 'multipla', label: 'Múltipla Escolha' },
  { value: 'checkbox', label: 'Checkbox Sim/Não' },
];

const VINCULOS = [
  { value: '', label: 'Nenhum' },
  { value: 'preco', label: 'Cálculo de Preço' },
  { value: 'numeracao', label: 'Numeração' },
];

const cls = {
  label: 'block text-sm font-semibold mb-1',
  select: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none',
  input: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none',
  inputSmall: 'bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none',
  checkItem: 'flex items-center gap-2 text-sm',
};

/* ─── Shared Section component (mirrors OrderPage) ─── */
function Section({ title, children, onMoveUp, onMoveDown, isFirst, isLast, categoriaId, onRename, onDelete, required, onToggleRequired }: {
  title: string; children: React.ReactNode;
  onMoveUp?: () => void; onMoveDown?: () => void; isFirst?: boolean; isLast?: boolean;
  categoriaId?: string; onRename?: (id: string, nome: string) => void; onDelete?: (id: string) => void;
  required?: boolean; onToggleRequired?: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editName, setEditName] = useState(title);

  const handleSaveTitle = () => {
    if (onRename && categoriaId && editName.trim() && editName.trim() !== title) {
      onRename(categoriaId, editName.trim());
    }
    setEditingTitle(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border pb-1">
        {editingTitle ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="text-base font-bold bg-background border border-primary rounded px-2 py-0.5 flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }} />
            <button type="button" onClick={handleSaveTitle} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">OK</button>
            <button type="button" onClick={() => setEditingTitle(false)} className="text-xs px-2 py-1 bg-muted border border-border rounded">✕</button>
            {onDelete && categoriaId && (
              <button type="button" onClick={() => { if (confirm(`Apagar seção "${title}"?`)) onDelete(categoriaId); }} className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">Apagar</button>
            )}
            {onToggleRequired && (
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={required} onChange={() => onToggleRequired()} className="accent-destructive" />
                Obrigatório
              </label>
            )}
          </div>
        ) : (
          <>
            <h3 className="text-base font-display font-bold flex-1">
              {title}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </h3>
            {(categoriaId && onRename || onToggleRequired || onDelete) && (
              <button type="button" onClick={() => { setEditName(title); setEditingTitle(true); }} className="text-muted-foreground hover:text-primary" title="Editar seção"><Pencil size={14} /></button>
            )}
          </>
        )}
        {onMoveUp && (
          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={isFirst} onClick={onMoveUp}><ArrowUp className="h-3 w-3" /></Button>
        )}
        {onMoveDown && (
          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={isLast} onClick={onMoveDown}><ArrowDown className="h-3 w-3" /></Button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── AdminEditableOptions: shows options list with pencil/add/bulk edit ─── */
function AdminEditableOptions({
  catSlug, catLabel, fichaTipoId, allCategorias, allVariacoes, onRefetchCats,
  fallback,
}: {
  catSlug: string; catLabel: string; fichaTipoId: string;
  allCategorias: FichaCategoria[]; allVariacoes: FichaVariacao[]; onRefetchCats: () => void;
  fallback?: { label: string; preco: number }[];
}) {
  const cat = allCategorias.find(c => c.slug === catSlug);
  const { data: variacoes, refetch } = useFichaVariacoes(cat?.id);
  const insertVariacao = useInsertVariacao();
  const insertCategoria = useInsertCategoria();
  const updateVariacao = useUpdateVariacao();
  const deleteVariacao = useDeleteVariacao();

  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkValue, setBulkValue] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newPreco, setNewPreco] = useState('0');
  // editState keyed by dbId or "fb_index" for fallback-only items
  const [editState, setEditState] = useState<Record<string, { nome: string; preco: string; dbId: string | null; isFallback: boolean }>>({});
  const [relOpen, setRelOpen] = useState<string | null>(null);
  const [relCatFilter, setRelCatFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleCreateCategory = () => {
    const ordem = allCategorias.length + 1;
    insertCategoria.mutate(
      { ficha_tipo_id: fichaTipoId, slug: catSlug, nome: catLabel, ordem },
      {
        onSuccess: () => { toast.success(`Categoria "${catLabel}" criada`); onRefetchCats(); },
        onError: () => toast.error('Erro ao criar categoria'),
      }
    );
  };

  const handleAddVariacao = () => {
    if (!newNome.trim() || !cat) return;
    insertVariacao.mutate(
      { categoria_id: cat.id, nome: newNome.trim(), preco_adicional: parseFloat(newPreco) || 0, ordem: 0 },
      {
        onSuccess: () => {
          toast.success('Variação adicionada');
          setNewNome('');
          setNewPreco('0');
          setShowAddDialog(false);
          refetch();
        },
        onError: () => toast.error('Erro ao adicionar'),
      },
    );
  };

  if (!cat) {
    return (
      <div className="mt-1">
        <button
          type="button"
          onClick={handleCreateCategory}
          disabled={insertCategoria.isPending}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Criar categoria "{catLabel}" no banco
        </button>
      </div>
    );
  }

  // Build merged items (fallback base + DB overrides + DB extras)
  const fb = fallback || [];
  const dbMap = new Map((variacoes || []).map(v => [v.nome.toLowerCase(), v]));
  type MergedItem = { label: string; preco: number; dbId: string | null; ativo: boolean; relacionamento: any; isFallback: boolean };
  const mergedItems: MergedItem[] = [];
  const usedDbIds = new Set<string>();

  fb.forEach(f => {
    const d = dbMap.get(f.label.toLowerCase());
    if (d) {
      usedDbIds.add(d.id);
      mergedItems.push({ label: d.nome, preco: d.preco_adicional, dbId: d.id, ativo: d.ativo ?? true, relacionamento: (d as any).relacionamento, isFallback: false });
    } else {
      mergedItems.push({ label: f.label, preco: f.preco, dbId: null, ativo: true, relacionamento: null, isFallback: true });
    }
  });
  (variacoes || []).forEach(v => {
    if (!usedDbIds.has(v.id)) {
      mergedItems.push({ label: v.nome, preco: v.preco_adicional, dbId: v.id, ativo: v.ativo ?? true, relacionamento: (v as any).relacionamento, isFallback: false });
    }
  });
  mergedItems.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  const openEditPanel = () => {
    const state: Record<string, { nome: string; preco: string; dbId: string | null; isFallback: boolean }> = {};
    mergedItems.forEach((item, idx) => {
      const key = item.dbId || `fb_${idx}`;
      state[key] = { nome: item.label, preco: String(item.preco), dbId: item.dbId, isFallback: item.isFallback };
    });
    setEditState(state);
    setSelectedIds(new Set());
    setShowEditPanel(true);
    setShowBulkEdit(false);
    setBulkValue('');
  };

  const handleSaveAll = async () => {
    for (const [key, s] of Object.entries(editState)) {
      if (s.dbId) {
        // Existing DB item - update if changed
        const orig = (variacoes || []).find(v => v.id === s.dbId);
        if (orig && (s.nome !== orig.nome || parseFloat(s.preco) !== orig.preco_adicional)) {
          await updateVariacao.mutateAsync({ id: s.dbId, nome: s.nome, preco_adicional: parseFloat(s.preco) || 0 });
        }
      } else if (s.isFallback) {
        // Fallback-only item that was edited - find matching fallback
        const fbOrig = fb.find(f => f.label.toLowerCase() === s.nome.toLowerCase());
        const wasEdited = !fbOrig || fbOrig.label !== s.nome || (fbOrig.preco || 0) !== (parseFloat(s.preco) || 0);
        // Always persist fallback items to DB so they become editable
        if (cat) {
          await insertVariacao.mutateAsync({
            categoria_id: cat.id,
            nome: s.nome,
            preco_adicional: parseFloat(s.preco) || 0,
            ordem: 0,
          });
        }
      }
    }
    toast.success('Alterações salvas');
    setShowEditPanel(false);
    refetch();
  };

  const handleBulkApply = () => {
    const inc = parseFloat(bulkValue);
    if (isNaN(inc) || inc === 0) return;
    setEditState(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const cur = parseFloat(next[key].preco) || 0;
        next[key] = { ...next[key], preco: String(Math.max(0, cur + inc)) };
      }
      return next;
    });
    setBulkValue('');
    setShowBulkEdit(false);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remover ${selectedIds.size} variação(ões)?`)) return;
    for (const id of selectedIds) {
      const s = editState[id];
      if (s?.dbId) {
        await deleteVariacao.mutateAsync(s.dbId);
      } else if (s?.isFallback && cat) {
        // Insert as inactive to "delete" a fallback
        await insertVariacao.mutateAsync({ categoria_id: cat.id, nome: s.nome, preco_adicional: 0, ordem: 0 });
        // Then set inactive
        const { data } = await supabase.from('ficha_variacoes').select('id').eq('categoria_id', cat.id).eq('nome', s.nome).single();
        if (data) await updateVariacao.mutateAsync({ id: data.id, ativo: false });
      }
    }
    // Remove from edit state
    setEditState(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => delete next[id]);
      return next;
    });
    toast.success('Variações removidas');
    setSelectedIds(new Set());
    refetch();
  };

  const handleDelete = async (key: string, nome: string) => {
    if (!confirm(`Remover "${nome}"?`)) return;
    const s = editState[key];
    if (s?.dbId) {
      await deleteVariacao.mutateAsync(s.dbId);
    } else if (s?.isFallback && cat) {
      await insertVariacao.mutateAsync({ categoria_id: cat.id, nome: s.nome, preco_adicional: 0, ordem: 0 });
      const { data } = await supabase.from('ficha_variacoes').select('id').eq('categoria_id', cat.id).eq('nome', s.nome).single();
      if (data) await updateVariacao.mutateAsync({ id: data.id, ativo: false });
    }
    toast.success('Removida');
    setEditState(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    refetch();
  };

  const handleRelChange = async (itemKey: string, catSlugTarget: string, selectedValues: string[]) => {
    let dbId = editState[itemKey]?.dbId;
    
    // If fallback item, auto-save to DB first
    if (!dbId && editState[itemKey]?.isFallback && cat) {
      const s = editState[itemKey];
      await insertVariacao.mutateAsync({
        categoria_id: cat.id,
        nome: s.nome,
        preco_adicional: parseFloat(s.preco) || 0,
        ordem: 0,
      });
      const { data: newVar } = await supabase.from('ficha_variacoes').select('id').eq('categoria_id', cat.id).eq('nome', s.nome).single();
      if (!newVar) { toast.error('Erro ao salvar variação'); return; }
      dbId = newVar.id;
      // Update edit state to reflect it's now in DB
      setEditState(prev => ({ ...prev, [itemKey]: { ...prev[itemKey], dbId, isFallback: false } }));
      await refetch();
    }
    
    if (!dbId) return;
    const v = variacoes?.find(x => x.id === dbId);
    const rel = ((v as any)?.relacionamento as Record<string, string[]> | null) || {};
    const newRel = { ...rel, [catSlugTarget]: selectedValues };
    Object.keys(newRel).forEach(k => { if (newRel[k].length === 0) delete newRel[k]; });
    const finalRel = Object.keys(newRel).length > 0 ? newRel : null;
    updateVariacao.mutate({ id: dbId, relacionamento: finalRel }, {
      onSuccess: () => { toast.success('Relacionamento salvo'); refetch(); },
    });
  };

  const otherCats = allCategorias.filter(c => c.id !== cat.id);
  const editItems = Object.entries(editState).sort(([, a], [, b]) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const handleReorderItem = (key: string, dir: 'up' | 'down') => {
    const idx = editItems.findIndex(([k]) => k === key);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= editItems.length) return;
    const [, item] = editItems[idx];
    const [, swapItem] = editItems[swapIdx];
    if (item.dbId && swapItem.dbId) {
      updateVariacao.mutate({ id: item.dbId, ordem: swapIdx }, { onSuccess: () => refetch() });
      updateVariacao.mutate({ id: swapItem.dbId, ordem: idx });
    }
  };

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1.5 mb-1">
        <button type="button" onClick={() => setShowAddDialog(true)} className="text-primary hover:text-primary/80" title="Adicionar variação"><Plus size={14} /></button>
        {mergedItems.length > 0 && (
          <button type="button" onClick={openEditPanel} className="text-primary hover:text-primary/80" title="Editar variações"><Pencil size={12} /></button>
        )}
        <span className="text-xs text-muted-foreground">({mergedItems.length} opções)</span>
      </div>

      {showAddDialog && (
        <div className="flex flex-wrap items-end gap-2 mb-2 p-3 border border-primary/30 rounded-lg bg-muted/50">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium">Nome</label>
            <input type="text" value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome da variação..." className={cls.inputSmall + ' w-full'} />
          </div>
          <div className="w-24">
            <label className="text-xs font-medium">Valor (R$)</label>
            <input type="number" value={newPreco} onChange={e => setNewPreco(e.target.value)} placeholder="0" className={cls.inputSmall + ' w-full'} />
          </div>
          <button type="button" onClick={handleAddVariacao} className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">Salvar</button>
          <button type="button" onClick={() => { setShowAddDialog(false); setNewNome(''); setNewPreco('0'); }} className="px-3 py-2 bg-muted border border-border rounded-md text-sm hover:bg-muted/80">Cancelar</button>
        </div>
      )}

      <Dialog open={showEditPanel} onOpenChange={setShowEditPanel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-montserrat lowercase">editar variações — {catLabel}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
            <button type="button" onClick={handleSaveAll} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">Salvar</button>
            {Object.values(editState).some(it => it.isFallback) && (
              <button type="button" onClick={async () => {
                const fallbacks = Object.entries(editState).filter(([, it]) => it.isFallback);
                if (fallbacks.length === 0) return;
                try {
                  for (const [key, it] of fallbacks) {
                    const { data, error } = await supabase.from('ficha_variacoes').insert({ categoria_id: cat!.id, nome: it.nome, preco_adicional: Number(it.preco) || 0, ordem: 0 }).select('id').single();
                    if (error) throw error;
                    setEditState(prev => ({ ...prev, [key]: { ...prev[key], isFallback: false, dbId: data.id } }));
                  }
                  toast.success(`${fallbacks.length} variações salvas no banco!`);
                  refetch();
                } catch (err: any) { toast.error('Erro ao salvar: ' + err.message); }
              }} className="px-4 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:bg-accent/80 border border-border">💾 Salvar no banco ({Object.values(editState).filter(it => it.isFallback).length})</button>
            )}
            <button type="button" onClick={() => setShowEditPanel(false)} className="px-4 py-2 bg-muted border border-border rounded text-sm hover:bg-muted/80">Cancelar</button>
            <button type="button" onClick={() => setShowBulkEdit(!showBulkEdit)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm font-medium hover:bg-secondary/80">Ed. massa</button>
            {selectedIds.size > 0 && (
              <button type="button" onClick={handleDeleteSelected} className="px-4 py-2 bg-destructive text-destructive-foreground rounded text-sm font-medium hover:opacity-90">Apagar selecionadas ({selectedIds.size})</button>
            )}
          </div>
          {showBulkEdit && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-sm text-muted-foreground">Adicionar valor a todos:</span>
              <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="text-sm border border-border rounded px-3 py-2 bg-background w-24" placeholder="+5" />
              <button type="button" onClick={handleBulkApply} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">Aplicar</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {editItems.map(([key, item]) => {
              // Get relationship data - from DB or from merged
              const dbVar = item.dbId ? variacoes?.find(x => x.id === item.dbId) : null;
              const itemRel = dbVar ? ((dbVar as any).relacionamento as Record<string, string[]> | null) : null;
              const hasRel = itemRel && Object.keys(itemRel).length > 0;
              
              // Filter categories for relationship panel
              const filteredRelCats = relCatFilter 
                ? otherCats.filter(oc => oc.id === relCatFilter)
                : otherCats;

              return (
                <React.Fragment key={key}>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${item.isFallback ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/5 border-primary/20'}`}>
                    <input type="checkbox" checked={selectedIds.has(key)} onChange={() => toggleSelected(key)} className="accent-destructive w-4 h-4 shrink-0" />
                    <input type="text" value={item.nome} onChange={e => setEditState(prev => ({ ...prev, [key]: { ...prev[key], nome: e.target.value } }))} className="text-sm border border-border rounded px-3 py-2 bg-background flex-1 min-w-[180px]" placeholder="Nome da variação" />
                    <span className="text-sm text-muted-foreground shrink-0">R$</span>
                    <input type="number" value={item.preco} onChange={e => setEditState(prev => ({ ...prev, [key]: { ...prev[key], preco: e.target.value } }))} className="text-sm border border-border rounded px-3 py-2 bg-background w-24 shrink-0" />
                    {item.isFallback
                      ? <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0 border-amber-500/50 text-amber-700">não salvo</Badge>
                      : <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0 border-green-500/50 text-green-700 bg-green-50">salvo no banco</Badge>
                    }
                    <button type="button" onClick={() => handleReorderItem(key, 'up')} className="text-muted-foreground hover:text-primary shrink-0" title="Mover para cima"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => handleReorderItem(key, 'down')} className="text-muted-foreground hover:text-primary shrink-0" title="Mover para baixo"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => { setRelOpen(relOpen === key ? null : key); setRelCatFilter(''); }} className={`shrink-0 ${hasRel ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} title="Relacionamento"><Link2 size={14} /></button>
                    <button type="button" onClick={() => handleDelete(key, item.nome)} className="text-destructive hover:text-destructive/80 shrink-0" title="Excluir"><Trash2 size={14} /></button>
                  </div>
                  {relOpen === key && (
                    <div className="p-3 border border-primary/20 rounded-lg bg-background ml-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium flex-1">Relacionamentos: {item.nome}</p>
                        {item.isFallback && <span className="text-[10px] text-amber-600">(será salvo ao vincular)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Search size={14} className="text-muted-foreground shrink-0" />
                        <select 
                          value={relCatFilter} 
                          onChange={e => setRelCatFilter(e.target.value)}
                          className="text-sm border border-border rounded px-2 py-1.5 bg-background flex-1"
                        >
                          <option value="">Todas as categorias</option>
                          {otherCats.filter(oc => allVariacoes.some(av => av.categoria_id === oc.id && av.ativo)).map(oc => (
                            <option key={oc.id} value={oc.id}>{oc.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filteredRelCats.map(oc => {
                          const catVars = allVariacoes.filter(av => av.categoria_id === oc.id && av.ativo);
                          if (catVars.length === 0) return null;
                          const rel = itemRel || {};
                          const selected = rel[oc.slug] || [];
                          return (
                            <div key={oc.id} className="space-y-1">
                              <Label className="text-xs font-semibold text-primary">{oc.nome}</Label>
                              <div className="flex flex-wrap gap-1">
                                {catVars.map(cv => {
                                  const isSelected = selected.includes(cv.nome);
                                  return (
                                    <Badge key={cv.id} variant={isSelected ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => {
                                      const newSel = isSelected ? selected.filter(s => s !== cv.nome) : [...selected, cv.nome];
                                      handleRelChange(key, oc.slug, newSel);
                                    }}>
                                      {cv.nome}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {filteredRelCats.every(oc => allVariacoes.filter(av => av.categoria_id === oc.id && av.ativo).length === 0) && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhuma variação encontrada</p>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── AdminSelectField: Same as OrderPage SelectField but with admin tools ─── */
function AdminSelectField({
  label, catSlug, fallback, fichaTipoId, allCategorias, allVariacoes, onRefetchCats, required,
  onRename, onDelete, onToggleRequired,
}: {
  label: string; catSlug: string;
  fallback: string[] | { label: string; preco?: number }[];
  fichaTipoId: string; allCategorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  onRefetchCats: () => void; required?: boolean;
  onRename?: (newLabel: string) => void; onDelete?: () => void; onToggleRequired?: () => void;
}) {
  const cat = allCategorias.find(c => c.slug === catSlug);
  const { data: variacoes } = useFichaVariacoes(cat?.id);
  const common = { catSlug, catLabel: label, fichaTipoId, allCategorias, allVariacoes, onRefetchCats };
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);

  const fbNorm = (Array.isArray(fallback) && fallback.length > 0 && typeof fallback[0] === 'string')
    ? (fallback as string[]).map(f => ({ label: f, preco: 0 }))
    : (fallback as { label: string; preco?: number }[]).map(f => ({ label: f.label, preco: f.preco || 0 }));
  const dbMap = new Map((variacoes || []).map(v => [v.nome.toLowerCase(), v]));
  const merged = fbNorm.map(f => {
    const d = dbMap.get(f.label.toLowerCase());
    return d ? { label: d.nome, preco: d.preco_adicional } : f;
  });
  (variacoes || []).forEach(v => {
    if (!fbNorm.some(f => f.label.toLowerCase() === v.nome.toLowerCase())) {
      merged.push({ label: v.nome, preco: v.preco_adicional });
    }
  });
  merged.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const options = merged.map(m => m.preco > 0 ? `${m.label} (R$${m.preco})` : m.label);

  const handleSaveLabel = () => {
    if (onRename && editLabel.trim() && editLabel.trim() !== label) onRename(editLabel.trim());
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} className="text-sm font-semibold bg-background border border-primary rounded px-2 py-0.5 flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(); if (e.key === 'Escape') setEditing(false); }} />
            <button type="button" onClick={handleSaveLabel} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">OK</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs px-2 py-1 bg-muted border border-border rounded">✕</button>
            {onDelete && <button type="button" onClick={() => { if (confirm(`Apagar campo "${label}"?`)) onDelete(); }} className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">Apagar</button>}
            {onToggleRequired && (
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={required} onChange={() => onToggleRequired()} className="accent-destructive" />
                Obrig.
              </label>
            )}
          </div>
        ) : (
          <>
            <label className={cls.label + ' !mb-0'}>{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
            {(onRename || onDelete || onToggleRequired) && (
              <button type="button" onClick={() => { setEditLabel(label); setEditing(true); }} className="text-muted-foreground hover:text-primary" title="Editar campo"><Pencil size={13} /></button>
            )}
          </>
        )}
      </div>
      <SearchableSelect options={options} value="" onValueChange={() => {}} placeholder="Selecione..." />
      <AdminEditableOptions {...common} fallback={fbNorm} />
    </div>
  );
}

/* ─── AdminMultiSelect: Same grid as OrderPage MultiSelect but admin mode ─── */
function AdminMultiSelect({
  catSlug, catLabel, fallback, fichaTipoId, allCategorias, allVariacoes, onRefetchCats,
  onRename, onDelete, onToggleRequired, required,
}: {
  catSlug: string; catLabel: string;
  fallback: { label: string; preco: number }[];
  fichaTipoId: string; allCategorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  onRefetchCats: () => void;
  onRename?: (newLabel: string) => void; onDelete?: () => void; onToggleRequired?: () => void; required?: boolean;
}) {
  const cat = allCategorias.find(c => c.slug === catSlug);
  const { data: variacoes } = useFichaVariacoes(cat?.id);
  const common = { catSlug, catLabel, fichaTipoId, allCategorias, allVariacoes, onRefetchCats };
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(catLabel);

  const dbMapM = new Map((variacoes || []).map(v => [v.nome.toLowerCase(), v]));
  const mergedM = fallback.map(f => {
    const d = dbMapM.get(f.label.toLowerCase());
    return d ? { label: d.nome, preco: d.preco_adicional } : { label: f.label, preco: f.preco };
  });
  (variacoes || []).forEach(v => {
    if (!fallback.some(f => f.label.toLowerCase() === v.nome.toLowerCase())) {
      mergedM.push({ label: v.nome, preco: v.preco_adicional });
    }
  });
  mergedM.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const items = mergedM;

  const hasSearch = catLabel.toLowerCase().includes('bordado') || catLabel.toLowerCase().includes('laser') || items.length > 10;
  const [search, setSearch] = useState('');
  const filtered = search ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : items;

  const normal = filtered.filter(i => !i.label.toLowerCase().startsWith('bordado variado'));
  const variado = filtered.filter(i => i.label.toLowerCase().startsWith('bordado variado'));
  const display = [...normal, ...variado];
  const firstVariadoIdx = display.findIndex(i => i.label.toLowerCase().startsWith('bordado variado'));

  const handleSaveLabel = () => {
    if (onRename && editLabel.trim() && editLabel.trim() !== catLabel) onRename(editLabel.trim());
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} className="text-sm font-semibold bg-background border border-primary rounded px-2 py-0.5 flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(); if (e.key === 'Escape') setEditing(false); }} />
            <button type="button" onClick={handleSaveLabel} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">OK</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs px-2 py-1 bg-muted border border-border rounded">✕</button>
            {onDelete && <button type="button" onClick={() => { if (confirm(`Apagar campo "${catLabel}"?`)) onDelete(); }} className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">Apagar</button>}
            {onToggleRequired && (
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={required} onChange={() => onToggleRequired()} className="accent-destructive" />
                Obrig.
              </label>
            )}
          </div>
        ) : (
          <>
            <label className={cls.label + ' mb-0'}>{catLabel}{required && <span className="text-destructive ml-0.5">*</span>}</label>
            {(onRename || onDelete || onToggleRequired) && (
              <button type="button" onClick={() => { setEditLabel(catLabel); setEditing(true); }} className="text-muted-foreground hover:text-primary" title="Editar campo"><Pencil size={13} /></button>
            )}
          </>
        )}
      </div>
      {hasSearch && (
        <div className="relative mb-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={catLabel.toLowerCase().includes('bordado') ? 'Pesquisar bordado...' : 'Pesquisar...'}
            className={cls.input + ' pl-8 !py-1.5 text-xs'} />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto border border-border rounded-lg p-3 bg-muted/50">
        {display.map((item, idx) => (
          <React.Fragment key={item.label}>
            {hasSearch && idx === firstVariadoIdx && firstVariadoIdx > 0 && (
              <div className="col-span-full text-xs font-bold text-muted-foreground uppercase tracking-wider border-t border-border pt-2 mt-1 mb-1">Bordados Variados</div>
            )}
            <label className={cls.checkItem}>
              <input type="checkbox" checked={false} readOnly className="accent-primary w-4 h-4 opacity-50" />
              <span>{item.label} {item.preco > 0 && <span className="text-muted-foreground text-xs">(R${item.preco})</span>}</span>
            </label>
          </React.Fragment>
        ))}
        {display.length === 0 && <p className="col-span-full text-xs text-muted-foreground text-center py-2">Nenhuma variação</p>}
      </div>
      <AdminEditableOptions {...common} fallback={fallback} />
    </div>
  );
}

/* ─── AdminToggleField: Same as OrderPage ToggleField but with edit capability ─── */
function AdminToggleField({ label, preco, onDelete, onToggleRequired, required }: {
  label: string; preco: number; onDelete?: () => void; onToggleRequired?: () => void; required?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editPreco, setEditPreco] = useState(String(preco));

  return (
    <div className="flex flex-wrap items-center gap-3">
      {editing ? (
        <div className="flex items-center gap-2 flex-wrap">
          <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} className="bg-background border border-primary rounded px-2 py-1 text-sm font-semibold w-32" autoFocus />
          <span className="text-sm text-muted-foreground">(+R$</span>
          <input type="text" value={editPreco} onChange={e => setEditPreco(e.target.value)} className="bg-background border border-primary rounded px-2 py-1 text-sm w-16" />
          <span className="text-sm text-muted-foreground">)</span>
          <button type="button" onClick={() => setEditing(false)} className="text-xs px-2 py-1 bg-muted border border-border rounded">OK</button>
          {onDelete && <button type="button" onClick={() => { if (confirm(`Apagar campo "${label}"?`)) onDelete(); }} className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">Apagar</button>}
          {onToggleRequired && (
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={required} onChange={() => onToggleRequired()} className="accent-destructive" />
              Obrig.
            </label>
          )}
        </div>
      ) : (
        <>
          <span className="text-sm font-semibold min-w-[120px]">{label}{required && <span className="text-destructive ml-0.5">*</span>} (+R${preco}):</span>
          <button type="button" onClick={() => { setEditLabel(label); setEditPreco(String(preco)); setEditing(true); }} className="text-muted-foreground hover:text-primary" title="Editar campo">
            <Pencil size={13} />
          </button>
        </>
      )}
      <select disabled className={cls.inputSmall + ' w-28 opacity-60'}>
        <option>Não tem</option>
        <option>Tem</option>
      </select>
      <span className="text-xs text-muted-foreground italic">(valor fixo)</span>
    </div>
  );
}

/* ─── AdminTextFieldRef: Same as OrderPage text input, with edit/delete ─── */
function AdminTextRef({ label, onRename, onDelete, required, onToggleRequired }: {
  label: string; onRename?: (newLabel: string) => void; onDelete?: () => void;
  required?: boolean; onToggleRequired?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);

  const handleSave = () => {
    if (onRename && editLabel.trim() && editLabel.trim() !== label) {
      onRename(editLabel.trim());
    }
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} className="text-sm font-semibold bg-background border border-primary rounded px-2 py-0.5 flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }} />
            <button type="button" onClick={handleSave} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">OK</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs px-2 py-1 bg-muted border border-border rounded">✕</button>
            {onDelete && (
              <button type="button" onClick={() => { if (confirm(`Apagar campo "${label}"?`)) onDelete(); }} className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">Apagar</button>
            )}
            {onToggleRequired && (
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={required} onChange={() => onToggleRequired()} className="accent-destructive" />
                Obrig.
              </label>
            )}
          </div>
        ) : (
          <>
            <label className={cls.label + ' !mb-0'}>{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
            {(onRename || onDelete || onToggleRequired) && (
              <button type="button" onClick={() => { setEditLabel(label); setEditing(true); }} className="text-muted-foreground hover:text-primary" title="Editar campo">
                <Pencil size={13} />
              </button>
            )}
          </>
        )}
      </div>
      <input type="text" disabled placeholder="(preenchido pelo vendedor)" className={cls.input + ' opacity-50 italic'} />
    </div>
  );
}

/* ─── Boot Form Layout (data-driven from visual categories → fields → variations) ─── */
function BootFormLayout({
  fichaTipoId, categorias, allVariacoes, campos, onRefetchCats, onRefetchCampos,
  sectionOrder, onMoveSection, bootFallbackMap,
}: {
  fichaTipoId: string; categorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  campos: FichaCampo[]; onRefetchCats: () => void; onRefetchCampos: () => void;
  sectionOrder: number[]; onMoveSection: (idx: number, dir: 'up' | 'down') => void;
  bootFallbackMap: Record<string, { label: string; preco: number }[]>;
}) {
  const updateCategoria = useUpdateCategoria();
  const deleteCategoria = useDeleteCategoria();
  const updateCampo = useUpdateFichaCampo();
  const deleteCampo = useDeleteFichaCampo();
  const insertVariacao = useInsertVariacao();
  const updateVariacao = useUpdateVariacao();
  const deleteVariacao = useDeleteVariacao();
  const queryClient = useQueryClient();

  // Visual categories only (ativo = true), sorted by ordem
  const visualCats = (categorias || []).filter(c => c.ativo !== false).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  // Group campos by categoria_id
  const camposByCat = new Map<string, FichaCampo[]>();
  (campos || []).filter(c => c.ativo !== false).forEach(c => {
    if (c.categoria_id) {
      const list = camposByCat.get(c.categoria_id) || [];
      list.push(c);
      camposByCat.set(c.categoria_id, list);
    }
  });
  // Sort each group
  camposByCat.forEach((list) => list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));

  // Group variations by campo_id
  const varsByCampo = new Map<string, FichaVariacao[]>();
  (allVariacoes || []).forEach(v => {
    if ((v as any).campo_id) {
      const cid = (v as any).campo_id as string;
      const list = varsByCampo.get(cid) || [];
      list.push(v);
      varsByCampo.set(cid, list);
    }
  });
  varsByCampo.forEach((list) => list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));

  const handleRenameCategory = (id: string, nome: string) => {
    updateCategoria.mutate({ id, nome }, {
      onSuccess: () => { toast.success('Categoria renomeada'); onRefetchCats(); },
    });
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategoria.mutate(id, {
      onSuccess: () => { toast.success('Categoria apagada'); onRefetchCats(); },
    });
  };

  const handleReorderField = (campo: FichaCampo, dir: 'up' | 'down', catCampos: FichaCampo[]) => {
    const idx = catCampos.findIndex(c => c.id === campo.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= catCampos.length) return;
    const other = catCampos[swapIdx];
    updateCampo.mutate({ id: campo.id, ordem: other.ordem ?? swapIdx });
    updateCampo.mutate({ id: other.id, ordem: campo.ordem ?? idx }, { onSuccess: () => onRefetchCampos() });
  };

  // Grid layout per category slug (mirrors OrderPage)
  const GRID_LAYOUTS: Record<string, string> = {
    'identificacao': 'grid sm:grid-cols-2 gap-4',
    'tamanho-genero-modelo': 'grid sm:grid-cols-3 gap-4',
    'couros': 'grid sm:grid-cols-2 gap-4',
    'pesponto-visual': 'grid sm:grid-cols-3 gap-4',
    'metais-visual': '', // special handling
    'solados-visual': '', // special handling
    'adicional-visual': 'grid sm:grid-cols-2 gap-4',
  };

  const renderCategoryFields = (cat: FichaCategoria, catCampos: FichaCampo[]) => {
    const gridClass = GRID_LAYOUTS[cat.slug];
    const refetchAll = () => {
      onRefetchCampos();
      queryClient.invalidateQueries({ queryKey: ['ficha_variacoes'] });
      queryClient.invalidateQueries({ queryKey: ['ficha_variacoes_all'] });
      queryClient.invalidateQueries({ queryKey: ['ficha_variacoes_campo'] });
    };
    // Legacy slug map: campo slugs (singular) -> category slugs (plural)
    const LEGACY_SLUG_MAP: Record<string, string> = {
      'tamanho': 'tamanhos',
      'genero': 'generos',
      'modelo': 'modelos',
    };

    const renderField = (campo: FichaCampo, fieldIdx: number) => {
      let fieldVars = varsByCampo.get(campo.id) || [];
      // Fallback: if no campo_id variations, try category-based variations matching campo slug
      const resolvedSlug = LEGACY_SLUG_MAP[campo.slug] || campo.slug;
      let matchedCat: FichaCategoria | undefined;
      if (fieldVars.length === 0 && resolvedSlug) {
        matchedCat = (categorias || []).find(c => c.slug === resolvedSlug);
        if (matchedCat) {
          fieldVars = (allVariacoes || []).filter(v => v.categoria_id === matchedCat!.id);
        }
      }
      // Resolve fallback array for this field
      const fallbackArr = bootFallbackMap[resolvedSlug] || undefined;
      return (
        <BootFieldRenderer
          key={campo.id}
          campo={campo}
          variacoes={fieldVars}
          catCampos={catCampos}
          fieldIdx={fieldIdx}
          onReorder={(dir) => handleReorderField(campo, dir, catCampos)}
          onRefetch={refetchAll}
          allCategorias={categorias}
          allVariacoes={allVariacoes}
          fichaTipoId={fichaTipoId}
          onRefetchCats={onRefetchCats}
          fallback={fallbackArr}
          resolvedCatId={matchedCat?.id}
        />
      );
    };

    // Metais: first 3 fields (Área, Tipo, Cor) in 3-col grid, rest as toggles in 3-col grid
    if (cat.slug === 'metais-visual') {
      const topFields = catCampos.filter(c => ['area_metal', 'tipo_metal', 'cor_metal'].includes(c.slug));
      const toggleFields = catCampos.filter(c => !['area_metal', 'tipo_metal', 'cor_metal'].includes(c.slug));
      return (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {topFields.map((campo, idx) => renderField(campo, catCampos.indexOf(campo)))}
          </div>
          {toggleFields.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4">
              {toggleFields.map((campo) => renderField(campo, catCampos.indexOf(campo)))}
            </div>
          )}
        </>
      );
    }

    // Bordados: group MultiSelect + Cor text fields by part (cano, gáspea, taloneira), then Nome Bordado
    if (cat.slug === 'bordados-visual') {
      const parts = ['cano', 'gaspea', 'taloneira'];
      const nomeBordado = catCampos.find(c => c.slug === 'nome_bordado');
      return (
        <>
          {parts.map(part => {
            const multi = catCampos.find(c => c.slug === `bordado_${part}`);
            const cor = catCampos.find(c => c.slug === `cor_bordado_${part}`);
            return (
              <React.Fragment key={part}>
                {multi && renderField(multi, catCampos.indexOf(multi))}
                {cor && renderField(cor, catCampos.indexOf(cor))}
              </React.Fragment>
            );
          })}
          {nomeBordado && renderField(nomeBordado, catCampos.indexOf(nomeBordado))}
        </>
      );
    }

    // Laser: group MultiSelect + Cor Glitter by part, then Pintura at end
    if (cat.slug === 'laser-visual') {
      const parts = ['cano', 'gaspea', 'taloneira'];
      const pintura = catCampos.find(c => c.slug === 'pintura');
      return (
        <>
          {parts.map(part => {
            const laser = catCampos.find(c => c.slug === `laser_${part}`);
            const glitter = catCampos.find(c => c.slug === `cor_glitter_${part}`);
            return (
              <React.Fragment key={part}>
                {laser && renderField(laser, catCampos.indexOf(laser))}
                {glitter && renderField(glitter, catCampos.indexOf(glitter))}
              </React.Fragment>
            );
          })}
          {pintura && renderField(pintura, catCampos.indexOf(pintura))}
        </>
      );
    }

    // Solados: grid of selecao fields (Solado, Bico, Cor Sola, Cor Vira) + Costura Atrás toggle below
    if (cat.slug === 'solados-visual') {
      const gridFields = catCampos.filter(c => c.tipo === 'selecao');
      const toggleFields = catCampos.filter(c => c.tipo !== 'selecao');
      return (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gridFields.map((campo) => renderField(campo, catCampos.indexOf(campo)))}
          </div>
          {toggleFields.map((campo) => renderField(campo, catCampos.indexOf(campo)))}
        </>
      );
    }

    // Default: apply grid class if defined, otherwise vertical stack
    if (gridClass) {
      return (
        <div className={gridClass}>
          {catCampos.map((campo, fieldIdx) => renderField(campo, fieldIdx))}
        </div>
      );
    }

    return (
      <>
        {catCampos.map((campo, fieldIdx) => renderField(campo, fieldIdx))}
      </>
    );
  };

  return (
    <div className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">
      {visualCats.map((cat, catIdx) => {
        const catCampos = camposByCat.get(cat.id) || [];
        return (
          <Section
            key={cat.id}
            title={cat.nome}
            categoriaId={cat.id}
            onRename={handleRenameCategory}
            onDelete={handleDeleteCategory}
            onMoveUp={() => onMoveSection(catIdx, 'up')}
            onMoveDown={() => onMoveSection(catIdx, 'down')}
            isFirst={catIdx === 0}
            isLast={catIdx === visualCats.length - 1}
          >
            <div className="space-y-4">
              {renderCategoryFields(cat, catCampos)}
              {catCampos.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum campo nesta categoria.</p>
              )}
            </div>
          </Section>
        );
      })}

      {/* ─── Campos finais: Quantidade, Prazo e Valor Total (preview) ─── */}
      <div className="mt-8 space-y-4 border-t border-border pt-6 opacity-60 pointer-events-none">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Campos finais (preview)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Quantidade</Label>
            <Input type="number" defaultValue={1} readOnly className="w-full" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Prazo de Produção</Label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
              15 dias úteis
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Valor Total</Label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-bold text-primary">
              R$ 0,00
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── BootFieldRenderer: renders a single field based on its type ─── */
function BootFieldRenderer({
  campo, variacoes, catCampos, fieldIdx, onReorder, onRefetch,
  allCategorias, allVariacoes, fichaTipoId, onRefetchCats,
  fallback, resolvedCatId,
}: {
  campo: FichaCampo; variacoes: FichaVariacao[]; catCampos: FichaCampo[];
  fieldIdx: number; onReorder: (dir: 'up' | 'down') => void; onRefetch: () => void;
  allCategorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  fichaTipoId: string; onRefetchCats: () => void;
  fallback?: { label: string; preco: number }[];
  resolvedCatId?: string;
}) {
  const updateCampo = useUpdateFichaCampo();
  const deleteCampo = useDeleteFichaCampo();
  const insertVariacao = useInsertVariacao();
  const updateVariacao = useUpdateVariacao();
  const deleteVariacao = useDeleteVariacao();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(campo.nome);
  const [showVarPanel, setShowVarPanel] = useState(false);
  const [addVarName, setAddVarName] = useState('');
  const [addVarPreco, setAddVarPreco] = useState('0');
  const [showAddVar, setShowAddVar] = useState(false);
  const [editState, setEditState] = useState<Record<string, { nome: string; preco: string; dbId: string | null; isFallback: boolean }>>({});
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkValue, setBulkValue] = useState('');
  const [search, setSearch] = useState('');
  const [relOpen, setRelOpen] = useState<string | null>(null);
  const [relCatFilter, setRelCatFilter] = useState('');

  // Build merged items: DB variations + fallback items not yet in DB
  const fb = fallback || [];
  const dbMap = new Map(variacoes.filter(v => v.ativo !== false).map(v => [v.nome.toLowerCase(), v]));
  type MergedVar = { id: string; nome: string; preco_adicional: number; dbId: string | null; isFallback: boolean; ordem: number; ativo: boolean };
  const mergedVars: MergedVar[] = [];
  const usedDbIds = new Set<string>();

  fb.forEach((f, idx) => {
    const d = dbMap.get(f.label.toLowerCase());
    if (d) {
      usedDbIds.add(d.id);
      mergedVars.push({ id: d.id, nome: d.nome, preco_adicional: d.preco_adicional, dbId: d.id, isFallback: false, ordem: d.ordem ?? idx, ativo: d.ativo ?? true });
    } else {
      mergedVars.push({ id: `fb_${idx}`, nome: f.label, preco_adicional: f.preco, dbId: null, isFallback: true, ordem: idx, ativo: true });
    }
  });
  variacoes.filter(v => v.ativo !== false).forEach(v => {
    if (!usedDbIds.has(v.id)) {
      mergedVars.push({ id: v.id, nome: v.nome, preco_adicional: v.preco_adicional, dbId: v.id, isFallback: false, ordem: v.ordem ?? 0, ativo: true });
    }
  });
  mergedVars.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const activeVars = mergedVars;
  const hasVariations = campo.tipo === 'selecao' || campo.tipo === 'multipla';

  const handleSaveName = () => {
    if (editName.trim() && editName.trim() !== campo.nome) {
      updateCampo.mutate({ id: campo.id, nome: editName.trim(), slug: slugify(editName.trim()) }, { onSuccess: onRefetch });
    }
    setEditing(false);
  };

  const handleDeleteField = () => {
    if (confirm(`Remover campo "${campo.nome}"?`)) {
      deleteCampo.mutate(campo.id, { onSuccess: () => { toast.success('Campo removido'); onRefetch(); } });
    }
  };

  const handleAddVariacao = () => {
    if (!addVarName.trim()) return;
    // Use resolvedCatId, campo's visual category, fallback to first variation's category, or resolve by campo slug
    let catId = resolvedCatId || campo.categoria_id || variacoes[0]?.categoria_id;
    if (!catId && campo.slug) {
      const LEGACY_SLUG_MAP: Record<string, string> = { 'tamanho': 'tamanhos', 'genero': 'generos', 'modelo': 'modelos' };
      const resolved = LEGACY_SLUG_MAP[campo.slug] || campo.slug;
      const matchCat = (allCategorias || []).find(c => c.slug === resolved);
      if (matchCat) catId = matchCat.id;
    }
    if (!catId) {
      toast.error('Categoria não encontrada para este campo');
      return;
    }
    insertVariacao.mutate(
      { categoria_id: catId, campo_id: campo.id, nome: addVarName.trim(), preco_adicional: parseFloat(addVarPreco) || 0, ordem: activeVars.length + 1 },
      { onSuccess: () => { toast.success('Variação adicionada'); setAddVarName(''); setAddVarPreco('0'); setShowAddVar(false); onRefetch(); } }
    );
  };

  const openEditPanel = () => {
    const state: Record<string, { nome: string; preco: string; dbId: string | null; isFallback: boolean }> = {};
    activeVars.forEach(v => { state[v.id] = { nome: v.nome, preco: String(v.preco_adicional), dbId: v.dbId, isFallback: v.isFallback }; });
    setEditState(state);
    setShowVarPanel(true);
    setShowBulkEdit(false);
    setBulkValue('');
  };

  const handleSaveAllVars = async () => {
    // Resolve category id for persisting fallback items
    let catId = resolvedCatId || campo.categoria_id || variacoes[0]?.categoria_id;
    for (const [key, s] of Object.entries(editState)) {
      if (s.dbId) {
        // Existing DB item - update if changed
        const orig = variacoes.find(v => v.id === s.dbId);
        if (orig && (s.nome !== orig.nome || parseFloat(s.preco) !== orig.preco_adicional)) {
          await updateVariacao.mutateAsync({ id: s.dbId, nome: s.nome, preco_adicional: parseFloat(s.preco) || 0 });
        }
      } else if (s.isFallback && catId) {
        // Fallback item - persist to DB
        await insertVariacao.mutateAsync({
          categoria_id: catId,
          campo_id: campo.id,
          nome: s.nome,
          preco_adicional: parseFloat(s.preco) || 0,
          ordem: 0,
        });
      }
    }
    toast.success('Alterações salvas');
    setShowVarPanel(false);
    onRefetch();
  };

  const handleBulkApply = () => {
    const inc = parseFloat(bulkValue);
    if (isNaN(inc) || inc === 0) return;
    setEditState(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const cur = parseFloat(next[key].preco) || 0;
        next[key] = { ...next[key], preco: String(Math.max(0, cur + inc)) };
      }
      return next;
    });
    setBulkValue('');
    setShowBulkEdit(false);
  };

  const handleReorderVar = (varId: string, dir: 'up' | 'down') => {
    const editItems = Object.entries(editState).sort(([a], [b]) => {
      const va = activeVars.find(v => v.id === a);
      const vb = activeVars.find(v => v.id === b);
      return ((va?.ordem ?? 0) - (vb?.ordem ?? 0));
    });
    const idx = editItems.findIndex(([k]) => k === varId);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= editItems.length) return;
    const [itemId] = editItems[idx];
    const [swapId] = editItems[swapIdx];
    updateVariacao.mutate({ id: itemId, ordem: swapIdx }, { onSuccess: () => onRefetch() });
    updateVariacao.mutate({ id: swapId, ordem: idx });
  };

  const handleRelChange = async (key: string, catSlug: string, newSel: string[]) => {
    const item = editState[key];
    if (!item) return;
    // If fallback, persist first
    let dbId = item.dbId;
    if (!dbId && item.isFallback) {
      let catId = resolvedCatId || campo.categoria_id || variacoes[0]?.categoria_id;
      if (!catId && campo.slug) {
        const LEGACY_SLUG_MAP: Record<string, string> = { 'tamanho': 'tamanhos', 'genero': 'generos', 'modelo': 'modelos' };
        const resolved = LEGACY_SLUG_MAP[campo.slug] || campo.slug;
        const matchCat = (allCategorias || []).find(c => c.slug === resolved);
        if (matchCat) catId = matchCat.id;
      }
      if (!catId) { toast.error('Salve o item antes de vincular'); return; }
      const { data, error } = await supabase.from('ficha_variacoes').insert({
        categoria_id: catId, campo_id: campo.id, nome: item.nome,
        preco_adicional: parseFloat(item.preco) || 0, ordem: 0,
      }).select('id').single();
      if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
      dbId = data.id;
      setEditState(prev => ({ ...prev, [key]: { ...prev[key], dbId: data.id, isFallback: false } }));
    }
    if (!dbId) return;
    // Build updated relacionamento
    const dbVar = variacoes.find(v => v.id === dbId);
    const curRel = (dbVar as any)?.relacionamento as Record<string, string[]> | null || {};
    const newRel = { ...curRel, [catSlug]: newSel.length > 0 ? newSel : undefined };
    // Clean empty
    Object.keys(newRel).forEach(k => { if (!newRel[k] || (newRel[k] as string[]).length === 0) delete newRel[k]; });
    updateVariacao.mutate({ id: dbId, relacionamento: Object.keys(newRel).length > 0 ? newRel : null }, {
      onSuccess: () => { toast.success('Relacionamento salvo'); onRefetch(); },
    });
  };

  // Other categories for relationship panel
  const otherCats = (allCategorias || []).filter(c => c.id !== resolvedCatId && c.id !== campo.categoria_id);

  // Render field label with controls
  const renderLabel = () => (
    <div className="flex items-center gap-1.5 mb-1 relative z-20">
      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="text-sm font-semibold bg-background border border-primary rounded px-2 py-0.5 flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false); }} />
          <button type="button" onClick={handleSaveName} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">OK</button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs px-2 py-1 bg-muted border border-border rounded">✕</button>
          <button type="button" onClick={handleDeleteField} className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">Apagar</button>
        </div>
      ) : (
        <>
          <label className={cls.label + ' !mb-0'}>
            {campo.nome}
            {campo.obrigatorio && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <Badge variant="secondary" className="text-[10px]">{campo.tipo}</Badge>
          {campo.desc_condicional && <Badge variant="outline" className="text-[10px]">desc. condicional</Badge>}
          <button type="button" onClick={() => { setEditName(campo.nome); setEditing(true); }} className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-muted relative z-10 min-w-[24px] min-h-[24px] flex items-center justify-center"><Pencil size={13} /></button>
          <Button size="icon" variant="ghost" className="h-5 w-5" disabled={fieldIdx === 0} onClick={() => onReorder('up')}><ArrowUp className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" disabled={fieldIdx === catCampos.length - 1} onClick={() => onReorder('down')}><ArrowDown className="h-3 w-3" /></Button>
        </>
      )}
    </div>
  );

  // Render based on field type
  if (campo.tipo === 'texto') {
    return (
      <div>
        {renderLabel()}
        <input type="text" disabled placeholder="(preenchido pelo vendedor)" className={cls.input + ' opacity-50 italic'} />
      </div>
    );
  }

  if (campo.tipo === 'numero') {
    return (
      <div>
        {renderLabel()}
        <input type="number" disabled placeholder="0.00" className={cls.input + ' opacity-50 italic w-32'} />
      </div>
    );
  }

  if (campo.tipo === 'textarea') {
    return (
      <div>
        {renderLabel()}
        <textarea disabled rows={3} className={cls.input + ' min-h-[80px] opacity-50 italic'} placeholder="(preenchido pelo vendedor)" />
      </div>
    );
  }

  if (campo.tipo === 'checkbox') {
    return (
      <div>
        {renderLabel()}
        <div className="flex flex-wrap items-center gap-3">
          <select disabled className={cls.inputSmall + ' w-28 opacity-60'}>
            <option>Não tem</option>
            <option>Tem</option>
          </select>
          {campo.desc_condicional && (
            <input type="text" disabled placeholder="(campo de texto se Tem)" className={cls.input + ' flex-1 min-w-[150px] opacity-40 italic'} />
          )}
        </div>
      </div>
    );
  }

  // selecao or multipla - admin controls shared
  const filtered = search ? activeVars.filter(v => v.nome.toLowerCase().includes(search.toLowerCase())) : activeVars;

  const adminControls = (
    <>
      <div className="flex items-center gap-1.5 mb-1 relative z-20">
        <button type="button" onClick={() => setShowAddVar(true)} className="text-primary hover:text-primary/80 p-1.5 rounded hover:bg-muted relative z-10 min-w-[24px] min-h-[24px] flex items-center justify-center" title="Adicionar variação"><Plus size={14} /></button>
        {activeVars.length > 0 && (
          <button type="button" onClick={openEditPanel} className="text-primary hover:text-primary/80 p-1.5 rounded hover:bg-muted relative z-10 min-w-[24px] min-h-[24px] flex items-center justify-center" title="Editar variações"><Pencil size={12} /></button>
        )}
        <span className="text-xs text-muted-foreground">({activeVars.length} opções)</span>
      </div>

      {showAddVar && (
        <div className="flex flex-wrap items-end gap-2 mb-2 p-3 border border-primary/30 rounded-lg bg-muted/50">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium">Nome</label>
            <input type="text" value={addVarName} onChange={e => setAddVarName(e.target.value)} placeholder="Nome da variação..." className={cls.inputSmall + ' w-full'} />
          </div>
          <div className="w-24">
            <label className="text-xs font-medium">Valor (R$)</label>
            <input type="number" value={addVarPreco} onChange={e => setAddVarPreco(e.target.value)} placeholder="0" className={cls.inputSmall + ' w-full'} />
          </div>
          <button type="button" onClick={handleAddVariacao} className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Salvar</button>
          <button type="button" onClick={() => { setShowAddVar(false); setAddVarName(''); setAddVarPreco('0'); }} className="px-3 py-2 bg-muted border border-border rounded-md text-sm">Cancelar</button>
        </div>
      )}
    </>
  );

  // Shared edit panel dialog (used by both selecao and multipla)
  const editDialog = (
    <Dialog open={showVarPanel} onOpenChange={setShowVarPanel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-montserrat lowercase">editar variações — {campo.nome}</DialogTitle>
          <DialogDescription className="sr-only">Editar nomes e preços das variações do campo {campo.nome}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
          <button type="button" onClick={handleSaveAllVars} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">Salvar</button>
          <button type="button" onClick={() => setShowVarPanel(false)} className="px-4 py-2 bg-muted border border-border rounded text-sm hover:bg-muted/80">Cancelar</button>
          <button type="button" onClick={() => setShowBulkEdit(!showBulkEdit)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm font-medium hover:bg-secondary/80">Ed. massa</button>
        </div>
        {showBulkEdit && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-sm text-muted-foreground">Adicionar valor a todos:</span>
            <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="text-sm border border-border rounded px-3 py-2 bg-background w-24" placeholder="+5" />
            <button type="button" onClick={handleBulkApply} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">Aplicar</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {Object.entries(editState).sort(([, a], [, b]) => a.nome.localeCompare(b.nome, 'pt-BR')).map(([key, item]) => {
            const dbVar = item.dbId ? variacoes.find(x => x.id === item.dbId) : null;
            const itemRel = dbVar ? ((dbVar as any).relacionamento as Record<string, string[]> | null) : null;
            const hasRel = itemRel && Object.keys(itemRel).length > 0;
            const filteredRelCats = relCatFilter ? otherCats.filter(oc => oc.id === relCatFilter) : otherCats;

            return (
              <React.Fragment key={key}>
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${item.isFallback ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/5 border-primary/20'}`}>
                  {item.isFallback && <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/50 text-amber-700">não salvo</Badge>}
                  <input type="text" value={item.nome} onChange={e => setEditState(prev => ({ ...prev, [key]: { ...prev[key], nome: e.target.value } }))} className="text-sm border border-border rounded px-3 py-2 bg-background flex-1 min-w-[180px]" />
                  <span className="text-sm text-muted-foreground shrink-0">R$</span>
                  <input type="number" value={item.preco} onChange={e => setEditState(prev => ({ ...prev, [key]: { ...prev[key], preco: e.target.value } }))} className="text-sm border border-border rounded px-3 py-2 bg-background w-24 shrink-0" />
                  <button type="button" onClick={() => handleReorderVar(key, 'up')} className="text-muted-foreground hover:text-primary shrink-0"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => handleReorderVar(key, 'down')} className="text-muted-foreground hover:text-primary shrink-0"><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => { setRelOpen(relOpen === key ? null : key); setRelCatFilter(''); }} className={`shrink-0 ${hasRel ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} title="Relacionamento"><Link2 size={14} /></button>
                  <button type="button" onClick={async () => {
                    if (confirm(`Remover "${item.nome}"?`)) {
                      if (item.dbId) { await deleteVariacao.mutateAsync(item.dbId); }
                      setEditState(prev => { const n = { ...prev }; delete n[key]; return n; });
                      toast.success('Removida');
                      onRefetch();
                    }
                  }} className="text-destructive hover:text-destructive/80 shrink-0"><Trash2 size={14} /></button>
                </div>
                {relOpen === key && (
                  <div className="p-3 border border-primary/20 rounded-lg bg-background ml-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium flex-1">Relacionamentos: {item.nome}</p>
                      {item.isFallback && <span className="text-[10px] text-amber-600">(será salvo ao vincular)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Search size={14} className="text-muted-foreground shrink-0" />
                      <select value={relCatFilter} onChange={e => setRelCatFilter(e.target.value)} className="text-sm border border-border rounded px-2 py-1.5 bg-background flex-1">
                        <option value="">Todas as categorias</option>
                        {otherCats.filter(oc => (allVariacoes || []).some(av => av.categoria_id === oc.id && av.ativo)).map(oc => (
                          <option key={oc.id} value={oc.id}>{oc.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredRelCats.map(oc => {
                        const catVars = (allVariacoes || []).filter(av => av.categoria_id === oc.id && av.ativo);
                        if (catVars.length === 0) return null;
                        const rel = itemRel || {};
                        const selected = rel[oc.slug] || [];
                        return (
                          <div key={oc.id} className="space-y-1">
                            <Label className="text-xs font-semibold text-primary">{oc.nome}</Label>
                            <div className="flex flex-wrap gap-1">
                              {catVars.map(cv => {
                                const isSelected = selected.includes(cv.nome);
                                return (
                                  <Badge key={cv.id} variant={isSelected ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => {
                                    const newSel = isSelected ? selected.filter((s: string) => s !== cv.nome) : [...selected, cv.nome];
                                    handleRelChange(key, oc.slug, newSel);
                                  }}>
                                    {cv.nome}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {filteredRelCats.every(oc => (allVariacoes || []).filter(av => av.categoria_id === oc.id && av.ativo).length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma variação encontrada</p>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );

  // SELECAO: render as SearchableSelect (dropdown with search) like OrderPage
  if (campo.tipo === 'selecao') {
    const options = [...activeVars].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(v => v.preco_adicional > 0 ? `${v.nome} (R$${v.preco_adicional})` : v.nome);
    return (
      <div>
        {renderLabel()}
        {adminControls}
        <div className="pointer-events-none opacity-60">
          <SearchableSelect options={options} value="" onValueChange={() => {}} placeholder="Selecione..." />
        </div>
        {editDialog}
      </div>
    );
  }

  // MULTIPLA: render as open checkbox grid like OrderPage
  const hasSearchBar = campo.nome.toLowerCase().includes('bordado') || campo.nome.toLowerCase().includes('laser') || activeVars.length > 10;
  const normal = filtered.filter(v => !v.nome.toLowerCase().startsWith('bordado variado'));
  const variado = filtered.filter(v => v.nome.toLowerCase().startsWith('bordado variado'));
  const display = [...normal, ...variado];
  const firstVariadoIdx = display.findIndex(v => v.nome.toLowerCase().startsWith('bordado variado'));

  return (
    <div>
      {renderLabel()}
      {adminControls}

      {hasSearchBar && (
        <div className="relative mb-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." className={cls.input + ' pl-8 !py-1.5 text-xs'} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto border border-border rounded-lg p-3 bg-muted/50">
        {display.map((v, idx) => (
          <React.Fragment key={v.id}>
            {idx === firstVariadoIdx && firstVariadoIdx > 0 && (
              <div className="col-span-full text-xs font-bold text-muted-foreground uppercase tracking-wider border-t border-border pt-2 mt-1 mb-1">Bordados Variados</div>
            )}
            <label className={cls.checkItem}>
              <input type="checkbox" checked={false} readOnly className="accent-primary w-4 h-4 opacity-50" />
              <span>{v.nome} {v.preco_adicional > 0 && <span className="text-muted-foreground text-xs">(R${v.preco_adicional})</span>}</span>
            </label>
          </React.Fragment>
        ))}
        {display.length === 0 && <p className="col-span-full text-xs text-muted-foreground text-center py-2">Nenhuma variação</p>}
      </div>

      {editDialog}
    </div>
  );
}

/* ─── CampoSection (for dynamic fichas) ─── */
function CampoSection({
  campo, campos, index, total, fichaTipoId, onRefetch,
}: {
  campo: FichaCampo; campos: FichaCampo[]; index: number; total: number; fichaTipoId: string; onRefetch: () => void;
}) {
  const updateCampo = useUpdateFichaCampo();
  const deleteCampo = useDeleteFichaCampo();
  const [editing, setEditing] = useState(false);

  const handleReorder = (dir: 'up' | 'down') => {
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= total) return;
    const other = campos[swapIdx];
    updateCampo.mutate({ id: campo.id, ordem: other.ordem ?? swapIdx });
    updateCampo.mutate({ id: other.id, ordem: campo.ordem ?? index }, { onSuccess: () => onRefetch() });
  };

  const otherCampos = campos.filter(c => c.id !== campo.id);

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === 0} onClick={() => handleReorder('up')}><ArrowUp className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === total - 1} onClick={() => handleReorder('down')}><ArrowDown className="h-3 w-3" /></Button>
          </div>
          <span className="text-sm font-medium">{campo.nome}</span>
          <Badge variant="secondary" className="text-xs">{campo.tipo}</Badge>
          {campo.obrigatorio && <Badge variant="outline" className="text-xs">obrigatório</Badge>}
          {campo.vinculo && <Badge variant="outline" className="text-xs">{campo.vinculo}</Badge>}
          {(campo as any).relacionamento && <Link2 className="h-3 w-3 text-primary" />}
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={campo.ativo ?? true} onCheckedChange={checked => updateCampo.mutate({ id: campo.id, ativo: checked }, { onSuccess: onRefetch })} className="scale-75" />
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(!editing)}>{editing ? 'fechar' : 'editar'}</Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => {
            if (confirm(`Remover campo "${campo.nome}"?`)) {
              deleteCampo.mutate(campo.id, { onSuccess: () => { toast.success('Campo removido'); onRefetch(); } });
            }
          }}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
      {editing && (
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input defaultValue={campo.nome} className="h-8 text-sm" onBlur={e => { if (e.target.value !== campo.nome) updateCampo.mutate({ id: campo.id, nome: e.target.value, slug: slugify(e.target.value) }, { onSuccess: onRefetch }); }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select defaultValue={campo.tipo} onValueChange={v => updateCampo.mutate({ id: campo.id, tipo: v }, { onSuccess: onRefetch })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_CAMPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vínculo</Label>
            <Select defaultValue={campo.vinculo || ''} onValueChange={v => updateCampo.mutate({ id: campo.id, vinculo: v || null }, { onSuccess: onRefetch })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>{VINCULOS.map(v => <SelectItem key={v.value || 'none'} value={v.value || 'none'}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Depende de (relacionamento)</Label>
            <Select defaultValue={(campo as any).relacionamento?.depende_de || ''} onValueChange={v => { const newRel = v ? { depende_de: v } : null; updateCampo.mutate({ id: campo.id, relacionamento: newRel }, { onSuccess: onRefetch }); }}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {otherCampos.map(c => <SelectItem key={c.id} value={c.slug}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 col-span-full">
            <div className="flex items-center gap-2">
              <Switch checked={campo.obrigatorio} onCheckedChange={v => updateCampo.mutate({ id: campo.id, obrigatorio: v }, { onSuccess: onRefetch })} />
              <Label className="text-xs">obrigatório</Label>
            </div>
            {campo.tipo === 'checkbox' && (
              <div className="flex items-center gap-2">
                <Switch checked={campo.desc_condicional} onCheckedChange={v => updateCampo.mutate({ id: campo.id, desc_condicional: v }, { onSuccess: onRefetch })} />
                <Label className="text-xs">descrição condicional</Label>
              </div>
            )}
          </div>
          {['selecao', 'multipla'].includes(campo.tipo) && (
            <div className="space-y-1 col-span-full">
              <Label className="text-xs">Opções (Nome | Preço, uma por linha)</Label>
              <Textarea rows={4} defaultValue={Array.isArray(campo.opcoes) ? (campo.opcoes as any[]).map((o: any) => `${o.label}${o.preco_adicional ? ` | ${o.preco_adicional}` : ''}`).join('\n') : ''} className="text-xs" onBlur={e => {
                const parsed = e.target.value.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
                  const parts = line.split('|').map(p => p.trim());
                  const preco = parts[1] ? parseFloat(parts[1].replace(',', '.')) : 0;
                  return { label: parts[0], preco_adicional: isNaN(preco) ? 0 : preco };
                });
                updateCampo.mutate({ id: campo.id, opcoes: parsed }, { onSuccess: onRefetch });
              }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CategoriaSection (generic, for non-boot fichas) ─── */
function CategoriaSection({
  cat, categorias, allVariacoes, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  cat: FichaCategoria; categorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  onUpdate: () => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: variacoes, refetch } = useFichaVariacoes(cat.id);
  const updateVariacao = useUpdateVariacao();
  const insertVariacao = useInsertVariacao();
  const deleteVariacao = useDeleteVariacao();
  const [addOpen, setAddOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newPreco, setNewPreco] = useState('0');
  const [editingName, setEditingName] = useState(cat.nome);
  const [nameEditing, setNameEditing] = useState(false);
  const updateCat = useUpdateCategoria();
  const deleteCat = useDeleteCategoria();
  const [search, setSearch] = useState('');
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkValue, setBulkValue] = useState('');
  const [editState, setEditState] = useState<Record<string, { nome: string; preco: string }>>({});

  const sortAlpha = (arr: FichaVariacao[]) => [...arr].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const handleAddVariacao = () => {
    if (!newNome.trim()) return;
    insertVariacao.mutate(
      { categoria_id: cat.id, nome: newNome.trim(), preco_adicional: parseFloat(newPreco) || 0, ordem: 0 },
      { onSuccess: () => { toast.success('Variação adicionada'); setNewNome(''); setNewPreco('0'); setAddOpen(false); refetch(); }, onError: () => toast.error('Erro ao adicionar') },
    );
  };

  const handleSaveCatName = () => {
    if (editingName.trim() && editingName !== cat.nome) {
      updateCat.mutate({ id: cat.id, nome: editingName.trim() }, { onSuccess: () => { toast.success('Categoria renomeada'); onUpdate(); } });
    }
    setNameEditing(false);
  };

  const openEditPanel = () => {
    const state: Record<string, { nome: string; preco: string }> = {};
    (variacoes || []).forEach(v => { state[v.id] = { nome: v.nome, preco: String(v.preco_adicional) }; });
    setEditState(state);
    setShowEditPanel(true);
    setShowBulkEdit(false);
    setBulkValue('');
  };

  const handleSaveAll = async () => {
    for (const v of (variacoes || [])) {
      const s = editState[v.id];
      if (s && (s.nome !== v.nome || parseFloat(s.preco) !== v.preco_adicional)) {
        await updateVariacao.mutateAsync({ id: v.id, nome: s.nome, preco_adicional: parseFloat(s.preco) || 0 });
      }
    }
    toast.success('Alterações salvas');
    setShowEditPanel(false);
    refetch();
  };

  const handleBulkApply = () => {
    const inc = parseFloat(bulkValue);
    if (isNaN(inc) || inc === 0) return;
    setEditState(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const cur = parseFloat(next[key].preco) || 0;
        next[key] = { ...next[key], preco: String(Math.max(0, cur + inc)) };
      }
      return next;
    });
    setBulkValue('');
    setShowBulkEdit(false);
  };

  const sorted = sortAlpha(variacoes || []);
  const filteredVars = search ? sorted.filter(v => v.nome.toLowerCase().includes(search.toLowerCase())) : sorted;
  const showSearch = sorted.length > 10;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/60">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {nameEditing ? (
                <Input value={editingName} onChange={e => setEditingName(e.target.value)} onBlur={handleSaveCatName} onKeyDown={e => e.key === 'Enter' && handleSaveCatName()} className="h-7 text-sm w-48" autoFocus onClick={e => e.stopPropagation()} />
              ) : (
                <span className="font-medium text-sm text-foreground" onDoubleClick={e => { e.stopPropagation(); setNameEditing(true); }}>{cat.nome}</span>
              )}
              <Badge variant="secondary" className="text-xs">{variacoes?.length ?? '…'}</Badge>
            </div>
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isFirst} onClick={onMoveUp}><ArrowUp className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isLast} onClick={onMoveDown}><ArrowDown className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
                if (confirm(`Remover categoria "${cat.nome}" e todas suas variações?`)) {
                  deleteCat.mutate(cat.id, { onSuccess: () => { toast.success('Categoria removida'); onDelete(); }, onError: () => toast.error('Erro ao remover') });
                }
              }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex items-center gap-2 mb-2">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Plus className="h-3 w-3" /> adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-montserrat lowercase">nova variação</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div><Label className="text-xs">Nome</Label><Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome da variação" /></div>
                    <div><Label className="text-xs">Preço adicional</Label><Input type="number" step="0.01" value={newPreco} onChange={e => setNewPreco(e.target.value)} /></div>
                    <Button onClick={handleAddVariacao} disabled={insertVariacao.isPending} className="w-full">Adicionar</Button>
                  </div>
                </DialogContent>
              </Dialog>
              {(variacoes?.length ?? 0) > 0 && (
                <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={openEditPanel}>
                  <Pencil className="h-3 w-3" /> editar
                </Button>
              )}
            </div>

            {showSearch && (
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." className={cls.input + ' pl-8 !py-1.5 text-xs'} />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto border border-border rounded-lg p-3 bg-muted/50">
              {showEditPanel && (
                <div className="col-span-full flex flex-wrap items-center gap-2 mb-1 pb-1 border-b border-border">
                  <button type="button" onClick={handleSaveAll} className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90">Salvar</button>
                  <button type="button" onClick={() => setShowEditPanel(false)} className="px-2 py-1 bg-muted border border-border rounded text-xs hover:bg-muted/80">Cancelar</button>
                  <button type="button" onClick={() => setShowBulkEdit(!showBulkEdit)} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium hover:bg-secondary/80">Ed. massa</button>
                  {showBulkEdit && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Adicionar:</span>
                      <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background w-16" placeholder="+5" />
                      <button type="button" onClick={handleBulkApply} className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90">OK</button>
                    </div>
                  )}
                </div>
              )}
              {filteredVars.map(v => (
                showEditPanel ? (
                  <div key={v.id} className="flex items-center gap-1 p-1 bg-primary/5 rounded border border-primary/20">
                    <input type="text" value={editState[v.id]?.nome ?? v.nome} onChange={e => setEditState(prev => ({ ...prev, [v.id]: { ...prev[v.id], nome: e.target.value, preco: prev[v.id]?.preco ?? String(v.preco_adicional) } }))} className="text-xs border border-border rounded px-1 py-0.5 bg-background flex-1 min-w-0" />
                    <span className="text-xs text-muted-foreground shrink-0">R$</span>
                    <input type="number" value={editState[v.id]?.preco ?? String(v.preco_adicional)} onChange={e => setEditState(prev => ({ ...prev, [v.id]: { ...prev[v.id], nome: prev[v.id]?.nome ?? v.nome, preco: e.target.value } }))} className="text-xs border border-border rounded px-1 py-0.5 bg-background w-14 shrink-0" />
                    <button type="button" onClick={async () => { if (confirm(`Remover "${v.nome}"?`)) { await deleteVariacao.mutateAsync(v.id); toast.success('Removida'); refetch(); } }} className="text-destructive hover:text-destructive/80 shrink-0"><Trash2 size={12} /></button>
                  </div>
                ) : (
                  <label key={v.id} className={cls.checkItem}>
                    <span className={v.ativo === false ? 'line-through opacity-50' : ''}>
                      {v.nome} {v.preco_adicional > 0 && <span className="text-muted-foreground text-xs">(R${v.preco_adicional})</span>}
                    </span>
                  </label>
                )
              ))}
              {filteredVars.length === 0 && <p className="col-span-full text-xs text-muted-foreground text-center py-2">Nenhuma variação</p>}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ─── Main Page ─── */
export default function AdminConfigFichaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tipo } = useFichaTipoBySlug(slug || '');
  const { data: categorias, refetch: refetchCats } = useFichaCategorias(tipo?.id);
  const { data: etapas } = useStatusEtapas();
  const { data: workflow } = useFichaWorkflow(tipo?.id);
  const { data: campos, refetch: refetchCampos } = useFichaCampos(tipo?.id);
  const { data: allVariacoes } = useAllVariacoesByFichaTipo(tipo?.id);
  const toggleWorkflow = useToggleWorkflow();
  const insertCategoria = useInsertCategoria();
  const updateCat = useUpdateCategoria();
  const insertCampo = useInsertFichaCampo();
  const insertVariacaoMut = useInsertVariacao();

  const [novaCategoria, setNovaCategoria] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoCampoOpen, setNovoCampoOpen] = useState(false);
  const [novoCampo, setNovoCampo] = useState({ nome: '', tipo: 'texto', obrigatorio: false, descCondicional: false, opcoesRaw: '', relacionamento: '' });
  const [novoItemOpen, setNovoItemOpen] = useState(false);
  const [novoItem, setNovoItem] = useState({ categoriaId: '', nome: '', preco: '0', tipo: 'variacao', relacionamento: '' });
  const [savingAllToDb, setSavingAllToDb] = useState(false);
  const [_novoItemSectionLabel, _setNovoItemSectionLabel] = useState('');

  const isBoot = slug === 'bota';
  const isDynamic = tipo?.tipo_ficha === 'dinamica';

  // Boot sections: 16 hardcoded + dynamic extra categories
  const [sectionOrder, setSectionOrder] = useState<number[]>([]);

  const HARDCODED_BOOT_SLUGS = new Set([
    'tamanhos', 'generos', 'modelos', 'acessorios', 'tipos-couro', 'cores-couro',
    'desenvolvimento', 'bordados-cano', 'bordados-gaspea', 'bordados-taloneira',
    'laser-cano', 'laser-gaspea', 'laser-taloneira', 'cor-glitter',
    'cor-linha', 'cor-borrachinha', 'cor-vivo', 'cor-vira', 'formato-bico',
    'solados', 'cor-sola', 'area-metal', 'tipo-metal', 'cor-metal', 'carimbo',
  ]);
  const extraCatsCount = isBoot && categorias ? categorias.filter(c => !HARDCODED_BOOT_SLUGS.has(c.slug)).length : 0;
  const totalSections = 16 + extraCatsCount;

  useEffect(() => {
    setSectionOrder(prev => {
      const needed = Array.from({ length: totalSections }, (_, i) => i);
      // Only reset if length changed
      if (prev.length !== needed.length) return needed;
      return prev;
    });
  }, [totalSections]);

  useEffect(() => {
    if (user && user.role !== 'admin_master' && user.role !== 'admin_producao') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  if (!user || !tipo) return null;

  const workflowMap = new Map(workflow?.map(w => [w.etapa_id, w.ativo]));

  const handleToggleEtapa = (etapaId: string, current: boolean) => {
    toggleWorkflow.mutate({ ficha_tipo_id: tipo.id, etapa_id: etapaId, ativo: !current });
  };

  const handleAddCategoria = () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    const catSlug = slugify(nome);
    const ordem = (categorias?.length ?? 0) + 1;
    insertCategoria.mutate(
      { ficha_tipo_id: tipo.id, slug: catSlug, nome, ordem },
      { onSuccess: () => { toast.success('Categoria adicionada'); setNovaCategoria(''); setDialogOpen(false); refetchCats(); }, onError: () => toast.error('Erro ao adicionar categoria') },
    );
  };

  const handleReorderCat = (catId: string, direction: 'up' | 'down') => {
    if (!categorias) return;
    const idx = categorias.findIndex(c => c.id === catId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categorias.length) return;
    updateCat.mutate({ id: categorias[idx].id, ordem: categorias[swapIdx].ordem ?? swapIdx });
    updateCat.mutate({ id: categorias[swapIdx].id, ordem: categorias[idx].ordem ?? idx }, { onSuccess: () => refetchCats() });
  };

  const handleAddCampo = () => {
    const nome = novoCampo.nome.trim();
    if (!nome) { toast.error('Informe o nome do campo'); return; }
    const campoSlug = slugify(nome);
    const ordem = (campos?.length ?? 0) + 1;
    const opcoes = ['selecao', 'multipla'].includes(novoCampo.tipo)
      ? novoCampo.opcoesRaw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
          const parts = line.split('|').map(p => p.trim());
          const preco = parts[1] ? parseFloat(parts[1].replace(',', '.')) : 0;
          return { label: parts[0], preco_adicional: isNaN(preco) ? 0 : preco };
        })
      : [];
    insertCampo.mutate(
      {
        ficha_tipo_id: tipo.id, nome, slug: campoSlug, tipo: novoCampo.tipo,
        obrigatorio: novoCampo.obrigatorio, ordem, opcoes,
        vinculo: null,
        desc_condicional: novoCampo.descCondicional,
        relacionamento: novoCampo.relacionamento ? { depende_de: novoCampo.relacionamento } : null,
      },
      {
        onSuccess: () => {
          toast.success('Campo adicionado');
          setNovoCampo({ nome: '', tipo: 'texto', obrigatorio: false, descCondicional: false, opcoesRaw: '', relacionamento: '' });
          setNovoCampoOpen(false);
          refetchCampos();
        },
        onError: () => toast.error('Erro ao adicionar campo'),
      },
    );
  };

  const handleAddItem = () => {
    const nome = novoItem.nome.trim();
    if (!novoItem.categoriaId) { toast.error('Selecione uma categoria'); return; }
    if (!nome) { toast.error('Informe o nome'); return; }
    const catCampos = (campos || []).filter(c => c.categoria_id === novoItem.categoriaId);
    const ordem = catCampos.length + 1;
    const tipoMap: Record<string, string> = { 'toggle': 'checkbox', 'variacao': 'selecao', 'multipla': 'multipla', 'texto': 'texto' };
    const tipoCampo = tipoMap[novoItem.tipo] || 'texto';
    if (!tipo?.id) { toast.error('Ficha não encontrada'); return; }
    insertCampo.mutate(
      {
        ficha_tipo_id: tipo.id,
        categoria_id: novoItem.categoriaId,
        nome,
        slug: slugify(nome),
        tipo: tipoCampo,
        obrigatorio: false,
        ordem,
        opcoes: [],
        vinculo: null,
        desc_condicional: tipoCampo === 'checkbox',
      },
      {
        onSuccess: () => {
          toast.success(`Campo "${nome}" adicionado`);
          setNovoItem({ categoriaId: '', nome: '', preco: '0', tipo: 'variacao', relacionamento: '' });
          setNovoItemOpen(false);
          refetchCampos();
          queryClient.invalidateQueries({ queryKey: ['ficha_campos'] });
        },
        onError: () => toast.error('Erro ao adicionar campo'),
      },
    );
  };

  // Build a map of all boot fallback arrays by catSlug
  const BOOT_FALLBACK_MAP: Record<string, { label: string; preco: number }[]> = isBoot ? {
    'tamanhos': TAMANHOS.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'generos': GENEROS.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'modelos': MODELOS.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'acessorios': ACESSORIOS.map(a => typeof a === 'string' ? { label: a, preco: 0 } : a),
    'tipos-couro': TIPOS_COURO.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'cores-couro': CORES_COURO.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'desenvolvimento': DESENVOLVIMENTO.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'bordados-cano': BORDADOS_CANO.map(b => typeof b === 'string' ? { label: b, preco: 0 } : b),
    'bordados-gaspea': BORDADOS_GASPEA.map(b => typeof b === 'string' ? { label: b, preco: 0 } : b),
    'bordados-taloneira': BORDADOS_TALONEIRA.map(b => typeof b === 'string' ? { label: b, preco: 0 } : b),
    'laser-cano': LASER_OPTIONS.map(l => ({ label: l, preco: LASER_CANO_PRECO })),
    'laser-gaspea': LASER_OPTIONS.map(l => ({ label: l, preco: LASER_GASPEA_PRECO })),
    'laser-taloneira': LASER_OPTIONS.map(l => ({ label: l, preco: LASER_TALONEIRA_PRECO })),
    'cor-glitter': COR_GLITTER.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'cor-linha': COR_LINHA.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'cor-borrachinha': COR_BORRACHINHA.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'cor-vivo': COR_VIVO.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'area-metal': AREA_METAL.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'tipo-metal': TIPO_METAL.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'cor-metal': COR_METAL.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'solados': SOLADO.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'formato-bico': FORMATO_BICO.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'cor-sola': COR_SOLA.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'cor-vira': COR_VIRA.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
    'carimbo': CARIMBO.map(t => typeof t === 'string' ? { label: t, preco: 0 } : t),
  } : {};

  // Count total unsaved fallback items
  const countUnsavedFallbacks = () => {
    if (!isBoot || !categorias) return 0;
    let count = 0;
    for (const [slug, fb] of Object.entries(BOOT_FALLBACK_MAP)) {
      const cat = categorias.find(c => c.slug === slug);
      if (!cat) { count += fb.length; continue; }
      const catVars = (allVariacoes || []).filter(v => v.categoria_id === cat.id);
      const dbNames = new Set(catVars.map(v => v.nome.toLowerCase()));
      count += fb.filter(f => !dbNames.has(f.label.toLowerCase())).length;
    }
    return count;
  };

  const unsavedCount = countUnsavedFallbacks();

  const handleSaveAllFallbacksToDb = async () => {
    if (!isBoot || !categorias || unsavedCount === 0) return;
    setSavingAllToDb(true);
    let saved = 0;
    let errors = 0;
    try {
      for (const [slug, fb] of Object.entries(BOOT_FALLBACK_MAP)) {
        let cat = categorias.find(c => c.slug === slug);
        // Create category if it doesn't exist
        if (!cat) {
          const { data, error } = await supabase.from('ficha_categorias')
            .insert({ ficha_tipo_id: tipo.id, slug, nome: slug, ordem: 0 })
            .select('*').single();
          if (error) { errors++; continue; }
          cat = data as FichaCategoria;
        }
        const catVars = (allVariacoes || []).filter(v => v.categoria_id === cat!.id);
        const dbNames = new Set(catVars.map(v => v.nome.toLowerCase()));
        const toInsert = fb.filter(f => !dbNames.has(f.label.toLowerCase()));
        if (toInsert.length === 0) continue;
        const rows = toInsert.map((item, i) => ({
          categoria_id: cat!.id,
          nome: item.label,
          preco_adicional: item.preco || 0,
          ordem: catVars.length + i,
        }));
        const { error } = await supabase.from('ficha_variacoes').insert(rows);
        if (error) { errors += toInsert.length; } else { saved += toInsert.length; }
      }
      if (errors > 0) toast.error(`${errors} itens com erro`);
      if (saved > 0) toast.success(`${saved} variações salvas no banco!`);
      refetchCats();
      queryClient.invalidateQueries({ queryKey: ['ficha_variacoes'] });
      queryClient.invalidateQueries({ queryKey: ['ficha_variacoes_all'] });
      queryClient.invalidateQueries({ queryKey: ['ficha_variacoes_lookup'] });
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSavingAllToDb(false);
    }
  };

  const handleMoveSectionBoot = (currentIdx: number, dir: 'up' | 'down') => {
    setSectionOrder(prev => {
      const next = [...prev];
      const posInOrder = next.indexOf(currentIdx);
      const swapPos = dir === 'up' ? posInOrder - 1 : posInOrder + 1;
      if (swapPos < 0 || swapPos >= next.length) return prev;
      [next[posInOrder], next[swapPos]] = [next[swapPos], next[posInOrder]];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="mx-auto max-w-4xl"
      >
                {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/admin/configuracoes')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> configurações
          </button>
          {isBoot && (
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={novoItemOpen} onOpenChange={setNovoItemOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Plus className="h-4 w-4" /> + campo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle className="font-montserrat lowercase">adicionar item a uma categoria</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Seção</Label>
                      {(() => {
                        // Use visual categories from database instead of hardcoded slugs
                        const visualCats = (categorias || []).filter(c => c.ativo !== false).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

                        return (
                          <div className="space-y-2">
                            <Select value={novoItem.categoriaId} onValueChange={v => {
                              setNovoItem(p => ({ ...p, categoriaId: v }));
                            }}>
                              <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                              <SelectContent>
                                {visualCats.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome</Label>
                        <Input value={novoItem.nome} onChange={e => setNovoItem(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Crazy Horse" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input value={novoItem.preco} onChange={e => setNovoItem(p => ({ ...p, preco: e.target.value }))} placeholder="0" />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={novoItem.tipo} onValueChange={v => setNovoItem(p => ({ ...p, tipo: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="toggle">Tem/Não tem</SelectItem>
                            <SelectItem value="variacao">Variação (escolha única)</SelectItem>
                            <SelectItem value="multipla">Múltipla escolha</SelectItem>
                            <SelectItem value="texto">Texto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Depende de (relacionamento)</Label>
                        <Select value={novoItem.relacionamento || 'none'} onValueChange={v => setNovoItem(p => ({ ...p, relacionamento: v === 'none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {(categorias || []).map(c => <SelectItem key={c.id} value={c.slug}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleAddItem} disabled={insertVariacaoMut.isPending} className="w-full">Adicionar</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {isBoot && (
                <>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate('/pedido?mode=template')}>
                    <Plus className="h-4 w-4" /> Criar Modelo
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate('/pedido')}>
                    <Layers className="h-4 w-4" /> Modelos
                  </Button>
                </>
              )}

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Layers className="h-4 w-4" /> + categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-montserrat lowercase">nova categoria</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Label>Nome</Label>
                    <Input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Ex: Couros especiais" />
                    <Button onClick={handleAddCategoria} disabled={insertCategoria.isPending} className="w-full">Adicionar categoria</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {unsavedCount > 0 && (
                <Button size="sm" variant="outline" className="gap-1" onClick={handleSaveAllFallbacksToDb} disabled={savingAllToDb}>
                  <Save className="h-4 w-4" /> {savingAllToDb ? 'Salvando...' : `💾 Salvar no banco (${unsavedCount})`}
                </Button>
              )}

              <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['ficha_variacoes'] });
                queryClient.invalidateQueries({ queryKey: ['ficha_variacoes_all'] });
                queryClient.invalidateQueries({ queryKey: ['ficha_variacoes_lookup'] });
                queryClient.invalidateQueries({ queryKey: ['ficha_categorias'] });
                queryClient.invalidateQueries({ queryKey: ['ficha_campos'] });
                queryClient.invalidateQueries({ queryKey: ['ficha_tipos'] });
                queryClient.invalidateQueries({ queryKey: ['ficha_workflow'] });
                refetchCats();
                toast.success('Configurações sincronizadas! As alterações serão refletidas na ficha de produção.');
              }}>
                <CheckCircle className="h-4 w-4" /> sincronizar
              </Button>
            </div>
          )}
        </div>

        <h1 className="mb-8 font-montserrat text-2xl font-bold text-foreground lowercase">
          {tipo.nome.toLowerCase()}
        </h1>

        {/* ─── BOOT: Exact mirror of OrderPage form ─── */}
        {isBoot && categorias && sectionOrder.length > 0 && (
          <section className="mb-10">
            <BootFormLayout
              fichaTipoId={tipo.id}
              categorias={categorias}
              allVariacoes={allVariacoes || []}
              campos={campos || []}
              onRefetchCats={refetchCats}
              onRefetchCampos={refetchCampos}
              sectionOrder={sectionOrder}
              onMoveSection={handleMoveSectionBoot}
              bootFallbackMap={BOOT_FALLBACK_MAP}
            />
          </section>
        )}

        {/* ─── Dynamic fichas: Campos ─── */}
        {!isBoot && isDynamic && campos && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-primary" />
                <h2 className="font-montserrat text-lg font-semibold text-foreground lowercase">campos</h2>
              </div>
              <Dialog open={novoCampoOpen} onOpenChange={setNovoCampoOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> novo campo</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-montserrat lowercase">novo campo</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input value={novoCampo.nome} onChange={e => setNovoCampo(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Cor principal" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={novoCampo.tipo} onValueChange={v => setNovoCampo(p => ({ ...p, tipo: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIPOS_CAMPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Depende de (relacionamento)</Label>
                        <Select value={novoCampo.relacionamento || 'none'} onValueChange={v => setNovoCampo(p => ({ ...p, relacionamento: v === 'none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {campos.map(c => <SelectItem key={c.id} value={c.slug}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={novoCampo.obrigatorio} onCheckedChange={v => setNovoCampo(p => ({ ...p, obrigatorio: v }))} />
                        <Label className="text-xs">obrigatório</Label>
                      </div>
                      {novoCampo.tipo === 'checkbox' && (
                        <div className="flex items-center gap-2">
                          <Switch checked={novoCampo.descCondicional} onCheckedChange={v => setNovoCampo(p => ({ ...p, descCondicional: v }))} />
                          <Label className="text-xs">descrição condicional</Label>
                        </div>
                      )}
                    </div>
                    {['selecao', 'multipla'].includes(novoCampo.tipo) && (
                      <div className="space-y-1">
                        <Label className="text-xs">Opções (Nome | Preço, uma por linha)</Label>
                        <Textarea rows={4} value={novoCampo.opcoesRaw} onChange={e => setNovoCampo(p => ({ ...p, opcoesRaw: e.target.value }))} placeholder={'Opção A | 10.00\nOpção B | 0\nOpção C'} />
                      </div>
                    )}
                    <Button onClick={handleAddCampo} disabled={insertCampo.isPending} className="w-full">Adicionar campo</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {campos.map((campo, i) => (
                <CampoSection key={campo.id} campo={campo} campos={campos} index={i} total={campos.length} fichaTipoId={tipo.id} onRefetch={refetchCampos} />
              ))}
              {campos.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Nenhum campo personalizado.</p>}
            </div>
          </section>
        )}

        {/* ─── Non-boot: generic categorias ─── */}
        {!isBoot && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="font-montserrat text-lg font-semibold text-foreground lowercase">categorias e variações</h2>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> nova categoria</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-montserrat lowercase">nova categoria</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Label>Nome</Label>
                    <Input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Ex: Couros especiais" />
                    <Button onClick={handleAddCategoria} disabled={insertCategoria.isPending} className="w-full">Adicionar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {categorias?.map((cat, i) => (
                  <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <CategoriaSection cat={cat} categorias={categorias} allVariacoes={allVariacoes || []} onUpdate={refetchCats} onDelete={refetchCats} onMoveUp={() => handleReorderCat(cat.id, 'up')} onMoveDown={() => handleReorderCat(cat.id, 'down')} isFirst={i === 0} isLast={i === (categorias?.length ?? 0) - 1} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* ─── Etapas de Produção ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h2 className="font-montserrat text-lg font-semibold text-foreground lowercase">etapas de produção</h2>
          </div>
          <Card>
            <CardContent className="divide-y divide-border/40 p-0">
              {etapas?.map(etapa => {
                const ativo = workflowMap.get(etapa.id) ?? true;
                return (
                  <div key={etapa.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium">{etapa.nome}</span>
                    <Switch checked={ativo} onCheckedChange={() => handleToggleEtapa(etapa.id, ativo)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      </motion.div>
    </div>
  );
}
