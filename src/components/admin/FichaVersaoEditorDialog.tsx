import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Save, X, Link2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  useFichaCategorias, useFichaCampos, useAllVariacoesByFichaTipo,
  useInsertCategoria, useUpdateCategoria, useDeleteCategoria,
  useInsertFichaCampo, useUpdateFichaCampo, useDeleteFichaCampo,
  useInsertVariacao, useUpdateVariacao, useDeleteVariacao,
  type FichaVariacao, type FichaCampo, type FichaCategoria,
} from '@/hooks/useAdminConfig';
import { useQueryClient } from '@tanstack/react-query';
import { salvarNovaVersao } from '@/lib/fichaVersoes';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fichaTipoId: string;
  fichaTipoNome: string;
}

export default function FichaVersaoEditorDialog({ open, onOpenChange, fichaTipoId, fichaTipoNome }: Props) {
  const qc = useQueryClient();
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: categorias = [] } = useFichaCategorias(fichaTipoId);
  const { data: campos = [] } = useFichaCampos(fichaTipoId);
  const { data: variacoes = [] } = useAllVariacoesByFichaTipo(fichaTipoId);

  const insertCat = useInsertCategoria();
  const updateCat = useUpdateCategoria();
  const deleteCat = useDeleteCategoria();

  const handleAddCategoria = async () => {
    const nome = window.prompt('Nome da nova categoria:');
    if (!nome) return;
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const ordem = (categorias?.length || 0) + 1;
    await insertCat.mutateAsync({ ficha_tipo_id: fichaTipoId, slug, nome, ordem });
    toast.success('Categoria criada');
  };

  const handleSalvarVersao = async () => {
    setSaving(true);
    const res = await salvarNovaVersao(fichaTipoId, descricao || undefined);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error || 'Erro ao salvar versão');
      return;
    }
    toast.success(`Versão ${res.versao} salva no banco`);
    setDescricao('');
    qc.invalidateQueries();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar ficha — {fichaTipoNome}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Cada categoria da ficha aparece abaixo com seus campos e variações. Use <b>+</b> para adicionar e <b>lápis</b> para editar
            nome/preço. Ao salvar, uma <b>nova versão</b> é gerada — pedidos novos usam a versão atualizada; pedidos anteriores ficam intactos.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Categorias ({categorias.length})</h3>
            <Button size="sm" variant="outline" onClick={handleAddCategoria} className="gap-1">
              <Plus className="h-4 w-4" /> nova categoria
            </Button>
          </div>

          {categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma categoria ainda.</p>
          ) : (
            categorias.map(cat => (
              <CategoriaBlock
                key={cat.id}
                categoria={cat}
                fichaTipoId={fichaTipoId}
                campos={campos.filter(c => c.categoria_id === cat.id)}
                todosCampos={campos}
                variacoes={variacoes}
                onUpdate={async (patch) => { await updateCat.mutateAsync({ id: cat.id, ...patch }); }}
                onDelete={async () => {
                  if (!window.confirm(`Excluir categoria "${cat.nome}" e todas as suas variações?`)) return;
                  await deleteCat.mutateAsync(cat.id);
                  toast.success('Categoria excluída');
                }}
              />
            ))
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-4 flex-col sm:flex-col items-stretch gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Descrição da mudança (opcional)</Label>
            <Textarea
              rows={2}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: adicionei cor 'Vermelho Bordô' ao couro do cano"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> fechar
            </Button>
            <Button onClick={handleSalvarVersao} disabled={saving} className="gap-1">
              <Save className="h-4 w-4" /> {saving ? 'salvando...' : 'salvar no banco (nova versão)'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────── Categoria ────────── */
function CategoriaBlock({
  categoria, fichaTipoId, campos, todosCampos, variacoes, onUpdate, onDelete,
}: {
  categoria: FichaCategoria; fichaTipoId: string;
  campos: FichaCampo[]; todosCampos: FichaCampo[]; variacoes: FichaVariacao[];
  onUpdate: (patch: any) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const camposDaCat = useMemo(
    () => [...campos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [campos],
  );

  // Variações "órfãs" (sem campo_id, mas dentro da categoria)
  const variacoesOrfas = useMemo(
    () => variacoes.filter(v => v.categoria_id === categoria.id && !v.campo_id),
    [variacoes, categoria.id],
  );

  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [addCampoOpen, setAddCampoOpen] = useState(false);
  const [novoCampoNome, setNovoCampoNome] = useState('');
  const [novoCampoTipo, setNovoCampoTipo] = useState<'selecao' | 'multipla' | 'checkbox' | 'texto'>('selecao');
  const [novoCampoObrig, setNovoCampoObrig] = useState(false);

  const insertCampo = useInsertFichaCampo();

  const handleAddCampoConfirm = async () => {
    const nomeCampo = novoCampoNome.trim();
    if (!nomeCampo) { toast.error('Informe o nome do campo'); return; }
    const slug = nomeCampo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    await insertCampo.mutateAsync({
      ficha_tipo_id: fichaTipoId,
      categoria_id: categoria.id,
      nome: nomeCampo, slug, tipo: novoCampoTipo,
      obrigatorio: novoCampoObrig,
      ordem: camposDaCat.length + 1,
      opcoes: novoCampoTipo === 'checkbox' ? [{ label: 'sim', preco_adicional: 0 }] : [],
      vinculo: null,
      desc_condicional: false,
    });
    toast.success('Campo criado');
    setAddCampoOpen(false);
    setNovoCampoNome('');
    setNovoCampoTipo('selecao');
    setNovoCampoObrig(false);
  };

  const totalVars = camposDaCat.reduce(
    (acc, c) => acc + variacoes.filter(v => v.campo_id === c.id).length,
    variacoesOrfas.length,
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon" variant="ghost" className="h-6 w-6"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'expandir' : 'recolher'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {editingName ? (
            <>
              <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8" />
              <Button size="sm" onClick={async () => { await onUpdate({ nome }); setEditingName(false); }}>ok</Button>
              <Button size="sm" variant="ghost" onClick={() => { setNome(categoria.nome); setEditingName(false); }}>cancelar</Button>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="text-xs">{categoria.slug}</Badge>
              <span className="font-semibold">{categoria.nome}</span>
              <span className="text-xs text-muted-foreground">
                · {camposDaCat.length} {camposDaCat.length === 1 ? 'campo' : 'campos'} · {totalVars} variações
              </span>
              <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={() => setEditingName(true)} title="renomear categoria">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} title="excluir categoria">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="pl-3 border-l-2 border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-muted-foreground">Campos</span>
              <Button size="sm" variant="ghost" onClick={handleAddCampo} className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> campo
              </Button>
            </div>
            {camposDaCat.length === 0 && variacoesOrfas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Info className="h-3 w-3" />
                Sem campos no banco. Se a ficha mostra campos desta categoria, eles estão hardcoded no formulário.
              </p>
            ) : (
              <>
                {camposDaCat.map((campo) => (
                  <CampoBlock
                    key={campo.id}
                    campo={campo}
                    todosCampos={todosCampos}
                    variacoes={variacoes.filter(v => v.campo_id === campo.id)}
                    todasVariacoes={variacoes}
                  />
                ))}
                {variacoesOrfas.length > 0 && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2 space-y-1">
                    <p className="text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Info className="h-3 w-3" /> {variacoesOrfas.length} variações desta categoria não estão vinculadas a nenhum campo.
                    </p>
                    {variacoesOrfas.map(v => (
                      <VariacaoRow key={v.id} variacao={v} todosCampos={todosCampos} todasVariacoes={variacoes} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────── Campo ────────── */
function CampoBlock({
  campo, todosCampos, variacoes, todasVariacoes,
}: {
  campo: FichaCampo; todosCampos: FichaCampo[]; variacoes: FichaVariacao[]; todasVariacoes: FichaVariacao[];
}) {
  const updateCampo = useUpdateFichaCampo();
  const deleteCampo = useDeleteFichaCampo();
  const insertVar = useInsertVariacao();

  const [editOpen, setEditOpen] = useState(false);
  const [nome, setNome] = useState(campo.nome);
  const [obrigatorio, setObrigatorio] = useState(!!campo.obrigatorio);

  // Preço para tipo checkbox (armazenado em opcoes[0].preco_adicional)
  const checkboxOpcao = Array.isArray(campo.opcoes) && campo.opcoes.length > 0 ? campo.opcoes[0] : null;
  const [checkboxPreco, setCheckboxPreco] = useState<number>(
    checkboxOpcao ? Number(checkboxOpcao.preco_adicional) || 0 : 0,
  );

  useEffect(() => {
    setNome(campo.nome);
    setObrigatorio(!!campo.obrigatorio);
    if (checkboxOpcao) setCheckboxPreco(Number(checkboxOpcao.preco_adicional) || 0);
  }, [campo.id, campo.nome, campo.obrigatorio, checkboxOpcao]);

  const podeAdicionarVariacao = campo.tipo === 'selecao' || campo.tipo === 'multipla';

  const handleAddVar = async () => {
    const nomeVar = window.prompt('Nome da variação:');
    if (!nomeVar) return;
    const precoStr = window.prompt('Preço adicional (R$):', '0') || '0';
    const preco = parseFloat(precoStr.replace(',', '.')) || 0;
    await insertVar.mutateAsync({
      categoria_id: campo.categoria_id!,
      campo_id: campo.id,
      nome: nomeVar,
      preco_adicional: preco,
      ordem: variacoes.length + 1,
    });
    toast.success('Variação criada');
  };

  const handleSalvarCampo = async () => {
    const patch: any = { id: campo.id, nome, obrigatorio };
    if (campo.tipo === 'checkbox') {
      patch.opcoes = [{ label: 'sim', preco_adicional: checkboxPreco }];
    }
    await updateCampo.mutateAsync(patch);
    setEditOpen(false);
    toast.success('Campo salvo');
  };

  return (
    <div className="rounded-md bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">{campo.nome}</span>
        <Badge variant="outline" className="text-[10px]">{campo.tipo}</Badge>
        {campo.obrigatorio && <Badge className="text-[10px] bg-primary/80">obrig.</Badge>}
        {podeAdicionarVariacao && (
          <span className="text-[11px] text-muted-foreground">· {variacoes.length} variações</span>
        )}
        <div className="ml-auto flex gap-1">
          {podeAdicionarVariacao && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleAddVar} title="adicionar variação">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Popover open={editOpen} onOpenChange={setEditOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6" title="editar campo">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3" align="end">
              <div className="space-y-1">
                <Label className="text-xs">Nome do campo</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} className="h-8" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={obrigatorio} onCheckedChange={setObrigatorio} />
                <Label className="text-xs">obrigatório</Label>
              </div>
              {campo.tipo === 'checkbox' && (
                <div className="space-y-1">
                  <Label className="text-xs">Preço quando marcado (R$)</Label>
                  <Input
                    type="number" step="0.01" value={checkboxPreco}
                    onChange={e => setCheckboxPreco(parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
              )}
              {campo.tipo === 'texto' && (
                <p className="text-[11px] text-muted-foreground">
                  Campo de texto livre — só é possível renomear.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setEditOpen(false)}>cancelar</Button>
                <Button size="sm" onClick={handleSalvarCampo}>salvar</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive"
            onClick={async () => {
              if (!window.confirm(`Excluir campo "${campo.nome}" e suas variações?`)) return;
              await deleteCampo.mutateAsync(campo.id);
              toast.success('Campo excluído');
            }}
            title="excluir campo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {variacoes.length > 0 && (
        <div className="grid gap-1 pl-2">
          {variacoes.map((v) => (
            <VariacaoRow key={v.id} variacao={v} todosCampos={todosCampos} todasVariacoes={todasVariacoes} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────── Variação ────────── */
function VariacaoRow({
  variacao, todosCampos, todasVariacoes,
}: {
  variacao: FichaVariacao & { relacionamento?: any };
  todosCampos: FichaCampo[];
  todasVariacoes: FichaVariacao[];
}) {
  const updateVar = useUpdateVariacao();
  const deleteVar = useDeleteVariacao();
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(variacao.nome);
  const [preco, setPreco] = useState<number>(Number(variacao.preco_adicional) || 0);
  const [relOpen, setRelOpen] = useState(false);

  const relInicial: Record<string, string[]> = ((variacao as any).relacionamento && typeof (variacao as any).relacionamento === 'object')
    ? (variacao as any).relacionamento
    : {};
  const [rel, setRel] = useState<Record<string, string[]>>(relInicial);

  const camposComVariacoes = useMemo(() => {
    const map = new Map<string, { campo: FichaCampo; vars: FichaVariacao[] }>();
    for (const c of todosCampos) {
      if (c.id === variacao.campo_id) continue; // não relacionar consigo mesmo
      const vs = todasVariacoes.filter(v => v.campo_id === c.id);
      if (vs.length > 0) map.set(c.slug, { campo: c, vars: vs });
    }
    return Array.from(map.values());
  }, [todosCampos, todasVariacoes, variacao.campo_id]);

  const toggleRel = (campoSlug: string, varName: string) => {
    setRel(prev => {
      const arr = new Set(prev[campoSlug] || []);
      if (arr.has(varName)) arr.delete(varName); else arr.add(varName);
      const next = { ...prev };
      if (arr.size === 0) delete next[campoSlug]; else next[campoSlug] = Array.from(arr);
      return next;
    });
  };

  const totalRel = Object.values(rel).reduce((a, arr) => a + arr.length, 0);

  return (
    <div className="flex items-center gap-2 text-sm bg-background rounded px-2 py-1">
      {editing ? (
        <>
          <Input value={nome} onChange={e => setNome(e.target.value)} className="h-7 text-xs flex-1" />
          <Input
            type="number"
            step="0.01"
            value={preco}
            onChange={e => setPreco(parseFloat(e.target.value) || 0)}
            className="h-7 text-xs w-24"
          />
          <Button size="sm" className="h-7" onClick={async () => {
            await updateVar.mutateAsync({ id: variacao.id, nome, preco_adicional: preco });
            setEditing(false);
            toast.success('Variação salva');
          }}>ok</Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => { setNome(variacao.nome); setPreco(Number(variacao.preco_adicional) || 0); setEditing(false); }}>x</Button>
        </>
      ) : (
        <>
          <span className="flex-1 truncate">{variacao.nome}</span>
          <span className="text-xs text-muted-foreground w-20 text-right">
            {Number(variacao.preco_adicional) ? `R$ ${Number(variacao.preco_adicional).toFixed(2)}` : '—'}
          </span>
          <Popover open={relOpen} onOpenChange={setRelOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 relative" title="relacionamento condicional">
                <Link2 className="h-3.5 w-3.5" />
                {totalRel > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 rounded-full bg-primary text-[8px] text-primary-foreground px-1 flex items-center justify-center">
                    {totalRel}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96 overflow-y-auto space-y-3" align="end">
              <div>
                <p className="text-xs font-semibold">Aparece quando…</p>
                <p className="text-[11px] text-muted-foreground">
                  Marque as variações de outros campos que <b>liberam</b> "{variacao.nome}". Sem nada marcado, aparece sempre.
                </p>
              </div>
              {camposComVariacoes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum outro campo com variações.</p>
              ) : (
                camposComVariacoes.map(({ campo, vars }) => (
                  <div key={campo.id} className="space-y-1">
                    <p className="text-[11px] font-medium">{campo.nome}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {vars.map(v => {
                        const checked = (rel[campo.slug] || []).includes(v.nome);
                        return (
                          <label key={v.id} className="flex items-center gap-1 text-[11px] cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleRel(campo.slug, v.nome)}
                            />
                            <span className="truncate">{v.nome}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button size="sm" variant="ghost" onClick={() => { setRel(relInicial); setRelOpen(false); }}>cancelar</Button>
                <Button size="sm" onClick={async () => {
                  await updateVar.mutateAsync({ id: variacao.id, relacionamento: rel });
                  toast.success('Relacionamento salvo');
                  setRelOpen(false);
                }}>salvar</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)} title="editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive"
            onClick={async () => {
              if (!window.confirm(`Excluir "${variacao.nome}"?`)) return;
              await deleteVar.mutateAsync(variacao.id);
              toast.success('Excluída');
            }}
            title="excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
