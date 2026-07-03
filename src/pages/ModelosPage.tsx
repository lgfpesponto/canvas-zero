import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ImageOff, ShoppingCart } from 'lucide-react';
import { isDriveUrl, toDriveImageUrl } from '@/lib/driveUrl';
import { maskPhoneBR } from '@/lib/whatsappSend';
import { toast } from 'sonner';

type Tipo = 'bota' | 'cinto';

interface ModeloRow {
  id: string;
  nome: string;
  form_data: Record<string, any>;
  foto_url: string | null;
  tipo: Tipo;
  created_at: string;
}

interface EditComprarState {
  templateId: string;
  overrides?: {
    cliente?: string; clienteWhatsapp?: string; tamanho?: string;
    vendedor?: string; observacao?: string;
    sobMedida?: boolean; sobMedidaDesc?: string;
  };
}

const ALL_TIPOS: Tipo[] = ['bota', 'cinto'];

// Chaves de identificação por tipo
const IDENT_KEYS_BOTA = ['cliente', 'tamanho', 'clienteWhatsapp', 'vendedor', 'observacao', 'sobMedida'] as const;
const IDENT_KEYS_CINTO = ['cliente', 'tamanho', 'clienteWhatsapp', 'vendedor', 'observacao'] as const;

const KEY_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  tamanho: 'Tamanho',
  clienteWhatsapp: 'WhatsApp do Cliente',
  vendedor: 'Vendedor',
  observacao: 'Observação',
  sobMedida: 'Sob Medida',
};

function isEmpty(v: any): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'boolean') return v === false;
  return String(v).trim() === '';
}

