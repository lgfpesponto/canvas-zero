import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, Trash2, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCategoriaTipo, requiresPositivePrice, PRICE_REQUIRED_MESSAGE } from '@/lib/priceValidation';

interface CampoConfig {
  id: string;
  nome: string;
  slug: string;
  tipo: 'texto' | 'selecao' | 'multipla' | 'checkbox';
  obrigatorio: boolean;
  descCondicional: boolean;
  vinculo: string;
  opcoesRaw: string; // textarea raw
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

const CAMPOS_NATIVOS = ['número do pedido', 'vendedor', 'quantidade', 'preço'];

let idCounter = 0;
const newId = () => `tmp_${++idCounter}`;

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

export default function FichaBuilder({ open, onOpenChange, onCreated }: Props) {
  const [nome, setNome] = useState('');
  const [campos, setCampos] = useState<CampoConfig[]>([]);
  const [saving, setSaving] = useState(false);

  const addCampo = () => {
    setCampos(prev => [...prev, {
      id: newId(),
      nome: '',
      slug: '',
      tipo: 'texto',
      obrigatorio: false,
      descCondicional: false,
      vinculo: '',
      opcoesRaw: '',
    }]);
  };

  const updateCampo = (id: string, patch: Partial<CampoConfig>) => {
    setCampos(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...patch };
      if (patch.nome !== undefined) updated.slug = slugify(patch.nome);
      return updated;
    }));
  };

  const removeCampo = (id: string) => {
    setCampos(prev => prev.filter(c => c.id !== id));
  };

  const parseOpcoes = (raw: string) => {
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      const preco = parts[1] ? parseFloat(parts[1].replace(',', '.')) : 0;
      return { label: parts[0], preco_adicional: isNaN(preco) ? 0 : preco };
    });
  };

  const handleCreate = async () => {
    if (!nome.trim()) { toast.error('Informe o nome da ficha'); return; }
    const fichaSlug = slugify(nome);
    if (!fichaSlug) { toast.error('Nome inválido'); return; }

    // Validate campos
    for (const c of campos) {
      if (!c.nome.trim()) { toast.error('Todos os campos precisam de um nome'); return; }
      if (['selecao', 'multipla'].includes(c.tipo) && !c.opcoesRaw.trim()) {
        toast.error(`O campo "${c.nome}" precisa de opções`); return;
      }
      // Modelo/Bordado: bloqueia opções sem preço (exceto "Sem bordado")
      const tipoCategoria = getCategoriaTipo(c.slug || c.nome);
      if (tipoCategoria !== 'outro' && ['selecao', 'multipla'].includes(c.tipo)) {
        const opcoes = parseOpcoes(c.opcoesRaw);
        const invalid = opcoes.filter(o => requiresPositivePrice(c.slug || c.nome, o.label) && (!o.preco_adicional || o.preco_adicional <= 0));
        if (invalid.length > 0) {
          toast.error(`${PRICE_REQUIRED_MESSAGE} Campo "${c.nome}" — sem preço: ${invalid.slice(0, 3).map(i => `"${i.label}"`).join(', ')}${invalid.length > 3 ? '…' : ''}`, { duration: 8000 });
          return;
        }
      }
    }

    setSaving(true);
    try {
      // 1. Create ficha_tipo
      const { data: tipoData, error: tipoErr } = await supabase
        .from('ficha_tipos')
        .insert({ nome: nome.trim(), slug: fichaSlug, tipo_ficha: 'dinamica', campos_nativos: true } as any)
        .select('id')
        .single();
      if (tipoErr) throw tipoErr;
      const tipoId = tipoData.id;

      // 2. Insert campos
      if (campos.length > 0) {
        const camposRows = campos.map((c, i) => ({
          ficha_tipo_id: tipoId,
          nome: c.nome.trim(),
          slug: c.slug || slugify(c.nome),
          tipo: c.tipo,
          obrigatorio: c.obrigatorio,
          ordem: i + 1,
          opcoes: ['selecao', 'multipla'].includes(c.tipo) ? parseOpcoes(c.opcoesRaw) : [],
          vinculo: c.vinculo || null,
          desc_condicional: c.descCondicional,
        }));
        const { error: camposErr } = await supabase.from('ficha_campos').insert(camposRows);
        if (camposErr) throw camposErr;
      }

      // 3. Create default workflow (all etapas active)
      const { data: etapas } = await supabase.from('status_etapas').select('id');
      if (etapas && etapas.length > 0) {
        const wfRows = etapas.map(e => ({
          ficha_tipo_id: tipoId,
          etapa_id: e.id,
          ativo: true,
        }));
        await supabase.from('ficha_workflow').insert(wfRows);
      }

      toast.success(`Ficha "${nome}" criada com sucesso!`);
      setNome('');
      setCampos([]);
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao criar ficha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-montserrat lowercase">criar nova ficha</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label className="lowercase">nome da ficha</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Sandália, Chinelo..."
            />
          </div>

          {/* Campos nativos */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground lowercase">campos nativos (incluídos automaticamente)</Label>
            <div className="flex flex-wrap gap-2">
              {CAMPOS_NATIVOS.map(c => (
                <Badge key={c} variant="secondary" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" /> {c}
                </Badge>
              ))}
            </div>
          </div>

          {/* Campos dinâmicos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="lowercase">campos personalizados</Label>
              <Button size="sm" variant="outline" onClick={addCampo} className="gap-1">
                <Plus className="h-4 w-4" /> adicionar campo
              </Button>
            </div>

            <AnimatePresence>
              {campos.map((campo, i) => (
                <motion.div
                  key={campo.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">campo {i + 1}</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeCampo(campo.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs lowercase">nome</Label>
                      <Input
                        value={campo.nome}
                        onChange={e => updateCampo(campo.id, { nome: e.target.value })}
                        placeholder="Ex: Cor principal"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs lowercase">tipo</Label>
                      <Select value={campo.tipo} onValueChange={v => updateCampo(campo.id, { tipo: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_CAMPO.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={campo.obrigatorio}
                        onCheckedChange={v => updateCampo(campo.id, { obrigatorio: v })}
                      />
                      <Label className="text-xs lowercase">obrigatório</Label>
                    </div>
                    {campo.tipo === 'checkbox' && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={campo.descCondicional}
                          onCheckedChange={v => updateCampo(campo.id, { descCondicional: v })}
                        />
                        <Label className="text-xs lowercase">descrição condicional</Label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs lowercase">vínculo</Label>
                    <Select value={campo.vinculo} onValueChange={v => updateCampo(campo.id, { vinculo: v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        {VINCULOS.map(v => (
                          <SelectItem key={v.value} value={v.value || 'none'}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {['selecao', 'multipla'].includes(campo.tipo) && (
                    <div className="space-y-1">
                      <Label className="text-xs lowercase">opções (Nome | Preço, uma por linha)</Label>
                      <Textarea
                        rows={4}
                        value={campo.opcoesRaw}
                        onChange={e => updateCampo(campo.id, { opcoesRaw: e.target.value })}
                        placeholder={'Opção A | 10.00\nOpção B | 0\nOpção C'}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {campos.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum campo personalizado adicionado ainda.
              </p>
            )}
          </div>

          {/* Submit */}
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? 'Criando...' : 'criar ficha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
