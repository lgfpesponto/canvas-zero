import { useParams, useNavigate } from 'react-router-dom';
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
  Trash2, ArrowUp, ArrowDown, GripVertical, Link2, Pencil, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
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
function Section({ title, children, onMoveUp, onMoveDown, isFirst, isLast, categoriaId, onRename, onDelete }: {
  title: string; children: React.ReactNode;
  onMoveUp?: () => void; onMoveDown?: () => void; isFirst?: boolean; isLast?: boolean;
  categoriaId?: string; onRename?: (id: string, nome: string) => void; onDelete?: (id: string) => void;
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
          <div className="flex items-center gap-2 flex-1">
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="text-base font-bold bg-background border border-primary rounded px-2 py-0.5 flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }} />
            <button type="button" onClick={handleSaveTitle} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">OK</button>
            <button type="button" onClick={() => setEditingTitle(false)} className="text-xs px-2 py-1 bg-muted border border-border rounded">✕</button>
            {onDelete && categoriaId && (
              <button type="button" onClick={() => { if (confirm(`Apagar seção "${title}"?`)) onDelete(categoriaId); }} className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">Apagar</button>
            )}
          </div>
        ) : (
          <>
            <h3 className="text-base font-display font-bold flex-1">{title}</h3>
            {categoriaId && onRename && (
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

  const handleRelChange = (varId: string, catSlugTarget: string, selectedValues: string[]) => {
    const v = variacoes?.find(x => x.id === varId);
    if (!v) return;
    const rel = ((v as any).relacionamento as Record<string, string[]> | null) || {};
    const newRel = { ...rel, [catSlugTarget]: selectedValues };
    Object.keys(newRel).forEach(k => { if (newRel[k].length === 0) delete newRel[k]; });
    const finalRel = Object.keys(newRel).length > 0 ? newRel : null;
    updateVariacao.mutate({ id: varId, relacionamento: finalRel }, {
      onSuccess: () => { toast.success('Relacionamento salvo'); refetch(); },
    });
  };

  const otherCats = allCategorias.filter(c => c.id !== cat.id);
  const editItems = Object.entries(editState).sort(([, a], [, b]) => a.nome.localeCompare(b.nome, 'pt-BR'));

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

      {showEditPanel && (
        <div className="border border-primary/30 rounded-lg p-4 bg-muted/50 mb-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2 mb-1 pb-2 border-b border-border">
            <button type="button" onClick={handleSaveAll} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">Salvar</button>
            <button type="button" onClick={() => setShowEditPanel(false)} className="px-3 py-1.5 bg-muted border border-border rounded text-sm hover:bg-muted/80">Cancelar</button>
            <button type="button" onClick={() => setShowBulkEdit(!showBulkEdit)} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-sm font-medium hover:bg-secondary/80">Ed. massa</button>
            {selectedIds.size > 0 && (
              <button type="button" onClick={handleDeleteSelected} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-sm font-medium hover:opacity-90">Apagar selecionadas ({selectedIds.size})</button>
            )}
            {showBulkEdit && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Adicionar:</span>
                <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="text-sm border border-border rounded px-2 py-1.5 bg-background w-20" placeholder="+5" />
                <button type="button" onClick={handleBulkApply} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">OK</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto">
            {editItems.map(([key, item]) => (
              <React.Fragment key={key}>
                <div className={`flex items-center gap-2 p-2 rounded border ${item.isFallback ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/5 border-primary/20'}`}>
                  <input type="checkbox" checked={selectedIds.has(key)} onChange={() => toggleSelected(key)} className="accent-destructive w-4 h-4 shrink-0" />
                  <input type="text" value={item.nome} onChange={e => setEditState(prev => ({ ...prev, [key]: { ...prev[key], nome: e.target.value } }))} className="text-sm border border-border rounded px-2 py-1.5 bg-background flex-1 min-w-0" />
                  <span className="text-sm text-muted-foreground shrink-0">R$</span>
                  <input type="number" value={item.preco} onChange={e => setEditState(prev => ({ ...prev, [key]: { ...prev[key], preco: e.target.value } }))} className="text-sm border border-border rounded px-2 py-1.5 bg-background w-20 shrink-0" />
                  {item.isFallback && <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 border-amber-500 text-amber-600">fallback</Badge>}
                  {item.dbId && (
                    <button type="button" onClick={() => setRelOpen(relOpen === key ? null : key)} className={`shrink-0 ${item.dbId && mergedItems.find(m => m.dbId === item.dbId)?.relacionamento ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} title="Relacionamento"><Link2 size={12} /></button>
                  )}
                  <button type="button" onClick={() => handleDelete(key, item.nome)} className="text-destructive hover:text-destructive/80 shrink-0" title="Excluir"><Trash2 size={12} /></button>
                </div>
                {relOpen === key && item.dbId && (
                  <div className="col-span-full p-2 border border-primary/20 rounded bg-background mb-1">
                    <p className="text-xs font-medium mb-2">Relacionamentos: {item.nome}</p>
                    <div className="space-y-2">
                      {otherCats.map(oc => {
                        const catVars = allVariacoes.filter(av => av.categoria_id === oc.id && av.ativo);
                        if (catVars.length === 0) return null;
                        const v = variacoes?.find(x => x.id === item.dbId);
                        const rel = ((v as any)?.relacionamento as Record<string, string[]> | null) || {};
                        const selected = rel[oc.slug] || [];
                        return (
                          <div key={oc.id} className="space-y-0.5">
                            <Label className="text-xs font-medium">{oc.nome}</Label>
                            <div className="flex flex-wrap gap-1">
                              {catVars.map(cv => {
                                const isSelected = selected.includes(cv.nome);
                                return (
                                  <Badge key={cv.id} variant={isSelected ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => {
                                    const newSel = isSelected ? selected.filter(s => s !== cv.nome) : [...selected, cv.nome];
                                    handleRelChange(item.dbId!, oc.slug, newSel);
                                  }}>
                                    {cv.nome}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AdminSelectField: Same as OrderPage SelectField but with admin tools ─── */
function AdminSelectField({
  label, catSlug, fallback, fichaTipoId, allCategorias, allVariacoes, onRefetchCats, required,
}: {
  label: string; catSlug: string;
  fallback: string[] | { label: string; preco?: number }[];
  fichaTipoId: string; allCategorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  onRefetchCats: () => void; required?: boolean;
}) {
  const cat = allCategorias.find(c => c.slug === catSlug);
  const { data: variacoes } = useFichaVariacoes(cat?.id);
  const common = { catSlug, catLabel: label, fichaTipoId, allCategorias, allVariacoes, onRefetchCats };

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

  return (
    <div>
      <label className={cls.label}>{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
      <SearchableSelect options={options} value="" onValueChange={() => {}} placeholder="Selecione..." />
      <AdminEditableOptions {...common} fallback={fbNorm} />
    </div>
  );
}

/* ─── AdminMultiSelect: Same grid as OrderPage MultiSelect but admin mode ─── */
function AdminMultiSelect({
  catSlug, catLabel, fallback, fichaTipoId, allCategorias, allVariacoes, onRefetchCats,
}: {
  catSlug: string; catLabel: string;
  fallback: { label: string; preco: number }[];
  fichaTipoId: string; allCategorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  onRefetchCats: () => void;
}) {
  const cat = allCategorias.find(c => c.slug === catSlug);
  const { data: variacoes } = useFichaVariacoes(cat?.id);
  const common = { catSlug, catLabel, fichaTipoId, allCategorias, allVariacoes, onRefetchCats };

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

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className={cls.label + ' mb-0'}>{catLabel}</label>
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

/* ─── AdminToggleField: Same as OrderPage ToggleField ─── */
const AdminToggleField = ({ label, preco }: { label: string; preco: number }) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className="text-sm font-semibold min-w-[120px]">{label} (+R${preco}):</span>
    <select disabled className={cls.inputSmall + ' w-28 opacity-60'}>
      <option>Não tem</option>
      <option>Tem</option>
    </select>
    <span className="text-xs text-muted-foreground italic">(valor fixo)</span>
  </div>
);

/* ─── AdminTextFieldRef: Same as OrderPage text input ─── */
const AdminTextRef = ({ label }: { label: string }) => (
  <div>
    <label className={cls.label}>{label}</label>
    <input type="text" disabled placeholder="(preenchido pelo vendedor)" className={cls.input + ' opacity-50 italic'} />
  </div>
);

/* ─── Boot Form Layout (exact mirror of OrderPage form sections) ─── */
function BootFormLayout({
  fichaTipoId, categorias, allVariacoes, onRefetchCats,
  sectionOrder, onMoveSection,
}: {
  fichaTipoId: string; categorias: FichaCategoria[]; allVariacoes: FichaVariacao[];
  onRefetchCats: () => void; sectionOrder: number[]; onMoveSection: (idx: number, dir: 'up' | 'down') => void;
}) {
  const common = { fichaTipoId, allCategorias: categorias, allVariacoes, onRefetchCats };
  const updateCategoria = useUpdateCategoria();
  const deleteCategoria = useDeleteCategoria();
  void sectionOrder;
  void onMoveSection;

  const handleRenameCategory = (id: string, nome: string) => {
    updateCategoria.mutate({ id, nome }, {
      onSuccess: () => { toast.success('Categoria renomeada'); onRefetchCats(); },
      onError: () => toast.error('Erro ao renomear'),
    });
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategoria.mutate(id, {
      onSuccess: () => { toast.success('Categoria apagada'); onRefetchCats(); },
      onError: () => toast.error('Erro ao apagar'),
    });
  };

  // Find category IDs for sections (by slug pattern)
  const findCatId = (slug: string) => categorias.find(c => c.slug === slug)?.id;

  return (
    <div className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <AdminSelectField label="Tamanho" catSlug="tamanhos" fallback={TAMANHOS} {...common} required />
        <AdminSelectField label="Gênero" catSlug="generos" fallback={GENEROS} {...common} required />
        <AdminSelectField label="Modelo" catSlug="modelos" fallback={MODELOS} {...common} required />
      </div>

      <AdminToggleField label="Sob Medida" preco={SOB_MEDIDA_PRECO} />

      <AdminMultiSelect catSlug="acessorios" catLabel="Acessórios" fallback={ACESSORIOS} {...common} />

      <Section title="Couros" categoriaId={findCatId('tipos-couro')} onRename={handleRenameCategory} onDelete={handleDeleteCategory}>
        <div className="grid sm:grid-cols-2 gap-4">
          <AdminSelectField label="Tipo Couro do Cano" catSlug="tipos-couro" fallback={TIPOS_COURO} {...common} required />
          <AdminSelectField label="Cor Couro do Cano" catSlug="cores-couro" fallback={CORES_COURO} {...common} required />
          <AdminSelectField label="Tipo Couro da Gáspea" catSlug="tipos-couro" fallback={TIPOS_COURO} {...common} required />
          <AdminSelectField label="Cor Couro da Gáspea" catSlug="cores-couro" fallback={CORES_COURO} {...common} required />
          <AdminSelectField label="Tipo Couro da Taloneira" catSlug="tipos-couro" fallback={TIPOS_COURO} {...common} required />
          <AdminSelectField label="Cor Couro da Taloneira" catSlug="cores-couro" fallback={CORES_COURO} {...common} required />
        </div>
      </Section>

      <AdminSelectField label="Desenvolvimento" catSlug="desenvolvimento" fallback={DESENVOLVIMENTO} {...common} />

      <Section title="Bordados" categoriaId={findCatId('bordados-cano')} onRename={handleRenameCategory} onDelete={handleDeleteCategory}>
        <div className="space-y-4">
          <AdminMultiSelect catSlug="bordados-cano" catLabel="Bordado do Cano" fallback={BORDADOS_CANO} {...common} />
          <AdminTextRef label="Cor do Bordado do Cano" />

          <AdminMultiSelect catSlug="bordados-gaspea" catLabel="Bordado da Gáspea" fallback={BORDADOS_GASPEA} {...common} />
          <AdminTextRef label="Cor do Bordado da Gáspea" />

          <AdminMultiSelect catSlug="bordados-taloneira" catLabel="Bordado da Taloneira" fallback={BORDADOS_TALONEIRA} {...common} />
          <AdminTextRef label="Cor do Bordado da Taloneira" />
        </div>
      </Section>

      <AdminToggleField label="Nome Bordado" preco={NOME_BORDADO_PRECO} />

      <Section title="Laser" categoriaId={findCatId('laser-cano')} onRename={handleRenameCategory} onDelete={handleDeleteCategory}>
        <div className="space-y-4">
          <AdminMultiSelect catSlug="laser-cano" catLabel="Laser do Cano" fallback={LASER_OPTIONS.map(l => ({ label: l, preco: 0 }))} {...common} />
          <AdminSelectField label={`Cor Glitter/Tecido do Cano (+R$${GLITTER_CANO_PRECO})`} catSlug="cor-glitter" fallback={COR_GLITTER} {...common} />
          <AdminTextRef label="Cor do Bordado (Cano)" />

          <AdminMultiSelect catSlug="laser-gaspea" catLabel="Laser da Gáspea" fallback={LASER_OPTIONS.map(l => ({ label: l, preco: 0 }))} {...common} />
          <AdminSelectField label={`Cor Glitter/Tecido da Gáspea (+R$${GLITTER_GASPEA_PRECO})`} catSlug="cor-glitter" fallback={COR_GLITTER} {...common} />
          <AdminTextRef label="Cor do Bordado (Gáspea)" />

          <AdminMultiSelect catSlug="laser-taloneira" catLabel="Laser da Taloneira" fallback={LASER_OPTIONS.map(l => ({ label: l, preco: 0 }))} {...common} />
          <AdminSelectField label="Cor Glitter/Tecido da Taloneira (sem custo)" catSlug="cor-glitter" fallback={COR_GLITTER} {...common} />
          <AdminTextRef label="Cor do Bordado (Taloneira)" />

          <AdminToggleField label="Pintura" preco={PINTURA_PRECO} />
        </div>
      </Section>

      <hr className="border-border" />

      <AdminToggleField label="Estampa" preco={ESTAMPA_PRECO} />

      <Section title="Pesponto" categoriaId={findCatId('cor-linha')} onRename={handleRenameCategory} onDelete={handleDeleteCategory}>
        <div className="grid sm:grid-cols-3 gap-4">
          <AdminSelectField label="Cor da Linha" catSlug="cor-linha" fallback={COR_LINHA} {...common} required />
          <AdminSelectField label="Cor da Borrachinha" catSlug="cor-borrachinha" fallback={COR_BORRACHINHA} {...common} required />
          <AdminSelectField label="Cor do Vivo" catSlug="cor-vivo" fallback={COR_VIVO} {...common} required />
        </div>
      </Section>

      <Section title="Metais" categoriaId={findCatId('area-metal')} onRename={handleRenameCategory} onDelete={handleDeleteCategory}>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <AdminSelectField label="Área do Metal" catSlug="area-metal" fallback={AREA_METAL} {...common} />
            <div>
              <label className={cls.label}>Tipo do Metal</label>
              <div className="flex flex-col gap-1">
                {TIPO_METAL.map(t => (
                  <label key={t} className={cls.checkItem}>
                    <input type="checkbox" checked={false} readOnly className="accent-primary w-4 h-4 opacity-50" />
                    {t}
                  </label>
                ))}
              </div>
              <AdminEditableOptions catSlug="tipo-metal" catLabel="Tipo do Metal" {...common} fallback={TIPO_METAL.map(t => ({ label: t, preco: 0 }))} />
            </div>
            <AdminSelectField label="Cor do Metal" catSlug="cor-metal" fallback={COR_METAL} {...common} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <AdminToggleField label="Strass" preco={STRASS_PRECO} />
            <AdminToggleField label="Cruz" preco={CRUZ_METAL_PRECO} />
            <AdminToggleField label="Bridão" preco={BRIDAO_METAL_PRECO} />
            <AdminToggleField label="Cavalo" preco={CAVALO_METAL_PRECO} />
          </div>
        </div>
      </Section>

      <Section title="Extras">
        <AdminToggleField label="Tricê" preco={TRICE_PRECO} />
        <AdminToggleField label="Tiras" preco={TIRAS_PRECO} />
        <div className="space-y-2">
          <AdminToggleField label="Franja" preco={FRANJA_PRECO} />
          <div className="grid sm:grid-cols-2 gap-3 pl-4">
            <AdminTextRef label="Tipo de couro da franja" />
            <AdminTextRef label="Cor da franja" />
          </div>
        </div>
        <div className="space-y-2">
          <AdminToggleField label="Corrente" preco={CORRENTE_PRECO} />
          <div className="pl-4">
            <AdminTextRef label="Cor da corrente" />
          </div>
        </div>
      </Section>

      <Section title="Solados" categoriaId={findCatId('solados')} onRename={handleRenameCategory} onDelete={handleDeleteCategory}>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminSelectField label="Tipo de Solado" catSlug="solados" fallback={SOLADO} {...common} required />
            <AdminSelectField label="Formato do Bico" catSlug="formato-bico" fallback={FORMATO_BICO} {...common} required />
            <AdminSelectField label="Cor da Sola" catSlug="cor-sola" fallback={COR_SOLA} {...common} required />
            <AdminSelectField label="Cor da Vira" catSlug="cor-vira" fallback={COR_VIRA} {...common} />
          </div>
          <AdminToggleField label="Costura Atrás" preco={COSTURA_ATRAS_PRECO} />
        </div>
      </Section>

      <Section title="Carimbo a Fogo" categoriaId={findCatId('carimbo')} onRename={handleRenameCategory} onDelete={handleDeleteCategory}>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSelectField label="Carimbo" catSlug="carimbo" fallback={CARIMBO} {...common} />
          <AdminTextRef label="Descrição do carimbo" />
        </div>
      </Section>

      <Section title="Adicional">
        <div className="grid sm:grid-cols-2 gap-4">
          <AdminTextRef label="Descrição do Adicional" />
          <AdminTextRef label="Valor do Adicional (R$)" />
        </div>
      </Section>

      <div>
        <label className={cls.label}>Observação</label>
        <textarea disabled rows={3} className={cls.input + ' min-h-[80px] opacity-50 italic'} placeholder="(preenchido pelo vendedor)" />
      </div>
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
  const [novoCampo, setNovoCampo] = useState({ nome: '', tipo: 'texto', obrigatorio: false, descCondicional: false, vinculo: '', opcoesRaw: '', relacionamento: '' });
  const [novoItemOpen, setNovoItemOpen] = useState(false);
  const [novoItem, setNovoItem] = useState({ categoriaId: '', nome: '', preco: '0', vinculo: '', relacionamento: '' });

  // 16 sections for boot
  const BOOT_SECTION_COUNT = 16;
  const [sectionOrder, setSectionOrder] = useState<number[]>([]);

  useEffect(() => {
    setSectionOrder(Array.from({ length: BOOT_SECTION_COUNT }, (_, i) => i));
  }, []);

  const isBoot = slug === 'bota';
  const isDynamic = tipo?.tipo_ficha === 'dinamica';

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
        vinculo: novoCampo.vinculo || null,
        desc_condicional: novoCampo.descCondicional,
        relacionamento: novoCampo.relacionamento ? { depende_de: novoCampo.relacionamento } : null,
      },
      {
        onSuccess: () => {
          toast.success('Campo adicionado');
          setNovoCampo({ nome: '', tipo: 'texto', obrigatorio: false, descCondicional: false, vinculo: '', opcoesRaw: '', relacionamento: '' });
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
    const catVars = (allVariacoes || []).filter(v => v.categoria_id === novoItem.categoriaId);
    const ordem = catVars.length + 1;
    const preco = parseFloat(novoItem.preco.replace(',', '.')) || 0;
    const relacionamento = novoItem.relacionamento ? { depende_de: novoItem.relacionamento } : undefined;
    insertVariacaoMut.mutate(
      { categoria_id: novoItem.categoriaId, nome, preco_adicional: preco, ordem } as any,
      {
        onSuccess: () => {
          toast.success(`"${nome}" adicionado`);
          setNovoItem({ categoriaId: '', nome: '', preco: '0', vinculo: '', relacionamento: '' });
          setNovoItemOpen(false);
          refetchCats();
        },
        onError: () => toast.error('Erro ao adicionar'),
      },
    );
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
                      <Label className="text-xs">Categoria</Label>
                      <Select value={novoItem.categoriaId} onValueChange={v => setNovoItem(p => ({ ...p, categoriaId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                        <SelectContent>
                          {(categorias || []).map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Label className="text-xs">Vínculo</Label>
                        <Select value={novoItem.vinculo || 'none'} onValueChange={v => setNovoItem(p => ({ ...p, vinculo: v === 'none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>{VINCULOS.map(v => <SelectItem key={v.value || 'none'} value={v.value || 'none'}>{v.label}</SelectItem>)}</SelectContent>
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

              <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.success('Alterações desta configuração são usadas como base da ficha de produção')}>
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
              onRefetchCats={refetchCats}
              sectionOrder={sectionOrder}
              onMoveSection={handleMoveSectionBoot}
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome</Label>
                        <Input value={novoCampo.nome} onChange={e => setNovoCampo(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Cor principal" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={novoCampo.tipo} onValueChange={v => setNovoCampo(p => ({ ...p, tipo: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIPOS_CAMPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Vínculo</Label>
                        <Select value={novoCampo.vinculo || 'none'} onValueChange={v => setNovoCampo(p => ({ ...p, vinculo: v === 'none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>{VINCULOS.map(v => <SelectItem key={v.value || 'none'} value={v.value || 'none'}>{v.label}</SelectItem>)}</SelectContent>
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