function TemplateCard({ modelo, onComprar }: { modelo: ModeloRow; onComprar: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = modelo.foto_url
    ? (isDriveUrl(modelo.foto_url) ? toDriveImageUrl(modelo.foto_url) : modelo.foto_url)
    : null;

  return (
    <div className="bg-muted rounded-lg overflow-hidden border border-border flex flex-col">
      <div className="w-full h-56 bg-background relative flex items-center justify-center overflow-hidden">
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={modelo.nome}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <ImageOff size={28} />
            <span className="text-xs mt-1">Sem foto</span>
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-[10px] uppercase tracking-wide"
        >
          {modelo.tipo}
        </Badge>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <span
          className="font-semibold text-sm text-foreground text-center line-clamp-2 leading-tight"
          title={modelo.nome}
        >
          {modelo.nome}
        </span>
        <Button size="sm" onClick={onComprar} className="w-full">
          <ShoppingCart size={14} className="mr-1" /> Comprar
        </Button>
      </div>
    </div>
  );
}

const ModelosPage = () => {
  const { isLoggedIn, user, role, isAdmin, allProfiles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editState = (location.state as any)?.editComprar as EditComprarState | undefined;

  const [modelos, setModelos] = useState<ModeloRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tiposAtivos, setTiposAtivos] = useState<Tipo[]>([...ALL_TIPOS]);

  const [comprarOpen, setComprarOpen] = useState(false);
  const [comprarModelo, setComprarModelo] = useState<ModeloRow | null>(null);

  // valores da etapa A
  const [vCliente, setVCliente] = useState('');
  const [vTamanho, setVTamanho] = useState('');
  const [vWhats, setVWhats] = useState('');
  const [vVendedor, setVVendedor] = useState('');
  const [vObs, setVObs] = useState('');
  const [vSobMedida, setVSobMedida] = useState(false);
  const [vSobMedidaDesc, setVSobMedidaDesc] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_templates')
        .select('id, nome, form_data, foto_url, tipo, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        toast.error('Erro ao carregar modelos');
        console.error(error);
      }
      setModelos(((data as any[]) || []).map(r => ({
        ...r,
        tipo: (r.tipo === 'cinto' ? 'cinto' : 'bota') as Tipo,
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  // Reabrir dialog quando voltar do espelho via "Editar"
  useEffect(() => {
    if (!editState || modelos.length === 0) return;
    const m = modelos.find(x => x.id === editState.templateId);
    if (!m) return;
    openComprar(m, editState.overrides);
    // Limpa o state para não reabrir em navegações futuras
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editState, modelos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modelos.filter(m => {
      if (tiposAtivos.length > 0 && !tiposAtivos.includes(m.tipo)) return false;
      if (q && !m.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [modelos, search, tiposAtivos]);

  const toggleTipo = (t: Tipo) => {
    setTiposAtivos(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  };

  function openComprar(m: ModeloRow, prefill?: EditComprarState['overrides']) {
    setComprarModelo(m);
    const fd = m.form_data || {};
    // Valores existentes no modelo + overrides já preenchidos (edição)
    setVCliente(prefill?.cliente ?? (fd.cliente || ''));
    setVTamanho(prefill?.tamanho ?? (fd.tamanho || ''));
    setVWhats(prefill?.clienteWhatsapp ?? (fd.clienteWhatsapp || ''));
    setVVendedor(prefill?.vendedor ?? (fd.vendedor || (isAdmin ? '' : (user?.nomeCompleto || ''))));
    setVObs(prefill?.observacao ?? (fd.observacao || ''));
    setVSobMedida(prefill?.sobMedida ?? (fd.sobMedida === 'true' || fd.sobMedida === true));
    setVSobMedidaDesc(prefill?.sobMedidaDesc ?? (fd.sobMedidaDesc || ''));
    setComprarOpen(true);
  }

  function closeComprar() {
    setComprarOpen(false);
    setComprarModelo(null);
  }

  function missingFieldsFor(m: ModeloRow): string[] {
    const fd = m.form_data || {};
    const base: string[] = m.tipo === 'cinto' ? [...IDENT_KEYS_CINTO] : [...IDENT_KEYS_BOTA];
    return base.filter(k => {
      if (k === 'vendedor' && !isAdmin) return false; // vendedor comum usa o próprio nome
      if (k === 'sobMedida') return isEmpty(fd.sobMedida);
      return isEmpty(fd[k]);
    });
  }

  function handleConferir() {
    if (!comprarModelo) return;
    const missing = missingFieldsFor(comprarModelo);
    // Validação básica
    if (missing.includes('cliente') && !vCliente.trim()) {
      toast.error('Preencha o Cliente'); return;
    }
    if (missing.includes('tamanho') && !vTamanho.trim()) {
      toast.error('Preencha o Tamanho'); return;
    }
    if (missing.includes('vendedor') && !vVendedor.trim()) {
      toast.error('Selecione o Vendedor'); return;
    }
    const overrides: EditComprarState['overrides'] = {};
    if (missing.includes('cliente')) overrides.cliente = vCliente.trim();
    if (missing.includes('clienteWhatsapp')) overrides.clienteWhatsapp = vWhats.trim();
    if (missing.includes('tamanho')) overrides.tamanho = vTamanho.trim();
    if (missing.includes('vendedor')) overrides.vendedor = vVendedor.trim();
    if (missing.includes('observacao')) overrides.observacao = vObs.trim();
    if (missing.includes('sobMedida')) {
      overrides.sobMedida = vSobMedida;
      if (vSobMedida) overrides.sobMedidaDesc = vSobMedidaDesc.trim();
    }
    const dest = comprarModelo.tipo === 'cinto' ? '/pedido-cinto' : '/pedido';
    navigate(dest, {
      state: { comprarModelo: { templateId: comprarModelo.id, overrides } },
    });
  }

  if (authLoading) return <div className="min-h-[60vh]" />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role === 'bordado' || role === 'montagem' || role === 'admin_producao') {
    return <Navigate to="/" replace />;
  }

  const currentMissing = comprarModelo ? missingFieldsFor(comprarModelo) : [];
  const vendedoresOptions = (allProfiles || []).map(p => p.nome_completo).filter(Boolean);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Modelos</h1>
        <span className="text-sm text-muted-foreground">
          {loading ? 'Carregando…' : `${filtered.length} modelo${filtered.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <Input
          placeholder="Buscar por nome do modelo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          {ALL_TIPOS.map(t => {
            const active = tiposAtivos.includes(t);
            return (
              <Button
                key={t}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleTipo(t)}
                className="capitalize"
              >
                {t}
              </Button>
            );
          })}
        </div>
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {modelos.length === 0
            ? 'Você ainda não tem modelos salvos. Crie um em Faça seu Pedido ou Pedido de Cinto.'
            : 'Nenhum modelo encontrado com esses filtros.'}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(m => (
            <TemplateCard key={m.id} modelo={m} onComprar={() => openComprar(m)} />
          ))}
        </div>
      )}

      <Dialog open={comprarOpen} onOpenChange={o => (o ? setComprarOpen(true) : closeComprar())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comprar — {comprarModelo?.nome}</DialogTitle>
          </DialogHeader>

          {comprarModelo && (
            <>
              {currentMissing.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Este modelo já tem todos os dados de identificação. Basta conferir e finalizar.
                </p>
              )}

              <div className="space-y-3">
                {currentMissing.includes('cliente') && (
                  <div>
                    <Label>Cliente *</Label>
                    <Input value={vCliente} onChange={e => setVCliente(e.target.value)} />
                  </div>
                )}
                {currentMissing.includes('tamanho') && (
                  <div>
                    <Label>Tamanho *</Label>
                    <Input value={vTamanho} onChange={e => setVTamanho(e.target.value)} />
                  </div>
                )}
                {currentMissing.includes('clienteWhatsapp') && (
                  <div>
                    <Label>WhatsApp do Cliente</Label>
                    <Input
                      value={vWhats}
                      onChange={e => setVWhats(maskPhoneBR(e.target.value))}
                      placeholder="(11) 91234-5678"
                    />
                  </div>
                )}
                {currentMissing.includes('vendedor') && (
                  <div>
                    <Label>Vendedor *</Label>
                    <select
                      value={vVendedor}
                      onChange={e => setVVendedor(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none"
                    >
                      <option value="">Selecione…</option>
                      {vendedoresOptions.map(nome => (
                        <option key={nome} value={nome}>{nome}</option>
                      ))}
                    </select>
                  </div>
                )}
                {currentMissing.includes('observacao') && (
                  <div>
                    <Label>Observação</Label>
                    <Textarea value={vObs} onChange={e => setVObs(e.target.value)} rows={2} />
                  </div>
                )}
                {currentMissing.includes('sobMedida') && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={vSobMedida} onCheckedChange={v => setVSobMedida(!!v)} />
                      Sob medida
                    </label>
                    {vSobMedida && (
                      <Input
                        value={vSobMedidaDesc}
                        onChange={e => setVSobMedidaDesc(e.target.value)}
                        placeholder="Detalhes da medida"
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeComprar}>Cancelar</Button>
            <Button onClick={handleConferir}>Conferir e finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModelosPage;
