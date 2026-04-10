import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFichaTipoBySlug, useFichaCampos } from '@/hooks/useAdminConfig';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatBrasiliaDate, formatBrasiliaTime } from '@/contexts/AuthContext';

interface CampoOpcao {
  label: string;
  preco_adicional: number;
}

export default function DynamicOrderPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const { data: tipo, isLoading: tipoLoading } = useFichaTipoBySlug(slug || '');
  const { data: campos, isLoading: camposLoading } = useFichaCampos(tipo?.id);

  // Native fields
  const [vendedor, setVendedor] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [precoBase, setPrecoBase] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [cliente, setCliente] = useState('');

  // Dynamic fields
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) setVendedor(user.nomeCompleto);
  }, [user]);

  useEffect(() => {
    if (!isLoggedIn && !tipoLoading) navigate('/login', { replace: true });
  }, [isLoggedIn, tipoLoading, navigate]);

  const activeCampos = useMemo(() => 
    campos?.filter(c => c.ativo !== false).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)) || [],
    [campos]
  );

  // Calculate total price including option surcharges
  const totalPreco = useMemo(() => {
    let total = precoBase;
    for (const campo of activeCampos) {
      if (!['selecao', 'multipla'].includes(campo.tipo)) continue;
      const opcoes: CampoOpcao[] = Array.isArray(campo.opcoes) ? campo.opcoes as any : [];
      const val = values[campo.slug];
      if (campo.tipo === 'selecao' && val) {
        const opt = opcoes.find(o => o.label === val);
        if (opt) total += opt.preco_adicional || 0;
      }
      if (campo.tipo === 'multipla' && Array.isArray(val)) {
        for (const v of val) {
          const opt = opcoes.find(o => o.label === v);
          if (opt) total += opt.preco_adicional || 0;
        }
      }
    }
    return total * quantidade;
  }, [precoBase, quantidade, values, activeCampos]);

  const updateValue = (slug: string, val: any) => {
    setValues(prev => ({ ...prev, [slug]: val }));
  };

  const handleSubmit = async () => {
    if (!user || !tipo) return;

    // Validate required fields
    for (const campo of activeCampos) {
      if (campo.obrigatorio && !values[campo.slug]) {
        toast.error(`O campo "${campo.nome}" é obrigatório`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const dataHoje = formatBrasiliaDate();
      const horaAgora = formatBrasiliaTime();

      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const numero = `7E-${dataHoje.slice(0, 4)}${String((count || 0) + 1).padStart(4, '0')}`;

      // Build snapshot with prices
      const snapshot: Record<string, any> = {};
      for (const campo of activeCampos) {
        const val = values[campo.slug];
        if (val !== undefined && val !== '' && val !== null) {
          snapshot[campo.slug] = val;
          // Include price snapshot for selecao/multipla
          if (['selecao', 'multipla'].includes(campo.tipo)) {
            const opcoes: CampoOpcao[] = Array.isArray(campo.opcoes) ? campo.opcoes as any : [];
            if (campo.tipo === 'selecao') {
              const opt = opcoes.find(o => o.label === val);
              if (opt) snapshot[`${campo.slug}_preco`] = opt.preco_adicional;
            }
            if (campo.tipo === 'multipla' && Array.isArray(val)) {
              snapshot[`${campo.slug}_precos`] = val.map(v => {
                const opt = opcoes.find(o => o.label === v);
                return { label: v, preco: opt?.preco_adicional || 0 };
              });
            }
          }
        }
      }

      const row = {
        numero,
        user_id: user.id,
        vendedor: vendedor || user.nomeCompleto,
        cliente,
        quantidade,
        preco: totalPreco / quantidade, // unit price
        data_criacao: dataHoje,
        hora_criacao: horaAgora,
        dias_restantes: 5,
        status: 'Em aberto',
        tipo_extra: slug,
        extra_detalhes: snapshot,
        historico: [{ data: dataHoje, hora: horaAgora, local: 'Em aberto', descricao: 'Pedido criado' }],
        alteracoes: [],
        observacao,
        // Required defaults for boot fields
        tamanho: '', modelo: '', solado: '', formato_bico: '',
        cor_vira: '', couro_gaspea: '', couro_cano: '', couro_taloneira: '',
        bordado_cano: '', bordado_gaspea: '', bordado_taloneira: '',
        personalizacao_nome: '', personalizacao_bordado: '',
        cor_linha: '', cor_borrachinha: '', trisce: 'Não', tiras: 'Não',
        metais: '', acessorios: '', desenvolvimento: '',
      };

      const { error } = await supabase.from('orders').insert(row);
      if (error) throw error;

      toast.success('Pedido criado com sucesso!');
      navigate('/relatorios');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (tipoLoading || camposLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tipo) {
    return (
      <div className="min-h-screen bg-background px-4 py-12 text-center">
        <p className="text-muted-foreground">Ficha não encontrada.</p>
        <Button variant="link" onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl"
      >
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> voltar
        </button>

        <h1 className="mb-6 font-montserrat text-2xl font-bold text-foreground lowercase">
          {tipo.nome.toLowerCase()}
        </h1>

        <Card>
          <CardContent className="space-y-5 p-6">
            {/* Native fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs lowercase">vendedor</Label>
                <Input value={vendedor} onChange={e => setVendedor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs lowercase">cliente</Label>
                <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs lowercase">quantidade</Label>
                <Input type="number" min={1} value={quantidade} onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs lowercase">preço unitário base (R$)</Label>
                <Input type="number" step="0.01" min={0} value={precoBase} onChange={e => setPrecoBase(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Dynamic fields */}
            {activeCampos.map(campo => (
              <DynamicField
                key={campo.id}
                campo={campo}
                value={values[campo.slug]}
                onChange={val => updateValue(campo.slug, val)}
              />
            ))}

            {/* Observação */}
            <div className="space-y-1">
              <Label className="text-xs lowercase">observação</Label>
              <Textarea rows={3} value={observacao} onChange={e => setObservacao(e.target.value)} />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <span className="text-sm font-medium text-muted-foreground">total</span>
              <span className="font-montserrat text-xl font-bold text-foreground">
                R$ {totalPreco.toFixed(2)}
              </span>
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {submitting ? 'Enviando...' : 'enviar pedido'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function DynamicField({ campo, value, onChange }: {
  campo: { nome: string; slug: string; tipo: string; obrigatorio: boolean; desc_condicional: boolean; opcoes: any };
  value: any;
  onChange: (val: any) => void;
}) {
  const opcoes: CampoOpcao[] = Array.isArray(campo.opcoes) ? campo.opcoes : [];
  const [descText, setDescText] = useState('');

  switch (campo.tipo) {
    case 'texto':
      return (
        <div className="space-y-1">
          <Label className="text-xs lowercase">
            {campo.nome} {campo.obrigatorio && <span className="text-destructive">*</span>}
          </Label>
          <Input value={value || ''} onChange={e => onChange(e.target.value)} />
        </div>
      );

    case 'selecao':
      return (
        <div className="space-y-1">
          <Label className="text-xs lowercase">
            {campo.nome} {campo.obrigatorio && <span className="text-destructive">*</span>}
          </Label>
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {opcoes.map(o => (
                <SelectItem key={o.label} value={o.label}>
                  {o.label} {o.preco_adicional ? `(+R$ ${o.preco_adicional.toFixed(2)})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'multipla':
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          <Label className="text-xs lowercase">
            {campo.nome} {campo.obrigatorio && <span className="text-destructive">*</span>}
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {opcoes.map(o => (
              <label key={o.label} className="flex items-center gap-2 rounded border border-border p-2 cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={selected.includes(o.label)}
                  onCheckedChange={checked => {
                    if (checked) onChange([...selected, o.label]);
                    else onChange(selected.filter(s => s !== o.label));
                  }}
                />
                <span className="text-sm">
                  {o.label} {o.preco_adicional ? `(+R$ ${o.preco_adicional.toFixed(2)})` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch checked={!!value} onCheckedChange={v => { onChange(v); if (!v) setDescText(''); }} />
            <Label className="text-xs lowercase">
              {campo.nome} {campo.obrigatorio && <span className="text-destructive">*</span>}
            </Label>
          </div>
          {campo.desc_condicional && value && (
            <Input
              placeholder="Descreva..."
              value={descText}
              onChange={e => {
                setDescText(e.target.value);
                onChange({ checked: true, descricao: e.target.value });
              }}
            />
          )}
        </div>
      );

    default:
      return null;
  }
}
