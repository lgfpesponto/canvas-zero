import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Pencil, Trash2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFichaEdit } from '@/contexts/FichaEditContext';
import { lookupSlug } from './labelSlugMap';
import { QUANTIFIABLE_METAL_SLUGS, getDynamicUnitPrice } from '@/lib/dynamicUnitPrice';
import {
  useFichaCampos, useAllVariacoesByFichaTipo,
  useUpdateFichaCampo, useInsertVariacao, useUpdateVariacao, useDeleteVariacao,
  useFichaCategorias,
  type FichaCampo, type FichaVariacao,
} from '@/hooks/useAdminConfig';

interface Props {
  labelText: string;
  defaultTipo?: 'texto' | 'selecao' | 'multipla' | 'checkbox' | 'textarea' | 'numero';
  defaultCategoriaSlug?: string;
}

export default function FichaFieldControls({ labelText, defaultTipo = 'selecao', defaultCategoriaSlug }: Props) {
  const { editMode, fichaSlug, fichaTipoId } = useFichaEdit();
  if (!editMode || !fichaTipoId) return null;
  const slug = lookupSlug(fichaSlug, labelText);
  if (!slug) return null;
  return (
    <InlineControls
      slug={slug}
      fichaTipoId={fichaTipoId}
      defaultTipo={defaultTipo}
      defaultCategoriaSlug={defaultCategoriaSlug}
      defaultNome={labelText}
    />
  );
}

