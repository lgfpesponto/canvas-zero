import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ImageOff, ShoppingCart, Grid3X3, Eye, Filter } from 'lucide-react';
import FichaFiltersDialog from '@/components/common/FichaFiltersDialog';
import { buildFichaOptions, matchesFichaFilters, countActiveFicha, useFichaFilterKeys } from '@/lib/fichaFilterKeys';
import { isDriveUrl, toDriveImageUrl } from '@/lib/driveUrl';
import { maskPhoneBR } from '@/lib/whatsappSend';
import { TAMANHOS } from '@/lib/orderFieldsConfig';
import GradeEstoque, { GradeItem } from '@/components/GradeEstoque';
import OrderPage from '@/pages/OrderPage';
import BeltOrderPage from '@/pages/BeltOrderPage';
import { toast } from 'sonner';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { useTemplatesValidity, type TemplateValidity } from '@/hooks/useTemplateValidity';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Tipo = 'bota' | 'cinto';

interface ModeloRow {
  id: string;
  nome: string;
  form_data: Record<string, any>;
  foto_url: string | null;
  genero: string | null;
  tipo: Tipo;
  sku: string | null;
  tamanhos_skus: { tamanho: string; sku: string }[] | null;
  created_at: string;
}

interface EditComprarState {
  templateId: string;
  overrides?: {
    numeroPedido?: string;
    cliente?: string; clienteWhatsapp?: string; tamanho?: string;
    vendedor?: string; observacao?: string;
    sobMedida?: boolean; sobMedidaDesc?: string;
    gradeItems?: GradeItem[];
  };
}

const ALL_TIPOS: Tipo[] = ['bota', 'cinto'];

const JULIANA = 'Juliana Cristina Ribeiro';
const RANCHO = 'Rancho Chique';

function isEmpty(v: any): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'boolean') return v === false;
  return String(v).trim() === '';
}

