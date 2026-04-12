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
import {
  ArrowLeft, Layers, CheckCircle, Plus, ChevronDown, ChevronRight,
  Trash2, ArrowUp, ArrowDown, GripVertical, Link2, Pencil,
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

/* ─── Boot section mapping ─── */
interface BootSectionDef {
  title: string;
  categories: { slug: string; label: string; fallback: { label: string; preco: number }[] | string[] }[];
}

function toItems(arr: string[]): { label: string; preco: number }[] {
  return arr.map(a => ({ label: a, preco: 0 }));
}

const BOOT_SECTIONS: BootSectionDef[] = [
  {
    title: 'Tamanho / Gênero / Modelo',
    categories: [
      { slug: 'modelos', label: 'Modelos', fallback: MODELOS },
    ],
  },
  {
    title: 'Acessórios',
    categories: [
      { slug: 'acessorios', label: 'Acessórios', fallback: ACESSORIOS },
    ],
  },
  {
    title: 'Couros',
    categories: [
      { slug: 'tipos-couro', label: 'Tipos de Couro', fallback: toItems(TIPOS_COURO) },
      { slug: 'cores-couro', label: 'Cores de Couro', fallback: toItems(CORES_COURO) },
    ],
  },
  {
    title: 'Desenvolvimento',
    categories: [
      { slug: 'desenvolvimento', label: 'Desenvolvimento', fallback: DESENVOLVIMENTO },
    ],
  },
  {
    title: 'Bordados',
    categories: [
      { slug: 'bordados-cano', label: 'Bordado do Cano', fallback: BORDADOS_CANO },
      { slug: 'bordados-gaspea', label: 'Bordado da Gáspea', fallback: BORDADOS_GASPEA },
      { slug: 'bordados-taloneira', label: 'Bordado da Taloneira', fallback: BORDADOS_TALONEIRA },
    ],
  },
  {
    title: 'Laser',
    categories: [
      { slug: 'laser-cano', label: 'Laser do Cano', fallback: toItems(LASER_OPTIONS) },
      { slug: 'laser-gaspea', label: 'Laser da Gáspea', fallback: toItems(LASER_OPTIONS) },
      { slug: 'laser-taloneira', label: 'Laser da Taloneira', fallback: toItems(LASER_OPTIONS) },
    ],
  },
  {
    title: 'Pesponto',
    categories: [
      { slug: 'cor-linha', label: 'Cor da Linha', fallback: toItems(COR_LINHA) },
      { slug: 'cor-borrachinha', label: 'Cor da Borrachinha', fallback: toItems(COR_BORRACHINHA) },
      { slug: 'cor-vivo', label: 'Cor do Vivo', fallback: toItems(COR_VIVO) },
    ],
  },
  {
    title: 'Metais',
    categories: [
      { slug: 'area-metal', label: 'Área do Metal', fallback: AREA_METAL },
      { slug: 'tipo-metal', label: 'Tipo do Metal', fallback: toItems(TIPO_METAL) },
      { slug: 'cor-metal', label: 'Cor do Metal', fallback: toItems(COR_METAL) },
    ],
  },
  {
    title: 'Solados',
    categories: [
      { slug: 'solados', label: 'Tipo de Solado', fallback: SOLADO },
      { slug: 'formato-bico', label: 'Formato do Bico', fallback: toItems(FORMATO_BICO) },
      { slug: 'cor-sola', label: 'Cor da Sola', fallback: COR_SOLA },
      { slug: 'cor-vira', label: 'Cor da Vira', fallback: COR_VIRA },
    ],
  },
  {
    title: 'Carimbo a Fogo',
    categories: [
      { slug: 'carimbo', label: 'Carimbo', fallback: CARIMBO },
    ],
  },
  {
    title: 'Glitter / Tecido',
    categories: [
      { slug: 'cor-glitter', label: 'Cor Glitter/Tecido', fallback: toItems(COR_GLITTER) },
    ],
  },
];

/* ─── VariacaoRow (shared) ─── */
function VariacaoRow({
  v, index, total, categorias, currentCatId, allVariacoes, onReorder, onRefetch,
}: {
  v: FichaVariacao;
  index: number;
  total: number;
  categorias: FichaCategoria[];
  currentCatId: string;
  allVariacoes: FichaVariacao[];
  onReorder: (dir: 'up' | 'down') => void;
  onRefetch: () => void;
}) {
  const updateVariacao = useUpdateVariacao();
  const deleteVariacao = useDeleteVariacao();
  const [relOpen, setRelOpen] = useState(false);
  const rel = (v as any).relacionamento as Record<string, string[]> | null;

  const otherCats = categorias.filter(c => c.id !== currentCatId);

  const handleRelChange = (catSlug: string, selectedValues: string[]) => {
    const newRel = { ...(rel || {}), [catSlug]: selectedValues };
    Object.keys(newRel).forEach(k => { if (newRel[k].length === 0) delete newRel[k]; });
    const finalRel = Object.keys(newRel).length > 0 ? newRel : null;
    updateVariacao.mutate({ id: v.id, relacionamento: finalRel }, {
      onSuccess: () => { toast.success('Relacionamento salvo'); onRefetch(); },
    });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/20 group">
      <div className="flex items-center gap-0.5">
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" disabled={index === 0} onClick={() => onReorder('up')}>
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" disabled={index === total - 1} onClick={() => onReorder('down')}>
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>
      <span className="text-xs text-muted-foreground w-6 text-center">{v.ordem}</span>
      <Input
        defaultValue={v.nome}
        className="h-7 text-xs border-none shadow-none focus-visible:ring-1 flex-1 min-w-0"
        onBlur={e => { if (e.target.value !== v.nome) updateVariacao.mutate({ id: v.id, nome: e.target.value }); }}
      />
      <Input
        type="number"
        step="0.01"
        defaultValue={v.preco_adicional}
        className="h-7 text-xs border-none shadow-none focus-visible:ring-1 w-20"
        onBlur={e => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val) && val !== v.preco_adicional) updateVariacao.mutate({ id: v.id, preco_adicional: val });
        }}
      />
      <Switch
        checked={v.ativo}
        onCheckedChange={checked => updateVariacao.mutate({ id: v.id, ativo: checked })}
        className="scale-75"
      />
      <Dialog open={relOpen} onOpenChange={setRelOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" className={`h-6 w-6 ${rel ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}>
            <Link2 className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-montserrat lowercase">relacionamentos: {v.nome}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Selecione quais variações de outras categorias são permitidas quando "{v.nome}" é selecionado.
          </p>
          <div className="space-y-4">
            {otherCats.map(oc => {
              const catVars = allVariacoes.filter(av => av.categoria_id === oc.id && av.ativo);
              if (catVars.length === 0) return null;
              const selected = rel?.[oc.slug] || [];
              return (
                <div key={oc.id} className="space-y-1">
                  <Label className="text-xs font-medium">{oc.nome}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {catVars.map(cv => {
                      const isSelected = selected.includes(cv.nome);
                      return (
                        <Badge
                          key={cv.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            const newSel = isSelected
                              ? selected.filter(s => s !== cv.nome)
                              : [...selected, cv.nome];
                            handleRelChange(oc.slug, newSel);
                          }}
                        >
                          {cv.nome}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
        onClick={() => {
          if (confirm(`Remover "${v.nome}"?`)) {
            deleteVariacao.mutate(v.id, { onSuccess: () => { toast.success('Removida'); onRefetch(); } });
          }
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ─── BootCategoryEditor: edits variations for a single category within a section ─── */
function BootCategoryEditor({
  catSlug, catLabel, fallback, fichaTipoId, allCategorias, allVariacoes, onRefetchCats,
}: {
  catSlug: string;
  catLabel: string;
  fallback: { label: string; preco: number }[];
  fichaTipoId: string;
  allCategorias: FichaCategoria[];
  allVariacoes: FichaVariacao[];
  onRefetchCats: () => void;
}) {
  const cat = allCategorias.find(c => c.slug === catSlug);
  const { data: variacoes, refetch } = useFichaVariacoes(cat?.id);
  const insertVariacao = useInsertVariacao();
  const insertCategoria = useInsertCategoria();
  const updateVariacao = useUpdateVariacao();
  const [addOpen, setAddOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newPreco, setNewPreco] = useState('0');
  const [newTipo, setNewTipo] = useState('selecao');
  const [newObrigatorio, setNewObrigatorio] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCreateCategory = () => {
    const ordem = allCategorias.length + 1;
    insertCategoria.mutate(
      { ficha_tipo_id: fichaTipoId, slug: catSlug, nome: catLabel, ordem },
      {
        onSuccess: () => {
          toast.success(`Categoria "${catLabel}" criada`);
          onRefetchCats();
        },
        onError: () => toast.error('Erro ao criar categoria'),
      }
    );
  };

  const handleAddVariacao = () => {
    if (!newNome.trim() || !cat) return;
    const ordem = (variacoes?.length ?? 0) + 1;
    insertVariacao.mutate(
      { categoria_id: cat.id, nome: newNome.trim(), preco_adicional: parseFloat(newPreco) || 0, ordem },
      {
        onSuccess: () => {
          toast.success('Variação adicionada');
          setNewNome('');
          setNewPreco('0');
          setAddOpen(false);
          refetch();
        },
        onError: () => toast.error('Erro ao adicionar'),
      },
    );
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    if (!variacoes) return;
    const idx = variacoes.findIndex(v => v.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= variacoes.length) return;
    updateVariacao.mutate({ id: variacoes[idx].id, ordem: variacoes[swapIdx].ordem });
    updateVariacao.mutate({ id: variacoes[swapIdx].id, ordem: variacoes[idx].ordem }, {
      onSuccess: () => refetch(),
    });
  };

  // If category doesn't exist in DB, show fallback as reference
  if (!cat) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground">{catLabel}</h4>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleCreateCategory} disabled={insertCategoria.isPending}>
            <Plus className="h-3 w-3" /> criar categoria
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {fallback.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs opacity-60">
              {item.label}{item.preco > 0 && ` R$${item.preco}`}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic">
          Valores hardcoded (somente leitura). Crie a categoria para gerenciar pelo banco.
        </p>
      </div>
    );
  }

  const items = variacoes || [];

  return (
    <div className="space-y-1">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 rounded px-2 py-1.5 transition-colors">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <h4 className="text-sm font-semibold">{catLabel}</h4>
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-2 border-l-2 border-border/40 pl-3 space-y-0.5">
            {items.map((v, i) => (
              <VariacaoRow
                key={v.id}
                v={v}
                index={i}
                total={items.length}
                categorias={allCategorias}
                currentCatId={cat.id}
                allVariacoes={allVariacoes}
                onReorder={dir => handleReorder(v.id, dir)}
                onRefetch={refetch}
              />
            ))}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma variação</p>
            )}

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1 text-xs mt-1 w-full text-muted-foreground hover:text-foreground">
                  <Plus className="h-3 w-3" /> adicionar variação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-montserrat lowercase">nova variação — {catLabel}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome da variação" />
                  </div>
                  <div>
                    <Label className="text-xs">Preço adicional</Label>
                    <Input type="number" step="0.01" value={newPreco} onChange={e => setNewPreco(e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo do campo</Label>
                      <Select value={newTipo} onValueChange={setNewTipo}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_CAMPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch checked={newObrigatorio} onCheckedChange={setNewObrigatorio} />
                      <Label className="text-xs">Obrigatório</Label>
                    </div>
                  </div>
                  <Button onClick={handleAddVariacao} disabled={insertVariacao.isPending} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* ─── CategoriaSection (generic, for non-boot fichas) ─── */
function CategoriaSection({
  cat, categorias, allVariacoes, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  cat: FichaCategoria;
  categorias: FichaCategoria[];
  allVariacoes: FichaVariacao[];
  onUpdate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: variacoes, refetch } = useFichaVariacoes(cat.id);
  const updateVariacao = useUpdateVariacao();
  const insertVariacao = useInsertVariacao();
  const [addOpen, setAddOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newPreco, setNewPreco] = useState('0');
  const [editingName, setEditingName] = useState(cat.nome);
  const [nameEditing, setNameEditing] = useState(false);
  const updateCat = useUpdateCategoria();
  const deleteCat = useDeleteCategoria();

  const handleAddVariacao = () => {
    if (!newNome.trim()) return;
    const ordem = (variacoes?.length ?? 0) + 1;
    insertVariacao.mutate(
      { categoria_id: cat.id, nome: newNome.trim(), preco_adicional: parseFloat(newPreco) || 0, ordem },
      {
        onSuccess: () => { toast.success('Variação adicionada'); setNewNome(''); setNewPreco('0'); setAddOpen(false); refetch(); },
        onError: () => toast.error('Erro ao adicionar'),
      },
    );
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    if (!variacoes) return;
    const idx = variacoes.findIndex(v => v.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= variacoes.length) return;
    updateVariacao.mutate({ id: variacoes[idx].id, ordem: variacoes[swapIdx].ordem });
    updateVariacao.mutate({ id: variacoes[swapIdx].id, ordem: variacoes[idx].ordem }, { onSuccess: () => refetch() });
  };

  const handleSaveCatName = () => {
    if (editingName.trim() && editingName !== cat.nome) {
      updateCat.mutate({ id: cat.id, nome: editingName.trim() }, {
        onSuccess: () => { toast.success('Categoria renomeada'); onUpdate(); },
      });
    }
    setNameEditing(false);
  };

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
            <div className="space-y-1">
              {variacoes?.map((v, i) => (
                <VariacaoRow key={v.id} v={v} index={i} total={variacoes.length} categorias={categorias} currentCatId={cat.id} allVariacoes={allVariacoes} onReorder={dir => handleReorder(v.id, dir)} onRefetch={refetch} />
              ))}
              {variacoes?.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma variação</p>}
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="mt-3 gap-1 w-full"><Plus className="h-3 w-3" /> adicionar variação</Button>
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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

  const [novaCategoria, setNovaCategoria] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoCampoOpen, setNovoCampoOpen] = useState(false);
  const [novoCampo, setNovoCampo] = useState({ nome: '', tipo: 'texto', obrigatorio: false, descCondicional: false, vinculo: '', opcoesRaw: '', relacionamento: '' });

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
      {
        onSuccess: () => { toast.success('Categoria adicionada'); setNovaCategoria(''); setDialogOpen(false); refetchCats(); },
        onError: () => toast.error('Erro ao adicionar categoria'),
      },
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

  /* ─── Section component for boot mirror ─── */
  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-base font-display font-bold border-b border-border pb-1 mb-3">{title}</h3>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="mx-auto max-w-4xl"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/configuracoes')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> configurações
          </button>
        </div>

        <h1 className="mb-8 font-montserrat text-2xl font-bold text-foreground lowercase">
          {tipo.nome.toLowerCase()}
        </h1>

        {/* ─── BOOT: Mirrored layout ─── */}
        {isBoot && categorias && (
          <section className="mb-10">
            <div className="bg-card rounded-xl p-6 md:p-8 border border-border/60 space-y-8">
              {BOOT_SECTIONS.map(section => (
                <div key={section.title} className="space-y-4">
                  <SectionTitle title={section.title} />
                  {section.categories.map(catDef => (
                    <BootCategoryEditor
                      key={catDef.slug}
                      catSlug={catDef.slug}
                      catLabel={catDef.label}
                      fallback={catDef.fallback as { label: string; preco: number }[]}
                      fichaTipoId={tipo.id}
                      allCategorias={categorias}
                      allVariacoes={allVariacoes || []}
                      onRefetchCats={refetchCats}
                    />
                  ))}
                </div>
              ))}

              {/* Extra note sections (fixed price items, not category-based) */}
              <div className="space-y-2">
                <SectionTitle title="Valores Fixos (referência)" />
                <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Sob Medida: R$50</span>
                  <span>Nome Bordado: R$40</span>
                  <span>Estampa: R$30</span>
                  <span>Pintura: R$15</span>
                  <span>Tricê: R$20</span>
                  <span>Tiras: R$15</span>
                  <span>Costura Atrás: R$20</span>
                  <span>Franja: R$15</span>
                  <span>Corrente: R$10</span>
                  <span>Strass: R$0,60/un</span>
                  <span>Cruz Metal: R$6/un</span>
                  <span>Bridão: R$3/un</span>
                  <span>Cavalo: R$5/un</span>
                </div>
              </div>
            </div>

            {/* Nova categoria (for boot too) */}
            <div className="mt-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Plus className="h-4 w-4" /> nova categoria
                  </Button>
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
                const ativo = workflowMap.get(etapa.id) ?? false;
                return (
                  <div key={etapa.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs text-muted-foreground">{etapa.ordem}</span>
                      <span className="text-sm text-foreground">{etapa.nome}</span>
                    </div>
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