function InlineControls({
  slug, fichaTipoId, defaultTipo, defaultCategoriaSlug, defaultNome,
}: {
  slug: string; fichaTipoId: string;
  defaultTipo: string; defaultCategoriaSlug?: string; defaultNome: string;
}) {
  const [open, setOpen] = useState(false);
  const [autoDraft, setAutoDraft] = useState(false);
  const { data: campos = [] } = useFichaCampos(fichaTipoId);
  const campo = useMemo(() => campos.find(c => c.slug === slug), [campos, slug]);
  const tipo = campo?.tipo || defaultTipo;
  const podeVar = tipo === 'selecao' || tipo === 'multipla';

  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle ml-1"
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      {podeVar && (
        <Button
          type="button" size="icon" variant="ghost"
          className="h-5 w-5 opacity-70 hover:opacity-100"
          title="adicionar variação"
          onClick={() => { setAutoDraft(true); setOpen(true); }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
      <EditPopover
        slug={slug} fichaTipoId={fichaTipoId} defaultTipo={defaultTipo}
        defaultCategoriaSlug={defaultCategoriaSlug} defaultNome={defaultNome}
        open={open} onOpenChange={(v) => { setOpen(v); if (!v) setAutoDraft(false); }}
        autoAddDraft={autoDraft}
      />
    </span>
  );
}

function EditPopover({
  slug, fichaTipoId, defaultTipo, defaultCategoriaSlug, defaultNome,
  open, onOpenChange, autoAddDraft,
}: {
  slug: string; fichaTipoId: string; defaultTipo: string;
  defaultCategoriaSlug?: string; defaultNome: string;
  open: boolean; onOpenChange: (v: boolean) => void; autoAddDraft: boolean;
}) {
  const qc = useQueryClient();
  const { data: campos = [] } = useFichaCampos(fichaTipoId);
  const { data: categorias = [] } = useFichaCategorias(fichaTipoId);
  const { data: allVars = [] } = useAllVariacoesByFichaTipo(fichaTipoId);

  const campo = useMemo(() => campos.find(c => c.slug === slug), [campos, slug]);
  const variacoes = useMemo(
    () => (campo ? allVars.filter(v => v.campo_id === campo.id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)) : []),
    [allVars, campo],
  );

  const [nome, setNome] = useState('');
  const [obrigatorio, setObrigatorio] = useState(false);
  const [checkboxPreco, setCheckboxPreco] = useState<number>(0);
  const [drafts, setDrafts] = useState<{ id: string; nome: string; preco: number; foto_url: string }[]>([]);

  // Reset state whenever popover opens or the underlying campo changes.
  useEffect(() => {
    if (!open) return;
    setNome(campo?.nome ?? defaultNome);
    setObrigatorio(!!campo?.obrigatorio);
    const opt = Array.isArray(campo?.opcoes) && campo!.opcoes.length > 0 ? campo!.opcoes[0] : null;
    const rawPreco = opt ? Number(opt.preco_adicional) || 0 : 0;
    // Fallback: quando o campo ainda não foi semeado (opcoes vazio/zero),
    // mostra o preço vigente da cascata dinâmica (constante hardcoded), para
    // o admin editar sobre o valor atual em vez de começar de zero.
    setCheckboxPreco(rawPreco > 0 ? rawPreco : getDynamicUnitPrice(slug, 0));
    if (autoAddDraft) {
      setDrafts([{ id: `d${Date.now()}`, nome: '', preco: 0, foto_url: '' }]);
    } else {
      setDrafts([]);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campo?.id, campo?.nome, campo?.obrigatorio, JSON.stringify(campo?.opcoes)]);

  const updateCampo = useUpdateFichaCampo();
  const insertVar = useInsertVariacao();

  const tipo = campo?.tipo || defaultTipo;
  const isSelecaoLike = tipo === 'selecao' || tipo === 'multipla';
  const isCheckbox = tipo === 'checkbox';
  const isTexto = tipo === 'texto' || tipo === 'textarea' || tipo === 'numero';

  const ensureCampo = async (): Promise<FichaCampo | null> => {
    if (campo) return campo;
    const cat = categorias.find(c => c.slug === defaultCategoriaSlug) || categorias[0];
    if (!cat) { toast.error('Nenhuma categoria disponível'); return null; }
    const { data, error } = await supabase.from('ficha_campos').insert({
      ficha_tipo_id: fichaTipoId,
      categoria_id: cat.id,
      nome: defaultNome, slug, tipo: defaultTipo,
      obrigatorio: false, ordem: (campos.length || 0) + 1,
      opcoes: [], vinculo: null, desc_condicional: false,
    }).select('*').single();
    if (error) { toast.error(error.message); return null; }
    qc.invalidateQueries({ queryKey: ['ficha_campos'] });
    return data as any as FichaCampo;
  };

  const handleSalvar = async () => {
    const c = await ensureCampo();
    if (!c) return;
    const patch: any = { id: c.id, nome, obrigatorio };
    if (isCheckbox) patch.opcoes = [{ label: 'sim', preco_adicional: checkboxPreco }];
    await updateCampo.mutateAsync(patch);

    // Persist any pending drafts (variações novas)
    for (const d of drafts) {
      if (!d.nome.trim()) continue;
      await insertVar.mutateAsync({
        categoria_id: c.categoria_id!,
        campo_id: c.id,
        nome: d.nome.trim(),
        preco_adicional: d.preco || 0,
        ordem: variacoes.length + 1,
        foto_url: d.foto_url.trim() || null,
      });
    }
    toast.success('Campo salvo');
    onOpenChange(false);
  };

  const addDraft = () => setDrafts(prev => [...prev, { id: `d${Date.now()}${prev.length}`, nome: '', preco: 0, foto_url: '' }]);
  const updateDraft = (id: string, patch: Partial<{ nome: string; preco: number; foto_url: string }>) =>
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  const removeDraft = (id: string) => setDrafts(prev => prev.filter(d => d.id !== id));

  const commitDraft = async (id: string) => {
    const d = drafts.find(x => x.id === id);
    if (!d || !d.nome.trim()) { toast.error('Informe o nome'); return; }
    const c = await ensureCampo();
    if (!c) return;
    await insertVar.mutateAsync({
      categoria_id: c.categoria_id!,
      campo_id: c.id,
      nome: d.nome.trim(),
      preco_adicional: d.preco || 0,
      ordem: variacoes.length + 1,
      foto_url: d.foto_url.trim() || null,
    });
    removeDraft(id);
    toast.success('Variação criada');
  };

  const removeDraft = (id: string) => setDrafts(prev => prev.filter(d => d.id !== id));

  const commitDraft = async (id: string) => {
    const d = drafts.find(x => x.id === id);
    if (!d || !d.nome.trim()) { toast.error('Informe o nome'); return; }
    const c = await ensureCampo();
    if (!c) return;
    await insertVar.mutateAsync({
      categoria_id: c.categoria_id!,
      campo_id: c.id,
      nome: d.nome.trim(),
      preco_adicional: d.preco || 0,
      ordem: variacoes.length + 1,
    });
    removeDraft(id);
    toast.success('Variação criada');
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button" size="icon" variant="ghost"
          className="h-5 w-5 opacity-70 hover:opacity-100"
          title="editar campo"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto space-y-3" align="start" onClick={e => e.stopPropagation()}>
        {!campo && (
          <p className="text-[11px] text-muted-foreground">
            Este campo ainda não existe no banco — ao salvar, será criado como <b>{defaultTipo}</b> na categoria "{defaultCategoriaSlug || categorias[0]?.slug || 'primeira'}".
          </p>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Nome do campo</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={obrigatorio} onCheckedChange={setObrigatorio} />
          <Label className="text-xs">
            obrigatório
            {campo?.vinculo && (
              <span className="ml-1 text-muted-foreground">(só quando o campo pai for preenchido)</span>
            )}
          </Label>
        </div>
        {isCheckbox && (
          <div className="space-y-1">
            <Label className="text-xs">
              {QUANTIFIABLE_METAL_SLUGS.has(slug) ? 'Preço quando "Tem" unitário (R$)' : 'Preço quando "Tem" (R$)'}
            </Label>
            <Input
              type="number" step="0.01" value={checkboxPreco}
              onChange={e => setCheckboxPreco(parseFloat(e.target.value) || 0)}
              className="h-8"
            />
            {QUANTIFIABLE_METAL_SLUGS.has(slug) && (
              <p className="text-[10px] text-muted-foreground">soma = unitário × quantidade</p>
            )}
          </div>
        )}
        {isTexto && (
          <p className="text-[11px] text-muted-foreground">
            Campo de texto livre — só é possível renomear.
          </p>
        )}
        {isSelecaoLike && (
          <div className="space-y-1 border-t pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Variações ({variacoes.length})</Label>
              <Button size="sm" variant="ghost" onClick={addDraft} className="h-6 gap-1 text-[11px]">
                <Plus className="h-3 w-3" /> variação
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {drafts.map(d => (
                <div key={d.id} className="flex items-center gap-1 text-xs bg-primary/5 rounded px-1.5 py-1 border border-primary/30">
                  <Input
                    autoFocus
                    value={d.nome}
                    onChange={e => updateDraft(d.id, { nome: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(d.id); } }}
                    placeholder="nome"
                    className="h-6 text-[11px] flex-1 px-1"
                  />
                  <Input
                    type="number" step="0.01"
                    value={d.preco}
                    onChange={e => updateDraft(d.id, { preco: parseFloat(e.target.value) || 0 })}
                    placeholder="R$"
                    className="h-6 text-[11px] w-16 px-1"
                  />
                  <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => commitDraft(d.id)}>ok</Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDraft(d.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {variacoes.length === 0 && drafts.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">Nenhuma variação.</p>
              )}
              {variacoes.map(v => (
                <VarLine key={v.id} v={v} todosCampos={campos} todasVars={allVars} />
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1 border-t">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>fechar</Button>
          <Button size="sm" onClick={handleSalvar}>salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VarLine({ v, todosCampos, todasVars }: {
  v: FichaVariacao & { relacionamento?: any };
  todosCampos: FichaCampo[];
  todasVars: FichaVariacao[];
}) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(v.nome);
  const [preco, setPreco] = useState<number>(Number(v.preco_adicional) || 0);
  const [relOpen, setRelOpen] = useState(false);

  const relInicial: Record<string, string[]> = ((v as any).relacionamento && typeof (v as any).relacionamento === 'object')
    ? (v as any).relacionamento : {};
  const [rel, setRel] = useState<Record<string, string[]>>(relInicial);

  const updateVar = useUpdateVariacao();
  const deleteVar = useDeleteVariacao();

  const camposComVars = useMemo(() => {
    const arr: { campo: FichaCampo; vars: FichaVariacao[] }[] = [];
    for (const c of todosCampos) {
      if (c.id === v.campo_id) continue;
      const vs = todasVars.filter(x => x.campo_id === c.id);
      if (vs.length > 0) arr.push({ campo: c, vars: vs });
    }
    return arr;
  }, [todosCampos, todasVars, v.campo_id]);

  const totalRel = Object.values(rel).reduce((a, arr) => a + arr.length, 0);

  const toggleRel = (campoSlug: string, varName: string) => {
    setRel(prev => {
      const s = new Set(prev[campoSlug] || []);
      s.has(varName) ? s.delete(varName) : s.add(varName);
      const next = { ...prev };
      if (s.size === 0) delete next[campoSlug]; else next[campoSlug] = [...s];
      return next;
    });
  };

  return (
    <div className="flex items-center gap-1 text-xs bg-background rounded px-1.5 py-1 border">
      {editing ? (
        <>
          <Input value={nome} onChange={e => setNome(e.target.value)} className="h-6 text-[11px] flex-1 px-1" />
          <Input type="number" step="0.01" value={preco} onChange={e => setPreco(parseFloat(e.target.value) || 0)} className="h-6 text-[11px] w-16 px-1" />
          <Button size="sm" className="h-6 px-2 text-[11px]" onClick={async () => {
            await updateVar.mutateAsync({ id: v.id, nome, preco_adicional: preco });
            setEditing(false); toast.success('salvo');
          }}>ok</Button>
        </>
      ) : (
        <>
          <span className="flex-1 truncate">{v.nome}</span>
          <span className="text-muted-foreground w-14 text-right">
            {Number(v.preco_adicional) ? `R$${Number(v.preco_adicional).toFixed(0)}` : '—'}
          </span>
          <Popover open={relOpen} onOpenChange={setRelOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-5 w-5 relative" title="relacionamento">
                <Link2 className="h-3 w-3" />
                {totalRel > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 min-w-3 rounded-full bg-primary text-[8px] text-primary-foreground px-1 flex items-center justify-center leading-none">
                    {totalRel}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-80 overflow-y-auto space-y-2" side="right" align="start">
              <div>
                <p className="text-xs font-semibold">Aparece quando…</p>
                <p className="text-[10px] text-muted-foreground">Marque quais opções de outros campos <b>liberam</b> "{v.nome}". Sem nada marcado, aparece sempre.</p>
              </div>
              {camposComVars.length === 0 ? (
                <p className="text-[11px] italic text-muted-foreground">Sem outros campos.</p>
              ) : camposComVars.map(({ campo, vars }) => (
                <div key={campo.id}>
                  <p className="text-[11px] font-medium">{campo.nome}</p>
                  <div className="grid grid-cols-2 gap-0.5">
                    {vars.map(x => {
                      const checked = (rel[campo.slug] || []).includes(x.nome);
                      return (
                        <label key={x.id} className="flex items-center gap-1 text-[10px] cursor-pointer">
                          <Checkbox checked={checked} onCheckedChange={() => toggleRel(campo.slug, x.nome)} />
                          <span className="truncate">{x.nome}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-1 pt-1 border-t">
                <Button size="sm" variant="ghost" className="h-7" onClick={() => { setRel(relInicial); setRelOpen(false); }}>cancelar</Button>
                <Button size="sm" className="h-7" onClick={async () => {
                  await updateVar.mutateAsync({ id: v.id, relacionamento: rel });
                  toast.success('salvo'); setRelOpen(false);
                }}>salvar</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="icon" variant="ghost" className="h-5 w-5" title="editar" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" title="excluir"
            onClick={async () => {
              if (!window.confirm(`Excluir "${v.nome}"?`)) return;
              await deleteVar.mutateAsync(v.id);
            }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