function TemplateCard({ modelo, validity, onComprar, onVisualizar }: { modelo: ModeloRow; validity?: TemplateValidity; onComprar: () => void; onVisualizar: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = modelo.foto_url
    ? (isDriveUrl(modelo.foto_url) ? toDriveImageUrl(modelo.foto_url) : modelo.foto_url)
    : null;
  const invalid = validity && !validity.valid;
  const removedText = invalid
    ? validity!.removed.map(r => `${r.campo}: "${r.valor}"`).join('\n')
    : '';

  return (
    <div className="bg-muted rounded-lg overflow-hidden border border-border flex flex-col">
      <div className="w-full h-40 sm:h-48 lg:h-56 bg-background relative flex items-center justify-center overflow-hidden">
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
          className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 text-[9px] sm:text-[10px] px-1.5 py-0 uppercase tracking-wide"
        >
          {modelo.tipo}
        </Badge>
      </div>
      <div className="p-2 sm:p-3 flex flex-col gap-2">
        <span
          className="font-semibold text-xs sm:text-sm text-foreground text-center line-clamp-2 leading-tight"
          title={modelo.nome}
        >
          {modelo.nome}
        </span>
        {invalid && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="w-full justify-center gap-1 text-[10px] cursor-help">
                  <AlertTriangle size={11} /> variação excluída, entre para editar
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-xs">
                {removedText}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            onClick={onComprar}
            disabled={invalid}
            title={invalid ? 'Variação excluída — abra a ficha para corrigir' : undefined}
            className="flex-1 text-xs sm:text-sm"
          >
            <ShoppingCart size={14} className="mr-1" /> Comprar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onVisualizar}
            className="h-9 w-9 p-0 shrink-0"
            title="Visualizar modelo"
            aria-label="Visualizar modelo"
          >
            <Eye size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

const ModelosPage = () => {
  const { isLoggedIn, user, role, isAdmin, allProfiles, loading: authLoading } = useAuth();
  const isAdminProducao = role === 'admin_producao';

  const [modelos, setModelos] = useState<ModeloRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tiposAtivos, setTiposAtivos] = useState<Tipo[]>([...ALL_TIPOS]);
  const [selFicha, setSelFicha] = useState<Record<string, Set<string>>>({});
  const [fichaFilterOpen, setFichaFilterOpen] = useState(false);

  const [comprarOpen, setComprarOpen] = useState(false);
  const [comprarModelo, setComprarModelo] = useState<ModeloRow | null>(null);

  const [visualizarOpen, setVisualizarOpen] = useState(false);
  const [visualizarModelo, setVisualizarModelo] = useState<ModeloRow | null>(null);
  const [visualizarImgErr, setVisualizarImgErr] = useState(false);

  // Campos do formulário
  const [vNumeroPedido, setVNumeroPedido] = useState('');
  const { isDuplicate: numeroDuplicado, checking: numeroChecking } = useCheckDuplicateOrder(vNumeroPedido.trim());
  const [vVendedor, setVVendedor] = useState('');
  const [vCliente, setVCliente] = useState('');
  const [vWhats, setVWhats] = useState('');
  const [vTamanho, setVTamanho] = useState('');
  const [vObs, setVObs] = useState('');
  const [vSobMedida, setVSobMedida] = useState(false);
  const [vSobMedidaDesc, setVSobMedidaDesc] = useState('');
  const [vGradeItems, setVGradeItems] = useState<GradeItem[]>([]);
  const [showGrade, setShowGrade] = useState(false);

  // Fluxo Comprar embarcado: espelho abre em cima de /modelos.
  const [espelhoOpen, setEspelhoOpen] = useState(false);
  const [espelhoOverrides, setEspelhoOverrides] = useState<EditComprarState['overrides'] | null>(null);
  const espelhoTipo: Tipo | null = comprarModelo?.tipo ?? null;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_templates')
        .select('id, nome, form_data, foto_url, genero, tipo, sku, tamanhos_skus, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        toast.error('Erro ao carregar modelos');
        console.error(error);
      }
      // Só entram modelos "completos": precisam ter foto_url e genero preenchidos.
      const completos = ((data as any[]) || []).filter(r => {
        const foto = (r.foto_url ?? '').toString().trim();
        const genero = (r.genero ?? '').toString().trim();
        const generoFallback = ((r.form_data ?? {}).genero ?? '').toString().trim();
        return !!foto && !!(genero || generoFallback);
      });
      setModelos(completos.map(r => ({
        ...r,
        tipo: (r.tipo === 'cinto' ? 'cinto' : 'bota') as Tipo,
        tamanhos_skus: Array.isArray(r.tamanhos_skus) ? r.tamanhos_skus : [],
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  const fichaKeys = useFichaFilterKeys(['bota', 'cinto']);
  const fichaOptions = useMemo(
    () => buildFichaOptions(
      modelos,
      m => ({ ...(m.form_data || {}), genero: (m.form_data?.genero ?? m.genero) as string | undefined }),
      fichaKeys,
    ),
    [modelos, fichaKeys],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modelos.filter(m => {
      if (tiposAtivos.length > 0 && !tiposAtivos.includes(m.tipo)) return false;
      if (q && !m.nome.toLowerCase().includes(q)) return false;
      const snap = { ...(m.form_data || {}), genero: (m.form_data?.genero ?? m.genero) };
      if (!matchesFichaFilters(snap, selFicha, fichaKeys)) return false;
      return true;
    });
  }, [modelos, search, tiposAtivos, selFicha]);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, tiposAtivos, selFicha]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // Validade contra a versão vigente da ficha (por tipo).
  const botas = useMemo(() => paginated.filter(m => m.tipo === 'bota'), [paginated]);
  const cintos = useMemo(() => paginated.filter(m => m.tipo === 'cinto'), [paginated]);
  const validityBota = useTemplatesValidity(botas, 'bota');
  const validityCinto = useTemplatesValidity(cintos, 'cinto');

  const toggleTipo = (t: Tipo) => {
    setTiposAtivos(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  };

  const toggleFicha = (k: string, v: string) => {
    setSelFicha(prev => {
      const cur = new Set(prev[k] || []);
      if (cur.has(v)) cur.delete(v); else cur.add(v);
      return { ...prev, [k]: cur };
    });
  };
  const activeFichaCount = countActiveFicha(selFicha);

  function defaultVendedor(fd: Record<string, any>): string {
    if (isAdmin) return fd.vendedor || '';
    return user?.nomeCompleto || '';
  }

  function openComprar(m: ModeloRow, prefill?: EditComprarState['overrides']) {
    setComprarModelo(m);
    const fd = m.form_data || {};
    setVNumeroPedido(prefill?.numeroPedido ?? '');
    setVVendedor(prefill?.vendedor ?? defaultVendedor(fd));
    setVCliente(prefill?.cliente ?? (fd.cliente || ''));
    setVWhats(prefill?.clienteWhatsapp ?? (fd.clienteWhatsapp || ''));
    setVTamanho(prefill?.tamanho ?? (fd.tamanho || ''));
    setVObs(prefill?.observacao ?? (fd.observacao || ''));
    setVSobMedida(prefill?.sobMedida ?? (fd.sobMedida === 'true' || fd.sobMedida === true));
    setVSobMedidaDesc(prefill?.sobMedidaDesc ?? (fd.sobMedidaDesc || ''));
    setVGradeItems(prefill?.gradeItems ?? []);
    setComprarOpen(true);
  }

  function closeComprar() {
    setComprarOpen(false);
    setComprarModelo(null);
    setVGradeItems([]);
    setEspelhoOpen(false);
    setEspelhoOverrides(null);
  }

  // Tamanhos disponíveis para o modelo — vem do cadastro do modelo (tamanhos_skus).
  const tamanhosDoModelo = useMemo<string[]>(() => {
    if (!comprarModelo) return [];
    const list = (comprarModelo.tamanhos_skus || [])
      .map(t => (t.tamanho || '').trim())
      .filter(Boolean);
    return list.length > 0 ? list : TAMANHOS;
  }, [comprarModelo]);

  const showWhatsapp = vVendedor === JULIANA || vVendedor === RANCHO;
  const clienteObrigatorio = vVendedor === JULIANA;
  const modeloJaTemSobMedida = comprarModelo
    ? !isEmpty((comprarModelo.form_data || {}).sobMedida)
    : true;
  // Grade: mesma regra do OrderPage — admin com Estoque/Juliana OU vendedor comum (não bordado/montagem/admin_producao)
  const isVendedorComum = !isAdmin && role !== 'bordado' && role !== 'montagem';
  const podeGerarGrade = comprarModelo?.tipo === 'bota' && (
    (isAdmin && (vVendedor === 'Estoque' || vVendedor === JULIANA)) || isVendedorComum
  );

  function handleConferir() {
    if (!comprarModelo) return;
    if (!vNumeroPedido.trim()) { toast.error('Informe o Número do pedido'); return; }
    if (numeroDuplicado) { toast.error(DUPLICATE_MSG); return; }
    if (numeroChecking) { toast.info('Verificando número do pedido...'); return; }
    if (!vVendedor.trim()) { toast.error('Selecione o Vendedor'); return; }
    if (clienteObrigatorio && !vCliente.trim()) { toast.error('Cliente é obrigatório para Juliana'); return; }
    if (vGradeItems.length === 0 && !vTamanho.trim()) { toast.error('Selecione o Tamanho ou gere uma Grade'); return; }

    const overrides: EditComprarState['overrides'] = {
      numeroPedido: vNumeroPedido.trim(),
      vendedor: vVendedor.trim(),
      cliente: vCliente.trim(),
      observacao: vObs.trim(),
    };
    if (showWhatsapp) overrides.clienteWhatsapp = vWhats.trim();
    if (vGradeItems.length > 0) {
      overrides.gradeItems = vGradeItems;
    } else {
      overrides.tamanho = vTamanho.trim();
    }
    if (!modeloJaTemSobMedida) {
      overrides.sobMedida = vSobMedida;
      if (vSobMedida) overrides.sobMedidaDesc = vSobMedidaDesc.trim();
    }
    setEspelhoOverrides(overrides);
    setEspelhoOpen(true);
    setComprarOpen(false); // fecha modal de identificação; dados ficam preservados em state
  }

  if (authLoading) return <div className="min-h-[60vh]" />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role === 'bordado' || role === 'montagem') {
    return <Navigate to="/" replace />;
  }

  const vendedoresOptions = (allProfiles || [])
    .map((p: any) => p.nomeCompleto || p.nome_completo)
    .filter(Boolean);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Modelos</h1>
        <span className="text-sm text-muted-foreground">
          {loading
            ? 'Carregando…'
            : `${filtered.length} modelo${filtered.length === 1 ? '' : 's'}${totalPages > 1 ? ` — página ${currentPage} de ${totalPages}` : ''}`}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFichaFilterOpen(true)}
            className="gap-1"
          >
            <Filter size={14} /> Filtros da ficha
            {activeFichaCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeFichaCount}</Badge>
            )}
          </Button>
        </div>
      </div>

      <FichaFiltersDialog
        open={fichaFilterOpen}
        onOpenChange={setFichaFilterOpen}
        fichaOptions={fichaOptions}
        selFicha={selFicha}
        onToggle={toggleFicha}
        onClear={() => setSelFicha({})}
        keys={fichaKeys}
      />


      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {modelos.length === 0
            ? 'Você ainda não tem modelos salvos. Crie um em Faça seu Pedido ou Pedido de Cinto.'
            : 'Nenhum modelo encontrado com esses filtros.'}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {paginated.map(m => (
            <TemplateCard
              key={m.id}
              modelo={m}
              validity={(m.tipo === 'bota' ? validityBota : validityCinto).get(m.id)}
              onComprar={() => openComprar(m)}
              onVisualizar={() => { setVisualizarModelo(m); setVisualizarImgErr(false); setVisualizarOpen(true); }}
            />
          ))}
        </div>
      )}

      <Dialog open={visualizarOpen} onOpenChange={setVisualizarOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {visualizarModelo && (() => {
            const src = visualizarModelo.foto_url
              ? (isDriveUrl(visualizarModelo.foto_url) ? toDriveImageUrl(visualizarModelo.foto_url) : visualizarModelo.foto_url)
              : null;
            return (
              <div className="space-y-4">
                <div className="w-full aspect-square sm:aspect-[4/3] bg-background rounded-lg overflow-hidden flex items-center justify-center">
                  {src && !visualizarImgErr ? (
                    <img
                      src={src}
                      alt={visualizarModelo.nome}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={() => setVisualizarImgErr(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageOff size={48} />
                      <span className="text-sm mt-2">Sem foto</span>
                    </div>
                  )}
                </div>
                <DialogTitle className="text-center text-base sm:text-lg font-semibold break-words">
                  {visualizarModelo.nome}
                </DialogTitle>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <Button
              key={n}
              type="button"
              variant={n === currentPage ? 'default' : 'outline'}
              size="sm"
              className="min-w-9"
              onClick={() => setPage(n)}
            >
              {n}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      )}

      <Dialog open={comprarOpen} onOpenChange={o => (o ? setComprarOpen(true) : closeComprar())}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprar — {comprarModelo?.nome}</DialogTitle>
          </DialogHeader>

          {comprarModelo && (
            <div className="space-y-3">
              {/* 1. Número do pedido */}
              <div>
                <Label>Número do pedido *</Label>
                <Input
                  value={vNumeroPedido}
                  onChange={e => setVNumeroPedido(e.target.value)}
                  placeholder="Digite o número"
                  className={numeroDuplicado ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {numeroChecking && vNumeroPedido.trim() && (
                  <p className="text-xs text-muted-foreground mt-1">Verificando...</p>
                )}
                {numeroDuplicado && (
                  <p className="text-xs text-destructive mt-1">{DUPLICATE_MSG}</p>
                )}
              </div>

              {/* 2. Vendedor */}
              <div>
                <Label>Vendedor *</Label>
                {isAdmin ? (
                  <select
                    value={vVendedor}
                    onChange={e => setVVendedor(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none"
                  >
                    {isAdminProducao && <option value="">Selecione um vendedor</option>}
                    {!isAdminProducao && <option value="">Selecione…</option>}
                    {vendedoresOptions.map(nome => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                    <option value="Estoque">Estoque</option>
                  </select>
                ) : (
                  <Input value={vVendedor} readOnly className="opacity-70 cursor-not-allowed" />
                )}
              </div>

              {/* 3. Cliente */}
              <div>
                <Label>
                  Cliente {clienteObrigatorio && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  value={vCliente}
                  onChange={e => setVCliente(e.target.value)}
                  placeholder={clienteObrigatorio ? 'Nome do cliente (obrigatório)' : 'Nome do cliente (opcional)'}
                />
              </div>

              {/* 4. WhatsApp — condicional */}
              {showWhatsapp && (
                <div>
                  <Label>WhatsApp do Cliente</Label>
                  <Input
                    value={vWhats}
                    onChange={e => setVWhats(maskPhoneBR(e.target.value))}
                    placeholder="(11) 91234-5678"
                  />
                </div>
              )}

              {/* 5. Tamanho / Grade */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Label className="mb-0">
                    {podeGerarGrade && vGradeItems.length > 0 ? 'Tamanho / Grade' : 'Tamanho'}
                    {vGradeItems.length === 0 && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {podeGerarGrade && vGradeItems.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!vNumeroPedido.trim()) { toast.error('Informe o Número do pedido antes de gerar a grade'); return; }
                        if (numeroDuplicado) { toast.error(DUPLICATE_MSG); return; }
                        setShowGrade(true);
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Grid3X3 size={12} /> Gerar Grade
                    </button>
                  )}
                </div>
                {vGradeItems.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowGrade(true)}
                    className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border hover:border-primary text-left flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <Grid3X3 size={14} className="text-primary" />
                      <span className="font-semibold">{vGradeItems.length} tam.</span>
                      <span className="text-muted-foreground">
                        ({vGradeItems.reduce((s, i) => s + i.quantidade, 0)} pedidos)
                      </span>
                    </span>
                    <span className="text-xs text-primary font-medium">Editar</span>
                  </button>
                ) : (
                  <select
                    value={vTamanho}
                    onChange={e => setVTamanho(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none"
                  >
                    <option value="">Selecione…</option>
                    {tamanhosDoModelo.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 6. Sob medida (apenas se o modelo não trouxe) */}
              {!modeloJaTemSobMedida && (
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

              {/* 7. Observação */}
              <div>
                <Label>Observação</Label>
                <Textarea value={vObs} onChange={e => setVObs(e.target.value)} rows={2} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeComprar}>Cancelar</Button>
            <Button onClick={handleConferir} disabled={numeroDuplicado || numeroChecking}>Conferir e finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showGrade && comprarModelo && (
        <GradeEstoque
          open={showGrade}
          onOpenChange={setShowGrade}
          initialItems={vGradeItems}
          numeroPedidoBase={vNumeroPedido.trim()}
          nomeProduto={comprarModelo.nome}
          suggestSkuBase={comprarModelo.sku || undefined}
          onConfirm={(items: GradeItem[]) => {
            setVGradeItems(items);
            setShowGrade(false);
            toast.success(`Grade definida: ${items.length} tamanhos, ${items.reduce((s, i) => s + i.quantidade, 0)} pedidos.`);
          }}
        />
      )}

      {/* Espelho embarcado: monta a página de pedido correspondente que abre o mirror por cima */}
      {espelhoOpen && comprarModelo && espelhoOverrides && (
        <div className="hidden-embed-root" aria-hidden="true">
          {espelhoTipo === 'cinto' ? (
            <BeltOrderPage
              comprarModeloOverride={{ templateId: comprarModelo.id, overrides: espelhoOverrides as any }}
              onComprarSaved={() => { closeComprar(); }}
              onComprarEditar={() => { setEspelhoOpen(false); setComprarOpen(true); }}
            />
          ) : (
            <OrderPage
              comprarModeloOverride={{ templateId: comprarModelo.id, overrides: espelhoOverrides }}
              onComprarSaved={() => { closeComprar(); }}
              onComprarEditar={() => { setEspelhoOpen(false); setComprarOpen(true); }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ModelosPage;
