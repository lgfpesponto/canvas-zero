import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, formatBrasiliaDate, formatBrasiliaTime } from '@/contexts/AuthContext';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { saveDraft, deleteDraft } from '@/lib/drafts';
import { supabase } from '@/integrations/supabase/client';
import { Link2, X, Eye, Image as ImageIcon, Plus, List, Trash2, Pencil, Check, Send, Inbox } from 'lucide-react';
import { FotoPedidoSidePanel } from '@/components/FotoPedidoSidePanel';
import { isHttpUrl } from '@/lib/driveUrl';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTemplateManagement } from '@/hooks/useTemplateManagement';
import SearchableSelect from '@/components/SearchableSelect';
import { TIPOS_COURO, CORES_COURO } from '@/lib/orderFieldsConfig';
import {
  BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO,
  FIVELA_OPTIONS,
} from '@/lib/extrasConfig';

const cls = {
  label: 'block text-sm font-semibold mb-1',
  select: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none',
  input: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none',
  inputSmall: 'bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none',
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-lg uppercase tracking-wide py-2 rounded-sm">{title}</h3>
    {children}
  </div>
);

const BeltOrderPage = () => {
  const { isLoggedIn, user, addOrder, isAdmin, allProfiles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const draftData = (location.state as any)?.draft;

  const isAdminUser = isAdmin;
  const tmpl = useTemplateManagement();
  const [mode, setMode] = useState<'order' | 'template'>('order');

  // Form state
  const isAdminProducao = user?.role === 'admin_producao';
  const [vendedor, setVendedor] = useState(isAdminProducao ? '' : (user?.nomeCompleto || ''));
  const [numeroPedido, setNumeroPedido] = useState('');
  const { isDuplicate: orderDuplicate } = useCheckDuplicateOrder(numeroPedido);
  const [cliente, setCliente] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [tipoCouro, setTipoCouro] = useState('');
  const [corCouro, setCorCouro] = useState('');

  // Bordado P
  const [bordadoP, setBordadoP] = useState(false);
  const [bordadoPDesc, setBordadoPDesc] = useState('');
  const [bordadoPCor, setBordadoPCor] = useState('');

  // Nome Bordado
  const [nomeBordado, setNomeBordado] = useState(false);
  const [nomeBordadoDesc, setNomeBordadoDesc] = useState('');
  const [nomeBordadoCor, setNomeBordadoCor] = useState('');
  const [nomeBordadoFonte, setNomeBordadoFonte] = useState('');

  // Carimbo
  const [carimbo, setCarimbo] = useState('');
  const [carimboDesc, setCarimboDesc] = useState('');
  const [carimboOnde, setCarimboOnde] = useState('');

  // Fivela
  const [fivela, setFivela] = useState('');
  const [fivelaOutroDesc, setFivelaOutroDesc] = useState('');

  // Adicional
  const [adicionalValor, setAdicionalValor] = useState('');
  const [adicionalDesc, setAdicionalDesc] = useState('');

  const [observacao, setObservacao] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [mostrarFotoPainel, setMostrarFotoPainel] = useState(false);
  const [showMirror, setShowMirror] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);

  // Load draft data
  useEffect(() => {
    if (draftData && !loadedDraftId) {
      const f = draftData.form || {};
      setVendedor(f.vendedor || user?.nomeCompleto || '');
      setNumeroPedido(draftData.numeroPedido || '');
      setCliente(f.cliente || '');
      setTamanho(f.tamanho || '');
      setTipoCouro(f.tipoCouro || '');
      setCorCouro(f.corCouro || '');
      setBordadoP(f.bordadoP === 'true');
      setBordadoPDesc(f.bordadoPDesc || '');
      setBordadoPCor(f.bordadoPCor || '');
      setNomeBordado(f.nomeBordado === 'true');
      setNomeBordadoDesc(f.nomeBordadoDesc || '');
      setNomeBordadoCor(f.nomeBordadoCor || '');
      setNomeBordadoFonte(f.nomeBordadoFonte || '');
      setCarimbo(f.carimbo || '');
      setCarimboDesc(f.carimboDesc || '');
      setCarimboOnde(f.carimboOnde || '');
      setFivela(f.fivela || '');
      setFivelaOutroDesc(f.fivelaOutroDesc || '');
      setAdicionalValor(f.adicionalValor || '');
      setAdicionalDesc(f.adicionalDesc || '');
      setObservacao(f.observacao || '');
      setFotoUrl(draftData.fotos?.[0] || '');
      setLoadedDraftId(draftData.id);
    }
  }, [draftData]);

  // ── templates: build/populate (form_data com flag __tipo='cinto') ──
  const buildBeltFormData = useCallback((): Record<string, string> => ({
    __tipo: 'cinto',
    tamanho, tipoCouro, corCouro,
    bordadoP: String(bordadoP), bordadoPDesc, bordadoPCor,
    nomeBordado: String(nomeBordado), nomeBordadoDesc, nomeBordadoCor, nomeBordadoFonte,
    carimbo, carimboDesc, carimboOnde,
    fivela, fivelaOutroDesc,
    adicionalValor, adicionalDesc,
    observacao,
  }), [tamanho, tipoCouro, corCouro, bordadoP, bordadoPDesc, bordadoPCor, nomeBordado, nomeBordadoDesc, nomeBordadoCor, nomeBordadoFonte, carimbo, carimboDesc, carimboOnde, fivela, fivelaOutroDesc, adicionalValor, adicionalDesc, observacao]);

  const populateFromTemplate = useCallback((fd: Record<string, string>) => {
    setTamanho(fd.tamanho || '');
    setTipoCouro(fd.tipoCouro || '');
    setCorCouro(fd.corCouro || '');
    setBordadoP(fd.bordadoP === 'true');
    setBordadoPDesc(fd.bordadoPDesc || '');
    setBordadoPCor(fd.bordadoPCor || '');
    setNomeBordado(fd.nomeBordado === 'true');
    setNomeBordadoDesc(fd.nomeBordadoDesc || '');
    setNomeBordadoCor(fd.nomeBordadoCor || '');
    setNomeBordadoFonte(fd.nomeBordadoFonte || '');
    setCarimbo(fd.carimbo || '');
    setCarimboDesc(fd.carimboDesc || '');
    setCarimboOnde(fd.carimboOnde || '');
    setFivela(fd.fivela || '');
    setFivelaOutroDesc(fd.fivelaOutroDesc || '');
    setAdicionalValor(fd.adicionalValor || '');
    setAdicionalDesc(fd.adicionalDesc || '');
    setObservacao(fd.observacao || '');
  }, []);

  // load templates on mount + toast detalhado de cintos transferidos
  const templatesLoadedRef = useRef(false);
  useEffect(() => {
    if (templatesLoadedRef.current || !user) return;
    templatesLoadedRef.current = true;
    (async () => {
      await tmpl.loadTemplates(user.id);
      const { data } = await supabase
        .from('order_templates')
        .select('sent_by_name, form_data')
        .eq('user_id', user.id)
        .eq('seen', false);
      const recebidos = ((data as any[]) || []).filter(t => (t.form_data as any)?.__tipo === 'cinto');
      if (recebidos.length > 0) {
        const counts = new Map<string, number>();
        recebidos.forEach(t => {
          const nome = t.sent_by_name || 'Usuário';
          counts.set(nome, (counts.get(nome) || 0) + 1);
        });
        const breakdown = Array.from(counts.entries()).map(([n, c]) => `${c} de ${n}`).join(', ');
        toast.success(`Você recebeu ${recebidos.length} novo${recebidos.length > 1 ? 's' : ''} modelo${recebidos.length > 1 ? 's' : ''} de cinto transferido${recebidos.length > 1 ? 's' : ''}: ${breakdown}`, { duration: 8000 });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Filter templates that belong to belts only
  const beltTemplates = tmpl.templates.filter(t => (t.form_data as any)?.__tipo === 'cinto');
  const beltUnseenCount = beltTemplates.filter(t => t.seen === false).length;

  const handleSaveTemplate = async () => {
    if (!user) return;
    const ok = await tmpl.saveTemplate(user.id, buildBeltFormData());
    if (ok) {
      setMode('order');
      resetForm();
      await tmpl.loadTemplates(user.id);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!user) return;
    const ok = await tmpl.updateTemplate(buildBeltFormData());
    if (ok) {
      setMode('order');
      resetForm();
      await tmpl.loadTemplates(user.id);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!user) return;
    await tmpl.deleteTemplate(id, user.id);
  };

  const handleEditTemplate = (template: { id: string; nome: string; form_data: Record<string, string> }) => {
    tmpl.startEditing(template);
    populateFromTemplate(template.form_data);
    setMode('template');
  };

  const handleUseTemplate = (formData: Record<string, string>) => {
    tmpl.setShowTemplates(false);
    populateFromTemplate(formData);
  };

  // send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendingTemplates, setSendingTemplates] = useState<typeof tmpl.templates>([]);
  const [usersList, setUsersList] = useState<{ id: string; nome_completo: string; nome_usuario: string }[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [sendingInProgress, setSendingInProgress] = useState(false);
  const [bulkSelectedTemplateIds, setBulkSelectedTemplateIds] = useState<string[]>([]);

  const openSendDialog = async (templates: typeof tmpl.templates) => {
    if (!user || templates.length === 0) return;
    setSendingTemplates(templates);
    setSelectedRecipients([]);
    setRecipientSearch('');
    setSendDialogOpen(true);
    const { data } = await supabase.rpc('list_profiles_minimal');
    setUsersList((data as any) || []);
  };

  const toggleRecipient = (id: string) => setSelectedRecipients(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleBulkTemplate = (id: string) => setBulkSelectedTemplateIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const confirmSendTemplate = async () => {
    if (!user || sendingTemplates.length === 0 || selectedRecipients.length === 0) return;
    setSendingInProgress(true);
    const ok = await tmpl.sendTemplateToUsers(sendingTemplates, selectedRecipients, user.id, user.nomeCompleto || user.nomeUsuario || 'Usuário');
    setSendingInProgress(false);
    if (ok) {
      setSendDialogOpen(false);
      setSendingTemplates([]);
      setSelectedRecipients([]);
      setBulkSelectedTemplateIds([]);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-display font-bold mb-2">Faça login para criar pedidos</h2>
          <button onClick={() => navigate('/login')} className="orange-gradient text-primary-foreground px-6 py-2 rounded-lg font-bold">LOGIN</button>
        </div>
      </div>
    );
  }

  // Price calculation
  const tamanhoPreco = BELT_SIZES.find(s => s.label === tamanho)?.preco || 0;
  const bordadoPPreco = bordadoP ? BORDADO_P_PRECO : 0;
  const nomeBordadoPreco = nomeBordado ? NOME_BORDADO_CINTO_PRECO : 0;
  const carimboPreco = BELT_CARIMBO.find(c => c.label === carimbo)?.preco || 0;
  const adicionalPreco = parseFloat(adicionalValor) || 0;
  const total = tamanhoPreco + bordadoPPreco + nomeBordadoPreco + carimboPreco + adicionalPreco;

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'template') {
      tmpl.isEditing ? handleUpdateTemplate() : handleSaveTemplate();
      return;
    }
    if (isAdminProducao && (!vendedor || vendedor === user?.nomeCompleto)) {
      toast.error('Por favor, selecione um vendedor válido.');
      return;
    }
    const required: [string, string][] = [
      [numeroPedido.trim(), 'Número do Pedido'],
      [tamanho, 'Tamanho'],
      [tipoCouro, 'Tipo de Couro'],
      [corCouro, 'Cor do Couro'],
      [fivela, 'Fivela'],
    ];
    const missing = required.filter(([val]) => !val);
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.map(([, l]) => l).join(', ')}`);
      return;
    }
    if (bordadoP && !bordadoPDesc.trim()) {
      toast.error('Preencha a descrição do Bordado P.');
      return;
    }
    if (nomeBordado && !nomeBordadoDesc.trim()) {
      toast.error('Preencha a descrição do Nome Bordado.');
      return;
    }
    setShowMirror(true);
  };


  const resetForm = () => {
    setVendedor(isAdminProducao ? '' : (user?.nomeCompleto || ''));
    setNumeroPedido('');
    setCliente('');
    setTamanho('');
    setTipoCouro(''); setCorCouro('');
    setBordadoP(false); setBordadoPDesc(''); setBordadoPCor('');
    setNomeBordado(false); setNomeBordadoDesc(''); setNomeBordadoCor(''); setNomeBordadoFonte('');
    setCarimbo(''); setCarimboDesc(''); setCarimboOnde('');
    setFivela(''); setFivelaOutroDesc('');
    setAdicionalValor(''); setAdicionalDesc('');
    setObservacao('');
    setFotoUrl('');
    setShowMirror(false);
    setLoadedDraftId(null);
  };

  const confirmOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const extraDetalhes: Record<string, any> = {
        tamanhoCinto: tamanho,
        tipoCouro,
        corCouro,
      };
      if (bordadoP) {
        extraDetalhes.bordadoP = 'Tem';
        extraDetalhes.bordadoPDesc = bordadoPDesc;
        if (bordadoPCor) extraDetalhes.bordadoPCor = bordadoPCor;
      }
      if (nomeBordado) {
        extraDetalhes.nomeBordado = 'Tem';
        extraDetalhes.nomeBordadoDesc = nomeBordadoDesc;
        if (nomeBordadoCor) extraDetalhes.nomeBordadoCor = nomeBordadoCor;
        if (nomeBordadoFonte) extraDetalhes.nomeBordadoFonte = nomeBordadoFonte;
      }
      if (carimbo) {
        extraDetalhes.carimbo = carimbo;
        if (carimboDesc) extraDetalhes.carimboDesc = carimboDesc;
        if (carimboOnde) extraDetalhes.ondeAplicado = carimboOnde;
      }
      if (fivela) {
        extraDetalhes.fivela = fivela;
        if (fivela === 'Outro' && fivelaOutroDesc) extraDetalhes.fivelaOutroDesc = fivelaOutroDesc;
      }

      const success = await addOrder({
        numeroPedido: numeroPedido.trim(),
        cliente: cliente.trim(),
        vendedor: isAdminUser ? vendedor : (user?.nomeCompleto || ''),
        tamanho: '-',
        modelo: '-',
        solado: '-',
        formatoBico: '-',
        corVira: '-',
        couroGaspea: '-',
        couroCano: '-',
        couroTaloneira: '-',
        bordadoCano: '-',
        bordadoGaspea: '-',
        bordadoTaloneira: '-',
        personalizacaoNome: '-',
        personalizacaoBordado: '-',
        corLinha: '-',
        corBorrachinha: '-',
        trisce: '-',
        tiras: '-',
        metais: '-',
        acessorios: '-',
        desenvolvimento: '-',
        sobMedida: false,
        observacao,
        quantidade: 1,
        preco: total,
        adicionalValor: adicionalPreco || null,
        adicionalDesc: adicionalDesc.trim() || null,
        temLaser: false,
        fotos: fotoUrl.trim() ? [fotoUrl.trim()] : [],
        tipoExtra: 'cinto',
        extraDetalhes,
      } as any);

      if (success) {
        if (loadedDraftId) deleteDraft(loadedDraftId);
        const numeroSalvo = numeroPedido.trim() || '(novo)';
        toast.success(`Cinto ${numeroSalvo} lançado em Meus Pedidos!`, { position: 'bottom-right' });
        resetForm();
      } else {
        toast.error('Erro ao salvar o pedido. Faça login novamente e tente.');
      }
    } catch (err) {
      console.error('confirmOrder error:', err);
      toast.error('Erro inesperado ao salvar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!user) return;
    if (!numeroPedido.trim() && !cliente.trim()) {
      toast.error('Preencha o Número do Pedido ou o Cliente para salvar o rascunho.');
      return;
    }
    const id = `draft-belt-${Date.now()}`;
    const form: Record<string, string> = {
      vendedor, tamanho, tipoCouro, corCouro, cliente,
      bordadoP: String(bordadoP), bordadoPDesc, bordadoPCor,
      nomeBordado: String(nomeBordado), nomeBordadoDesc, nomeBordadoCor, nomeBordadoFonte,
      carimbo, carimboDesc, carimboOnde,
      fivela, fivelaOutroDesc,
      adicionalValor, adicionalDesc,
      observacao,
    };
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    saveDraft({ id, userId: user.id, savedAt: now.toISOString(), form, sobMedida: false, quantidade: 1, numeroPedido, cliente, fotos: fotoUrl.trim() ? [fotoUrl.trim()] : [] });
    toast.success('Rascunho salvo!');
  };

  const filterRows = (arr: [string, string][]): [string, string][] => arr.filter(([, v]) => v && String(v).trim() !== '');
  const mirrorGrouped: { categoria: string; itens: [string, string][] }[] = [
    {
      categoria: 'Identificação',
      itens: filterRows([
        ['Vendedor', isAdminUser ? vendedor : (user?.nomeCompleto || '')],
        ['Número do Pedido', numeroPedido],
        ['Cliente', cliente],
        ['Tamanho', tamanho ? `${tamanho} (${formatCurrency(tamanhoPreco)})` : ''],
      ]),
    },
    {
      categoria: 'Couro',
      itens: filterRows([
        ['Tipo de Couro', tipoCouro],
        ['Cor do Couro', corCouro],
      ]),
    },
    {
      categoria: 'Bordados',
      itens: filterRows([
        ['Bordado P', bordadoP ? `Tem — ${bordadoPDesc}${bordadoPCor ? ' | Cor: ' + bordadoPCor : ''}` : ''],
        ['Nome Bordado', nomeBordado ? `Tem — ${nomeBordadoDesc}${nomeBordadoCor ? ' | Cor: ' + nomeBordadoCor : ''}${nomeBordadoFonte ? ' | Fonte: ' + nomeBordadoFonte : ''}` : ''],
      ]),
    },
    {
      categoria: 'Carimbo',
      itens: filterRows([
        ['Carimbo a Fogo', carimbo ? `${carimbo}${carimboDesc ? ' — ' + carimboDesc : ''}${carimboOnde ? ' | Local: ' + carimboOnde : ''}` : ''],
      ]),
    },
    {
      categoria: 'Fivela',
      itens: filterRows([
        ['Fivela', fivela ? (fivela === 'Outro' && fivelaOutroDesc ? `Outro — ${fivelaOutroDesc}` : fivela) : ''],
      ]),
    },
    {
      categoria: 'Finalização',
      itens: filterRows([
        ['Adicional', adicionalPreco ? `${formatCurrency(adicionalPreco)}${adicionalDesc ? ' — ' + adicionalDesc : ''}` : ''],
        ['Quantidade', '1'],
      ]),
    },
  ].filter(g => g.itens.length > 0);

  const showFotoPanel = mode === 'order' && mostrarFotoPainel && isHttpUrl(fotoUrl);
  const isTemplate = mode === 'template';

  return (
    <div className={`container mx-auto px-4 py-8 ${showFotoPanel ? 'max-w-6xl' : 'max-w-4xl'} transition-[max-width] duration-300`}>
      <div className={showFotoPanel ? 'grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-3xl font-display font-bold">
            {tmpl.isEditing ? 'Editar Modelo — Cinto' : isTemplate ? 'Criar Modelo — Cinto' : 'Ficha de Produção — Cinto'}
          </h1>
          {!isTemplate && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode('template')}>
                <Plus size={16} /> Criar Modelo
              </Button>
              <Button type="button" variant="outline" size="sm" className="relative" onClick={async () => {
                if (user) await tmpl.loadTemplates(user.id);
                tmpl.setShowTemplates(true);
                tmpl.setTemplateSearch('');
                if (user) await tmpl.markTemplatesAsSeen(user.id);
              }}>
                <List size={16} /> Modelos
                {beltUnseenCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {beltUnseenCount}
                  </span>
                )}
              </Button>
            </>
          )}
          {isTemplate && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('order'); tmpl.cancelEditing(); }}>
              Voltar para Pedido
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">

          {/* Template name field */}
          {isTemplate && (
            <div>
              <label className={cls.label}>Nome do Modelo<span className="text-destructive ml-0.5">*</span></label>
              <input type="text" value={tmpl.templateName} onChange={e => tmpl.setTemplateName(e.target.value)} placeholder="Ex: Cinto tradicional" className={cls.input} />
            </div>
          )}

          {/* IDENTIFICAÇÃO (apenas em modo pedido) */}
          {!isTemplate && (
          <Section title="Identificação">
            {/* Link da Foto de Referência (Drive) — primeiro campo */}
            <div>
              <label className={cls.label}>Link da Foto de Referência (Google Drive)</label>
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  type="url"
                  value={fotoUrl}
                  onChange={e => { setFotoUrl(e.target.value); if (isHttpUrl(e.target.value)) setMostrarFotoPainel(true); }}
                  placeholder="Cole o link do Google Drive aqui..."
                  className={cls.input}
                />
                {fotoUrl && (
                  <button type="button" onClick={() => { setFotoUrl(''); setMostrarFotoPainel(false); }} className="text-destructive hover:text-destructive/80">
                    <X size={16} />
                  </button>
                )}
              </div>
              {fotoUrl && isHttpUrl(fotoUrl) && (
                <button
                  type="button"
                  onClick={() => setMostrarFotoPainel(v => !v)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ImageIcon size={14} /> {mostrarFotoPainel ? 'Esconder foto' : 'Ver foto'}
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={cls.label}>Vendedor</label>
                {isAdminUser ? (
                  <select value={vendedor} onChange={e => setVendedor(e.target.value)} className={cls.select}>
                    {isAdminProducao && !vendedor && <option value="">Selecione um vendedor</option>}
                    {allProfiles.filter(p => !(isAdminProducao && p.nomeUsuario?.toLowerCase() === 'fernanda')).map(p => (
                      <option key={p.id} value={p.nomeCompleto}>{p.nomeCompleto}</option>
                    ))}
                    <option value="Estoque">Estoque</option>
                  </select>
                ) : (
                  <input type="text" value={user?.nomeCompleto || ''} readOnly className={cls.input + ' opacity-70'} />
                )}
              </div>
              <div>
                <label className={cls.label}>Número do Pedido<span className="text-destructive ml-0.5">*</span></label>
                <input type="text" value={numeroPedido} onChange={e => setNumeroPedido(e.target.value)} placeholder="Ex: 7E-20250001" required className={`${cls.input} ${orderDuplicate ? 'border-destructive' : ''}`} />
                {orderDuplicate && <p className="text-xs text-destructive mt-1">{DUPLICATE_MSG}</p>}
              </div>
              <div>
                <label className={cls.label}>Cliente</label>
                <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente (opcional)" className={cls.input} />
              </div>
            </div>

            <div>
              <label className={cls.label}>Tamanho<span className="text-destructive ml-0.5">*</span></label>
              <select value={tamanho} onChange={e => setTamanho(e.target.value)} className={cls.select}>
                <option value="">Selecione...</option>
                {BELT_SIZES.map(s => (
                  <option key={s.label} value={s.label}>{s.label} (R${s.preco})</option>
                ))}
              </select>
            </div>
          </Section>
          )}

          {/* Em modo template, expor o tamanho como seleção única */}
          {isTemplate && (
            <div>
              <label className={cls.label}>Tamanho</label>
              <select value={tamanho} onChange={e => setTamanho(e.target.value)} className={cls.select}>
                <option value="">Selecione...</option>
                {BELT_SIZES.map(s => (
                  <option key={s.label} value={s.label}>{s.label} (R${s.preco})</option>
                ))}
              </select>
            </div>
          )}

          {/* Couro */}
          <Section title="Couro">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={cls.label}>Tipo de Couro{!isTemplate && <span className="text-destructive ml-0.5">*</span>}</label>
                <SearchableSelect options={TIPOS_COURO} value={tipoCouro} onValueChange={setTipoCouro} placeholder="Selecione..." />
              </div>
              <div>
                <label className={cls.label}>Cor do Couro{!isTemplate && <span className="text-destructive ml-0.5">*</span>}</label>
                <SearchableSelect options={CORES_COURO} value={corCouro} onValueChange={setCorCouro} placeholder="Selecione..." />
              </div>
            </div>
          </Section>

          {/* Fivela */}
          <Section title="Fivela">
            <div>
              <label className={cls.label}>Fivela{!isTemplate && <span className="text-destructive ml-0.5">*</span>}</label>
              <SearchableSelect options={FIVELA_OPTIONS} value={fivela} onValueChange={setFivela} placeholder="Selecione..." />
            </div>
            {fivela === 'Outro' && (
              <div className="mt-3">
                <label className={cls.label}>Descrever fivela</label>
                <input type="text" value={fivelaOutroDesc} onChange={e => setFivelaOutroDesc(e.target.value)} placeholder="Descreva a fivela..." className={cls.input} />
              </div>
            )}
          </Section>

          {/* Bordado P */}
          <Section title={`Bordado P (+R$${BORDADO_P_PRECO})`}>
            <div className="flex flex-wrap items-center gap-3">
              <select value={bordadoP ? 'tem' : 'nao'} onChange={e => setBordadoP(e.target.value === 'tem')} className={cls.inputSmall + ' w-28'}>
                <option value="nao">Não tem</option>
                <option value="tem">Tem</option>
              </select>
            </div>
            {bordadoP && (
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={cls.label}>Descrição do Bordado{!isTemplate && <span className="text-destructive ml-0.5">*</span>}</label>
                  <input type="text" value={bordadoPDesc} onChange={e => setBordadoPDesc(e.target.value)} placeholder="Descreva o bordado..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label}>Cor do Bordado</label>
                  <input type="text" value={bordadoPCor} onChange={e => setBordadoPCor(e.target.value)} placeholder="Cor..." className={cls.input} />
                </div>
              </div>
            )}
          </Section>

          {/* Nome Bordado */}
          <Section title={`Nome Bordado (+R$${NOME_BORDADO_CINTO_PRECO})`}>
            <div className="flex flex-wrap items-center gap-3">
              <select value={nomeBordado ? 'tem' : 'nao'} onChange={e => setNomeBordado(e.target.value === 'tem')} className={cls.inputSmall + ' w-28'}>
                <option value="nao">Não tem</option>
                <option value="tem">Tem</option>
              </select>
            </div>
            {nomeBordado && (
              <div className="grid sm:grid-cols-3 gap-4 mt-3">
                <div>
                  <label className={cls.label}>Descrição{!isTemplate && <span className="text-destructive ml-0.5">*</span>}</label>
                  <input type="text" value={nomeBordadoDesc} onChange={e => setNomeBordadoDesc(e.target.value)} placeholder="Nome a bordar..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label}>Cor</label>
                  <input type="text" value={nomeBordadoCor} onChange={e => setNomeBordadoCor(e.target.value)} placeholder="Cor..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label}>Fonte</label>
                  <input type="text" value={nomeBordadoFonte} onChange={e => setNomeBordadoFonte(e.target.value)} placeholder="Tipo de fonte..." className={cls.input} />
                </div>
              </div>
            )}
          </Section>

          {/* Carimbo a Fogo */}
          <Section title="Carimbo a Fogo">
            <div className="flex flex-wrap items-start gap-3">
              <select value={carimbo} onChange={e => setCarimbo(e.target.value)} className={cls.inputSmall + ' w-52'}>
                <option value="">Sem carimbo</option>
                {BELT_CARIMBO.map(c => <option key={c.label} value={c.label}>{c.label} (R${c.preco})</option>)}
              </select>
            </div>
            {carimbo && (
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={cls.label}>Quais carimbos</label>
                  <input type="text" value={carimboDesc} onChange={e => setCarimboDesc(e.target.value)} placeholder="Descreva os carimbos..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label}>Onde será aplicado</label>
                  <input type="text" value={carimboOnde} onChange={e => setCarimboOnde(e.target.value)} placeholder="Local de aplicação..." className={cls.input} />
                </div>
              </div>
            )}
          </Section>


          {/* Adicional */}
          <Section title="Adicional">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={cls.label}>Valor do Adicional (R$)</label>
                <input type="number" step="0.01" min="0" value={adicionalValor} onChange={e => setAdicionalValor(e.target.value)} onWheel={e => (e.target as HTMLInputElement).blur()} placeholder="0,00" className={cls.input} />
              </div>
              <div>
                <label className={cls.label}>Descrição do Adicional</label>
                <input type="text" value={adicionalDesc} onChange={e => setAdicionalDesc(e.target.value)} placeholder="Motivo do adicional..." className={cls.input} />
              </div>
            </div>
          </Section>

          {/* Observação */}
          <Section title="Observação">
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className={cls.input + ' min-h-[80px]'} placeholder="Anotações adicionais..." />
          </Section>

          {!isTemplate && (
            <>
              {/* Quantidade */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold">Quantidade:</label>
                <input type="number" value={1} readOnly className={cls.inputSmall + ' w-20 opacity-70'} />
              </div>

              {/* Valor Total */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Valor Total</span><span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <button type="submit" disabled={orderDuplicate} className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Eye size={20} /> CONFERIR E FINALIZAR PEDIDO
              </button>
              <button type="button" onClick={handleSaveDraft} disabled={orderDuplicate} className="w-full border-2 border-primary text-primary py-3 rounded-lg font-bold tracking-wider hover:bg-primary/10 transition-colors text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                SALVAR RASCUNHO
              </button>
            </>
          )}

          {isTemplate && (
            <button type="submit" className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2">
              {tmpl.isEditing ? <><Check size={20} /> SALVAR ALTERAÇÕES NO MODELO</> : <><Plus size={20} /> CRIAR MODELO</>}
            </button>
          )}
        </form>
      </motion.div>
        {showFotoPanel && (
          <FotoPedidoSidePanel url={fotoUrl} onClose={() => setMostrarFotoPainel(false)} />
        )}
      </div>

      {/* ───── Templates Dialog ───── */}
      <Dialog open={tmpl.showTemplates} onOpenChange={tmpl.setShowTemplates}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modelos Salvos — Cinto</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Pesquisar modelo..."
            value={tmpl.templateSearch}
            onChange={e => tmpl.setTemplateSearch(e.target.value)}
            className="mb-2"
          />
          {(() => {
            const filtered = beltTemplates.filter(t => t.nome.toLowerCase().includes(tmpl.templateSearch.toLowerCase()));
            if (beltTemplates.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo de cinto salvo ainda.</p>;
            if (filtered.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo encontrado.</p>;
            const bulkTemplates = beltTemplates.filter(t => bulkSelectedTemplateIds.includes(t.id));
            return (
              <>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                  {filtered.map(t => {
                    const isChecked = bulkSelectedTemplateIds.includes(t.id);
                    return (
                      <div key={t.id} className="flex items-center justify-between bg-muted rounded-lg p-3 gap-2">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleBulkTemplate(t.id)} title="Selecionar para envio em lote" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm break-words">{t.nome}</span>
                            {t.seen === false && <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Novo</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openSendDialog([t])} title="Enviar para outro usuário"><Send size={14} /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditTemplate(t)} title="Editar modelo"><Pencil size={14} /></Button>
                          <Button size="sm" onClick={() => handleUseTemplate(t.form_data)}>Preencher</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(t.id)}><Trash2 size={14} /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {bulkSelectedTemplateIds.length > 0 && (
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
                    <span className="text-sm font-semibold">{bulkSelectedTemplateIds.length} modelo{bulkSelectedTemplateIds.length > 1 ? 's' : ''} selecionado{bulkSelectedTemplateIds.length > 1 ? 's' : ''}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setBulkSelectedTemplateIds([])}>Limpar</Button>
                      <Button size="sm" onClick={() => openSendDialog(bulkTemplates)}>
                        <Send size={14} /> Enviar selecionados
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ───── Send Template Dialog ───── */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar modelo{sendingTemplates.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          {sendingTemplates.length > 0 && (
            <p className="text-sm text-muted-foreground -mt-2">
              {sendingTemplates.length === 1 ? (
                <>Enviando: <span className="font-semibold text-foreground">{sendingTemplates[0].nome}</span></>
              ) : (
                <>Enviando <span className="font-semibold text-foreground">{sendingTemplates.length} modelos</span>: {sendingTemplates.slice(0, 3).map(t => t.nome).join(', ')}{sendingTemplates.length > 3 ? '…' : ''}</>
              )}
            </p>
          )}
          <Input
            placeholder="Pesquisar usuário..."
            value={recipientSearch}
            onChange={e => setRecipientSearch(e.target.value)}
          />
          <div className="space-y-1 max-h-[50vh] overflow-y-auto border border-border rounded-lg p-2">
            {usersList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando usuários...</p>
            )}
            {usersList
              .filter(u => {
                const q = recipientSearch.toLowerCase();
                return !q || u.nome_completo?.toLowerCase().includes(q) || u.nome_usuario?.toLowerCase().includes(q);
              })
              .map(u => {
                const checked = selectedRecipients.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => toggleRecipient(u.id)} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{u.nome_completo || u.nome_usuario}</span>
                      {u.nome_completo && u.nome_usuario && (
                        <span className="text-xs text-muted-foreground truncate">@{u.nome_usuario}</span>
                      )}
                    </div>
                  </label>
                );
              })}
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedRecipients.length} selecionado{selectedRecipients.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sendingInProgress}>Cancelar</Button>
              <Button onClick={confirmSendTemplate} disabled={selectedRecipients.length === 0 || sendingInProgress}>
                <Send size={14} /> Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mirror */}
      {showMirror && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4" onClick={() => setShowMirror(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl p-6 md:p-8 western-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-display font-bold mb-1 text-center">ESPELHO — CINTO</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Confira todas as informações antes de finalizar</p>

            <div className="border border-border rounded-lg p-4 mb-4">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {mirrorRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">{label}:</span>
                    <span className="text-sm font-semibold text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>
              {fotoUrl && (
                <div className="mt-3">
                  <span className="text-xs font-semibold">Foto de Referência:</span>
                  <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-2">
                    {fotoUrl.length > 60 ? fotoUrl.slice(0, 60) + '...' : fotoUrl} ↗
                  </a>
                </div>
              )}
            </div>

            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Valor Total</span><span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowMirror(false)} className="flex-1 bg-muted text-foreground py-3 rounded-lg font-bold hover:bg-muted/80 transition-colors">EDITAR</button>
              <button onClick={confirmOrder} disabled={submitting} className="flex-1 orange-gradient text-primary-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">{submitting ? 'Salvando...' : 'OK — FINALIZAR'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BeltOrderPage;
