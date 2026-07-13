import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Save, X, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useFichaCategorias, useFichaCampos,
  useInsertCategoria, useUpdateCategoria, useDeleteCategoria,
  useInsertFichaCampo, useUpdateFichaCampo, useDeleteFichaCampo,
  useInsertVariacao, useUpdateVariacao, useDeleteVariacao,
} from '@/hooks/useAdminConfig';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar ficha — {fichaTipoNome}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Adicione, edite ou remova categorias, campos e variações. Ao salvar no banco, uma nova
            versão é criada — pedidos novos usarão a versão atualizada; pedidos anteriores continuam intactos.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Categorias</h3>
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
function CategoriaBlock({ categoria, fichaTipoId, onUpdate, onDelete }: {
  categoria: any; fichaTipoId: string;
  onUpdate: (patch: any) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const { data: campos = [] } = useFichaCampos(fichaTipoId);
  const camposDaCat = useMemo(
    () => campos.filter((c: any) => c.categoria_id === categoria.id).sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [campos, categoria.id],
  );

  const [editingName, setEditingName] = useState(false);
  const [nome, setNome] = useState(categoria.nome);

  const insertCampo = useInsertFichaCampo();

  const handleAddCampo = async () => {
    const nomeCampo = window.prompt('Nome do novo campo (ex: "Cor do Cano"):');
    if (!nomeCampo) return;
    const tipo = window.prompt('Tipo (texto | selecao | multipla | checkbox):', 'selecao') || 'selecao';
    const slug = nomeCampo.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    await insertCampo.mutateAsync({
      ficha_tipo_id: fichaTipoId,
      categoria_id: categoria.id,
      nome: nomeCampo, slug, tipo,
      obrigatorio: false,
      ordem: camposDaCat.length + 1,
      opcoes: [],
      vinculo: null,
      desc_condicional: false,
    });
    toast.success('Campo criado');
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
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
              <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={() => setEditingName(true)} title="renomear">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} title="excluir">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="pl-3 border-l-2 border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-muted-foreground">Campos</span>
            <Button size="sm" variant="ghost" onClick={handleAddCampo} className="h-7 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> campo
            </Button>
          </div>
          {camposDaCat.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sem campos.</p>
          ) : (
            camposDaCat.map((campo: any) => (
              <CampoBlock key={campo.id} campo={campo} fichaTipoId={fichaTipoId} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────── Campo ────────── */
function CampoBlock({ campo, fichaTipoId }: { campo: any; fichaTipoId: string }) {
  const updateCampo = useUpdateFichaCampo();
  const deleteCampo = useDeleteFichaCampo();
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(campo.nome);
  const [obrigatorio, setObrigatorio] = useState(!!campo.obrigatorio);

  const { data: variacoes = [] } = useQuery({
    queryKey: ['ficha_variacoes_campo', campo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('*')
        .eq('campo_id', campo.id)
        .order('ordem');
      if (error) throw error;
      return data || [];
    },
  });

  const insertVar = useInsertVariacao();

  const handleAddVar = async () => {
    const nomeVar = window.prompt('Nome da variação:');
    if (!nomeVar) return;
    const precoStr = window.prompt('Preço adicional (R$):', '0') || '0';
    const preco = parseFloat(precoStr.replace(',', '.')) || 0;
    await insertVar.mutateAsync({
      categoria_id: campo.categoria_id,
      campo_id: campo.id,
      nome: nomeVar,
      preco_adicional: preco,
      ordem: variacoes.length + 1,
    });
    toast.success('Variação criada');
  };

  return (
    <div className="rounded-md bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input value={nome} onChange={e => setNome(e.target.value)} className="h-7 text-sm" />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={obrigatorio} onChange={e => setObrigatorio(e.target.checked)} />
              obrig.
            </label>
            <Button size="sm" onClick={async () => {
              await updateCampo.mutateAsync({ id: campo.id, nome, obrigatorio });
              setEditing(false);
            }}>ok</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNome(campo.nome); setObrigatorio(!!campo.obrigatorio); setEditing(false); }}>x</Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">{campo.nome}</span>
            <Badge variant="outline" className="text-[10px]">{campo.tipo}</Badge>
            {campo.obrigatorio && <Badge className="text-[10px] bg-primary/80">obrig.</Badge>}
            <div className="ml-auto flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleAddVar} title="adicionar variação">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)} title="editar campo">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={async () => {
                  if (!window.confirm(`Excluir campo "${campo.nome}"?`)) return;
                  await deleteCampo.mutateAsync(campo.id);
                  toast.success('Campo excluído');
                }}
                title="excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {variacoes.length > 0 && (
        <div className="grid gap-1 pl-2">
          {variacoes.map((v: any) => (
            <VariacaoRow key={v.id} variacao={v} campoSlug={campo.slug} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────── Variação ────────── */
function VariacaoRow({ variacao, campoSlug }: { variacao: any; campoSlug: string }) {
  const updateVar = useUpdateVariacao();
  const deleteVar = useDeleteVariacao();
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(variacao.nome);
  const [preco, setPreco] = useState<number>(Number(variacao.preco_adicional) || 0);

  const [relOpen, setRelOpen] = useState(false);
  const [relJson, setRelJson] = useState<string>(
    JSON.stringify(variacao.relacionamento || {}, null, 2),
  );

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
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRelOpen(true)} title="editar relacionamento">
            <Link2 className="h-3.5 w-3.5" />
          </Button>
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

      <Dialog open={relOpen} onOpenChange={setRelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Relacionamento — {variacao.nome}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Define quais valores de outros campos ficam permitidos quando esta variação for escolhida.
              Formato JSON: <code className="text-[10px]">{'{"campo_slug": ["valor1", "valor2"]}'}</code>.
              Ex.: se "{variacao.nome}" está em <code>{campoSlug}</code> e você quer limitar cores compatíveis,
              use <code>{'{"cor_couro_cano": ["Preto","Marrom"]}'}</code>.
            </p>
          </DialogHeader>
          <Textarea
            rows={10}
            value={relJson}
            onChange={e => setRelJson(e.target.value)}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelOpen(false)}>cancelar</Button>
            <Button onClick={async () => {
              try {
                const parsed = relJson.trim() ? JSON.parse(relJson) : {};
                await updateVar.mutateAsync({ id: variacao.id, relacionamento: parsed });
                toast.success('Relacionamento salvo');
                setRelOpen(false);
              } catch (err: any) {
                toast.error('JSON inválido: ' + err.message);
              }
            }}>salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
