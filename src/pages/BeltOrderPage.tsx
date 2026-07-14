import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, formatBrasiliaDate, formatBrasiliaTime } from '@/contexts/AuthContext';
import { useAutoOrderNumero } from '@/hooks/useAutoOrderNumero';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { saveDraft, deleteDraft } from '@/lib/drafts';
import { supabase } from '@/integrations/supabase/client';
import { Link2, X, Eye, Image as ImageIcon, Plus, List, Trash2, Pencil, Check, Send, Inbox, Eraser } from 'lucide-react';
import { FotoPedidoSidePanel } from '@/components/FotoPedidoSidePanel';
import { TemplateHeaderFields } from '@/components/template/TemplateHeaderFields';
import { isHttpUrl } from '@/lib/driveUrl';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTemplateManagement } from '@/hooks/useTemplateManagement';
import { TemplatesDialog } from '@/components/template/TemplatesDialog';
import { useTemplatesValidity } from '@/hooks/useTemplateValidity';

function TemplatesDialogWithValidity(props: React.ComponentProps<typeof TemplatesDialog> & { tipo: 'bota' | 'cinto' }) {
  const { tipo, ...rest } = props;
  const validityById = useTemplatesValidity(rest.templates as any, tipo);
  return <TemplatesDialog {...rest} validityById={validityById} />;
}
import SearchableSelect from '@/components/SearchableSelect';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';

import { maskPhoneBR } from '@/lib/whatsappSend';
import { TIPOS_COURO, CORES_COURO, getCoresCouroFiltradas } from '@/lib/orderFieldsConfig';
import {
  BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO,
  FIVELA_OPTIONS,
} from '@/lib/extrasConfig';

import { FichaEditProvider } from '@/contexts/FichaEditContext';
import FichaEditToggle from '@/components/ficha-edit/FichaEditToggle';
import FichaEditBar from '@/components/ficha-edit/FichaEditBar';
import FichaFieldControls from '@/components/ficha-edit/FichaFieldControls';
import { InlineVariacaoOlhos } from '@/components/ficha/InlineVariacaoOlhos';
import { extractVariationName } from '@/lib/variationLabels';

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

export interface BeltOrderPageProps {
  comprarModeloOverride?: {
    templateId: string;
    overrides?: { numeroPedido?: string; cliente?: string; clienteWhatsapp?: string; tamanho?: string; vendedor?: string; observacao?: string };
  } | null;
  onComprarSaved?: () => void;
  onComprarEditar?: () => void;
}

const BeltOrderPage = ({ comprarModeloOverride, onComprarSaved, onComprarEditar }: BeltOrderPageProps = {}) => {
  const { isLoggedIn, user, addOrder, isAdmin, allProfiles, loading: authLoading } = useAuth();
  const { findFotoByName } = useFichaVariacoesLookup();

  const navigate = useNavigate();
  const location = useLocation();
  const draftData = (location.state as any)?.draft;
  const comprarModelo = comprarModeloOverride ?? ((location.state as any)?.comprarModelo as null | {
    templateId: string;
    overrides?: { numeroPedido?: string; cliente?: string; clienteWhatsapp?: string; tamanho?: string; vendedor?: string; observacao?: string };
  });
  const [comprarMode] = useState<boolean>(!!comprarModelo);

  const isAdminUser = isAdmin;
  const tmpl = useTemplateManagement();
  const [mode, setMode] = useState<'order' | 'template'>('order');
  // Modelo rascunho aplicado (nome + sku base + grade) — gravado no pedido ao salvar.
  const appliedTemplateRef = useRef<{ nome: string; sku?: string | null; tamanhosSkus?: { tamanho: string; sku: string }[] } | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Form state
  const isAdminProducao = user?.role === 'admin_producao';
  const [vendedor, setVendedor] = useState(isAdminProducao ? '' : (user?.nomeCompleto || ''));
  const [numeroPedido, setNumeroPedido] = useState('');
  const { isDuplicate: orderDuplicate } = useCheckDuplicateOrder(numeroPedido);
  const vendorForAutoNum = isAdmin
    ? (allProfiles.find(p => p.nomeCompleto === vendedor) || null)
    : (user ? { nomeUsuario: user.nomeUsuario, pedidoPrefixo: user.pedidoPrefixo } : null);
  const { autoNumero, isAuto: numeroIsAuto } = useAutoOrderNumero(vendorForAutoNum);
  useEffect(() => { if (numeroIsAuto && autoNumero) setNumeroPedido(autoNumero); }, [numeroIsAuto, autoNumero]);
  const [cliente, setCliente] = useState('');
  const [clienteWhatsapp, setClienteWhatsapp] = useState('');
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
  useEffect(() => {
    if (mode === 'template' && isHttpUrl(tmpl.templateFotoUrl)) setMostrarFotoPainel(true);
  }, [mode, tmpl.templateFotoUrl]);
  const [showMirror, setShowMirror] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [estoquePronto, setEstoquePronto] = useState(false);

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

  /* Comprar Modelo prefill: vem de /modelos → "Comprar" */
  const comprarAppliedRef = useRef(false);
  useEffect(() => {
    if (comprarAppliedRef.current || !comprarModelo) return;
    comprarAppliedRef.current = true;
    (async () => {
      const { data: tmplRow } = await supabase
        .from('order_templates')
        .select('id, nome, form_data, sku, tamanhos_skus, foto_url')
        .eq('id', comprarModelo.templateId)
        .maybeSingle();
      if (!tmplRow) {
        toast.error('Modelo não encontrado.');
        navigate('/modelos', { replace: true });
        return;
      }
      appliedTemplateRef.current = {
        nome: (tmplRow as any).nome,
        sku: (tmplRow as any).sku,
        tamanhosSkus: Array.isArray((tmplRow as any).tamanhos_skus) ? (tmplRow as any).tamanhos_skus : [],
      };
      populateFromTemplate({ ...((tmplRow as any).form_data || {}) });
      if ((tmplRow as any).foto_url) setFotoUrl((tmplRow as any).foto_url);
      const ov = comprarModelo.overrides || {};
      if (ov.numeroPedido !== undefined) setNumeroPedido(ov.numeroPedido);
      if (ov.cliente !== undefined) setCliente(ov.cliente);
      if (ov.clienteWhatsapp !== undefined) setClienteWhatsapp(ov.clienteWhatsapp);
      if (ov.tamanho !== undefined) setTamanho(ov.tamanho);
      if (ov.vendedor !== undefined && ov.vendedor) setVendedor(ov.vendedor);
      if (ov.observacao !== undefined) setObservacao(ov.observacao);
      setTimeout(() => setShowMirror(true), 60);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comprarModelo]);



  // Filter templates that belong to belts only
  const beltTemplates = tmpl.templates.filter(t => (t.form_data as any)?.__tipo === 'cinto');
  const beltUnseenCount = beltTemplates.filter(t => t.seen === false).length;

  const handleSaveTemplate = async () => {
    if (!user) return;
    const ok = await tmpl.saveTemplate(user.id, buildBeltFormData(), 'cinto');
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
    appliedTemplateRef.current = null;
    tmpl.startEditing(template);
    populateFromTemplate(template.form_data);
    setMode('template');
  };


  const handleUseTemplate = (
    template: { nome: string; form_data: Record<string, string>; sku?: string | null; foto_url?: string | null; tamanhos_skus?: { tamanho: string; sku: string }[] | null },
  ) => {
    tmpl.setShowTemplates(false);
    appliedTemplateRef.current = {
      nome: template.nome,
      sku: template.sku || null,
      tamanhosSkus: Array.isArray(template.tamanhos_skus) ? template.tamanhos_skus : [],
    };
    populateFromTemplate(template.form_data);
    if (template.foto_url) {
      setFotoUrl(template.foto_url);
      if (isHttpUrl(template.foto_url)) setMostrarFotoPainel(true);
    }
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
    appliedTemplateRef.current = null;
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

      const tpl = appliedTemplateRef.current;
      const tplGrade = tpl
        ? (tpl.tamanhosSkus || []).find(
            t => (t.tamanho || '').trim().toLowerCase() === (tamanho || '').trim().toLowerCase(),
          )
        : undefined;
      const tplSku = tpl ? ((tplGrade?.sku || tpl.sku || '').trim() || null) : null;

      const isEstoqueVend = isAdminUser && vendedor === 'Estoque';
      const success = await addOrder({
        numeroPedido: numeroPedido.trim(),
        cliente: isEstoqueVend ? '' : cliente.trim(),
        clienteWhatsapp: isEstoqueVend ? undefined : (clienteWhatsapp.trim() || undefined),
        vendedor: isAdminUser ? vendedor : (user?.nomeCompleto || ''),
        nomeProdutoEstoque: isEstoqueVend ? (cliente.trim() || `Cinto ${numeroPedido.trim() || ''}`) : undefined,
        templateNome: tpl?.nome,
        templateSku: tplSku || undefined,
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
        // Modelo v2: preco gravado é o TOTAL FINAL.
        preco: total,
        precoMigradoV2: true,
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
        if (estoquePronto && numeroSalvo !== '(novo)') {
          // Backfill SKU + marca estoque_pronto + Baixa Estoque + cria estoque
          const slug = (s: string) => (s || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const { data: row } = await supabase.from('orders')
            .select('id, sku_estoque, modelo, tamanho, nome_produto_estoque')
            .eq('numero', numeroSalvo).maybeSingle();
          if (row) {
            if (!row.sku_estoque || !row.sku_estoque.trim()) {
              const base = slug(row.nome_produto_estoque || row.modelo || 'cinto');
              const sku = `${base}-${row.tamanho || tamanho || 'un'}`.replace(/-$/, '');
              await supabase.from('orders').update({ sku_estoque: sku }).eq('id', row.id);
            }
            await supabase.from('orders')
              .update({ estoque_pronto: true, status: 'Baixa Estoque' } as any)
              .eq('id', row.id);
            const { error: rpcErr } = await (supabase.rpc as any)('criar_estoque_produto', { _order_id: row.id });
            if (rpcErr) console.error('criar_estoque_produto err', rpcErr);
          }
          toast.success(`Estoque criado a partir do cinto ${numeroSalvo}.`, { position: 'bottom-right' });
          resetForm();
          navigate('/estoque');
          return;
        }
        toast.success(`Cinto ${numeroSalvo} lançado em Meus Pedidos!`, { position: 'bottom-right' });
        if (comprarMode && onComprarSaved) onComprarSaved();
        else resetForm();
      } else {
        toast.error('Erro ao salvar o pedido. Faça login novamente e tente.');
      }
    } catch (err) {
      console.error('confirmOrder error:', err);
      toast.error('Erro inesperado ao salvar o pedido.');
    } finally {
      setSubmitting(false);
      setEstoquePronto(false);
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

  const currentFotoUrl = mode === 'template' ? tmpl.templateFotoUrl : fotoUrl;
  const showFotoPanel = mostrarFotoPainel && isHttpUrl(currentFotoUrl);
  const isTemplate = mode === 'template';

  return (
    <FichaEditProvider fichaSlug="cinto">
    <div className={`container mx-auto px-4 py-8 ${showFotoPanel ? 'max-w-6xl' : 'max-w-4xl'} transition-[max-width] duration-300`}>
      <FichaEditBar />
      <div className={`${comprarMode ? 'hidden' : ''} ${showFotoPanel ? 'grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-3xl font-display font-bold">
            {tmpl.isEditing ? 'Editar Modelo — Cinto' : isTemplate ? 'Criar Modelo — Cinto' : 'Ficha de Produção — Cinto'}
          </h1>
          {!isTemplate && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm('Limpar todos os campos preenchidos na ficha?')) {
                    resetForm();
                    toast.success('Ficha limpa.');
                  }
                }}
                title="Limpar todos os campos da ficha"
              >
                <Eraser size={16} /> Limpar
              </Button>
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
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/pedido?tipo=bota')}>
                Trocar para Bota
              </Button>
              <FichaEditToggle />
            </>
          )}
          {isTemplate && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('order'); tmpl.cancelEditing(); }}>
              Voltar para Pedido
            </Button>
          )}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">

          {/* Cabeçalho do Modelo (foto, nome, gênero, SKU base, tamanhos+SKU) */}
          {isTemplate && (
            <TemplateHeaderFields
              nome={tmpl.templateName}
              onNome={tmpl.setTemplateName}
              genero={tmpl.templateGenero}
              onGenero={tmpl.setTemplateGenero}
              sku={tmpl.templateSku}
              onSku={tmpl.setTemplateSku}
              fotoUrl={tmpl.templateFotoUrl}
              onFotoUrl={v => { tmpl.setTemplateFotoUrl(v); if (isHttpUrl(v)) setMostrarFotoPainel(true); else setMostrarFotoPainel(false); }}
              tamanhosSkus={tmpl.templateTamanhosSkus}
              onTamanhosSkus={tmpl.setTemplateTamanhosSkus}
            />
          )}

          {/* IDENTIFICAÇÃO (apenas em modo pedido) */}
          {!isTemplate && (
          <Section title="Identificação">
            {/* Link da Foto de Referência (Drive) — primeiro campo */}
            <div>
              <label className={cls.label + ' inline-flex items-center'}>Link da Foto de Referência (Google Drive)<FichaFieldControls labelText="Link da Foto de Referência (Google Drive)" defaultTipo="texto" /></label>
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
                <label className={cls.label + ' inline-flex items-center'}>Vendedor<FichaFieldControls labelText="Vendedor" defaultTipo="texto" /></label>
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
                <label className={cls.label + ' inline-flex items-center'}>Número do Pedido<span className="text-destructive ml-0.5">*</span><FichaFieldControls labelText="Número do Pedido" defaultTipo="selecao" /></label>
                <input type="text" value={numeroPedido} onChange={e => setNumeroPedido(e.target.value)} placeholder="Ex: 7E-20250001" required readOnly={numeroIsAuto} className={`${cls.input} ${orderDuplicate ? 'border-destructive' : ''} ${numeroIsAuto ? 'opacity-70 cursor-not-allowed' : ''}`} />
                {orderDuplicate && <p className="text-xs text-destructive mt-1">{DUPLICATE_MSG}</p>}
                {numeroIsAuto && <p className="text-xs text-muted-foreground mt-1">Número gerado automaticamente pelo prefixo do vendedor.</p>}
              </div>
              <div>
                <label className={cls.label + ' inline-flex items-center'}>Cliente<FichaFieldControls labelText="Cliente" defaultTipo="texto" /></label>
                <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente (opcional)" className={cls.input} />
              </div>
            </div>

            {(user?.role === 'vendedor_comissao' || user?.role === 'admin_master') && (
              <div>
                <label className={cls.label + ' inline-flex items-center'}>WhatsApp do Cliente <span className="text-xs font-normal text-muted-foreground">(opcional, para enviar link de rastreio)</span><FichaFieldControls labelText="WhatsApp do Cliente" defaultTipo="texto" /></label>
                <input
                  type="tel"
                  value={clienteWhatsapp}
                  onChange={e => setClienteWhatsapp(maskPhoneBR(e.target.value))}
                  placeholder="(XX) XXXXX-XXXX"
                  className={cls.input}
                />
              </div>
            )}

            <div>
              <label className={cls.label + ' inline-flex items-center'}>Tamanho<span className="text-destructive ml-0.5">*</span><FichaFieldControls labelText="Tamanho" defaultTipo="selecao" /></label>
              <select value={tamanho} onChange={e => setTamanho(e.target.value)} className={cls.select}>
                <option value="">Selecione...</option>
                {BELT_SIZES.map(s => (
                  <option key={s.label} value={s.label}>{s.label} (R${s.preco})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={cls.label + ' inline-flex items-center'}>Observação<FichaFieldControls labelText="Observação" defaultTipo="texto" /></label>
              <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className={cls.input + ' min-h-[80px]'} placeholder="Anotações adicionais..." />
            </div>
          </Section>
          )}

          {/* Em modo template, expor o tamanho como seleção única */}
          {isTemplate && (
            <div>
              <label className={cls.label + ' inline-flex items-center'}>Tamanho<FichaFieldControls labelText="Tamanho" defaultTipo="selecao" /></label>
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
                <label className={cls.label + ' inline-flex items-center'}>Tipo de Couro{!isTemplate && <span className="text-destructive ml-0.5">*</span>}<FichaFieldControls labelText="Tipo de Couro" defaultTipo="selecao" /></label>
                <SearchableSelect options={TIPOS_COURO} value={tipoCouro} onValueChange={setTipoCouro} placeholder="Selecione..." />
              </div>
              <div>
                <label className={cls.label + ' inline-flex items-center'}>Cor do Couro{!isTemplate && <span className="text-destructive ml-0.5">*</span>}<FichaFieldControls labelText="Cor do Couro" defaultTipo="selecao" /></label>
                <SearchableSelect options={getCoresCouroFiltradas(tipoCouro)} value={corCouro} onValueChange={setCorCouro} placeholder="Selecione..." />
              </div>
            </div>
          </Section>

          {/* Fivela */}
          <Section title="Fivela">
            <div>
              <label className={cls.label + ' inline-flex items-center'}>Fivela{!isTemplate && <span className="text-destructive ml-0.5">*</span>}<FichaFieldControls labelText="Fivela" defaultTipo="selecao" /></label>
              <SearchableSelect options={FIVELA_OPTIONS} value={fivela} onValueChange={setFivela} placeholder="Selecione..." />
            </div>
            {fivela === 'Outro' && (
              <div className="mt-3">
                <label className={cls.label + ' inline-flex items-center'}>Descrever fivela<FichaFieldControls labelText="Descrever fivela" defaultTipo="selecao" /></label>
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
                  <label className={cls.label + ' inline-flex items-center'}>Descrição do Bordado{!isTemplate && <span className="text-destructive ml-0.5">*</span>}<FichaFieldControls labelText="Descrição do Bordado" defaultTipo="texto" /></label>
                  <input type="text" value={bordadoPDesc} onChange={e => setBordadoPDesc(e.target.value)} placeholder="Descreva o bordado..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label + ' inline-flex items-center'}>Cor do Bordado<FichaFieldControls labelText="Cor do Bordado" defaultTipo="selecao" /></label>
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
                  <label className={cls.label + ' inline-flex items-center'}>Descrição{!isTemplate && <span className="text-destructive ml-0.5">*</span>}<FichaFieldControls labelText="Descrição" defaultTipo="texto" /></label>
                  <input type="text" value={nomeBordadoDesc} onChange={e => setNomeBordadoDesc(e.target.value)} placeholder="Nome a bordar..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label + ' inline-flex items-center'}>Cor<FichaFieldControls labelText="Cor" defaultTipo="selecao" /></label>
                  <input type="text" value={nomeBordadoCor} onChange={e => setNomeBordadoCor(e.target.value)} placeholder="Cor..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label + ' inline-flex items-center'}>Fonte<FichaFieldControls labelText="Fonte" defaultTipo="selecao" /></label>
                  <input type="text" value={nomeBordadoFonte} onChange={e => setNomeBordadoFonte(e.target.value)} placeholder="Tipo de fonte..." className={cls.input} />
                </div>
              </div>
            )}
          </Section>

          {/* Carimbo a Fogo */}
          <Section title="Carimbo a Fogo">
            <label className={cls.label + ' inline-flex items-center'}>Carimbo a Fogo<FichaFieldControls labelText="Carimbo a Fogo" defaultTipo="selecao" defaultCategoriaSlug="carimbo" /></label>
            <div className="flex flex-wrap items-start gap-3">
              <select value={carimbo} onChange={e => setCarimbo(e.target.value)} className={cls.inputSmall + ' w-52'}>
                <option value="">Sem carimbo</option>
                {BELT_CARIMBO.map(c => <option key={c.label} value={c.label}>{c.label} (R${c.preco})</option>)}
              </select>
            </div>
            {carimbo && (
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={cls.label + ' inline-flex items-center'}>Quais carimbos<FichaFieldControls labelText="Quais carimbos" defaultTipo="texto" /></label>
                  <input type="text" value={carimboDesc} onChange={e => setCarimboDesc(e.target.value)} placeholder="Descreva os carimbos..." className={cls.input} />
                </div>
                <div>
                  <label className={cls.label + ' inline-flex items-center'}>Onde será aplicado<FichaFieldControls labelText="Onde será aplicado" defaultTipo="texto" /></label>
                  <input type="text" value={carimboOnde} onChange={e => setCarimboOnde(e.target.value)} placeholder="Local de aplicação..." className={cls.input} />
                </div>
              </div>
            )}
          </Section>


          {/* Adicional */}
          <Section title="Adicional">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={cls.label + ' inline-flex items-center'}>Valor do Adicional (R$)<FichaFieldControls labelText="Valor do Adicional (R$)" defaultTipo="numero" /></label>
                <input type="number" step="0.01" min="0" value={adicionalValor} onChange={e => setAdicionalValor(e.target.value)} onWheel={e => (e.target as HTMLInputElement).blur()} placeholder="0,00" className={cls.input} />
              </div>
              <div>
                <label className={cls.label + ' inline-flex items-center'}>Descrição do Adicional<FichaFieldControls labelText="Descrição do Adicional" defaultTipo="texto" /></label>
                <input type="text" value={adicionalDesc} onChange={e => setAdicionalDesc(e.target.value)} placeholder="Motivo do adicional..." className={cls.input} />
              </div>
            </div>
          </Section>

          {/* Observação vive dentro da Identificação (topo) */}

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
              {vendedor === 'Estoque' && isAdminUser && (
                <button
                  type="button"
                  onClick={() => { setEstoquePronto(true); formRef.current?.requestSubmit(); }}
                  disabled={orderDuplicate}
                  className="w-full border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 py-3 rounded-lg font-bold tracking-wider hover:bg-emerald-600/10 transition-colors text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cria o cinto já como item de estoque pronto — vai direto para a página Estoque."
                >
                  📦 ESTOQUE PRONTO
                </button>
              )}
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
          <FotoPedidoSidePanel
            url={currentFotoUrl}
            onClose={() => setMostrarFotoPainel(false)}
            onFinalizar={!isTemplate ? () => formRef.current?.requestSubmit() : undefined}
            onSaveDraft={!isTemplate ? handleSaveDraft : undefined}
            showEstoquePronto={!isTemplate && vendedor === 'Estoque' && isAdminUser}
            onEstoquePronto={() => { setEstoquePronto(true); formRef.current?.requestSubmit(); }}
            disabled={orderDuplicate}
          />
        )}
      </div>

      {/* ───── Templates Dialog ───── */}
      <TemplatesDialogWithValidity
        open={tmpl.showTemplates}
        onOpenChange={tmpl.setShowTemplates}
        templates={beltTemplates as any}
        search={tmpl.templateSearch}
        onSearchChange={tmpl.setTemplateSearch}
        selectedIds={bulkSelectedTemplateIds}
        onToggleSelect={toggleBulkTemplate}
        onClearSelection={() => setBulkSelectedTemplateIds([])}
        onUse={handleUseTemplate as any}
        onEdit={handleEditTemplate as any}
        onDelete={handleDeleteTemplate}
        onSendMany={openSendDialog as any}
        tipo="cinto"
      />


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
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4" onClick={() => {
          if (comprarMode) {
            if (onComprarEditar) onComprarEditar();
            else navigate('/modelos', { state: { editComprar: comprarModelo } });
          } else setShowMirror(false);
        }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl p-6 md:p-8 western-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-display font-bold mb-1 text-center">ESPELHO — CINTO</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Confira todas as informações antes de finalizar</p>

            <div className="space-y-5 mb-4">
              {/* ───── Composição do Pedido ───── */}
              {(() => {
                const items: [string, number][] = [];
                if (tamanhoPreco) items.push(['Tamanho: ' + tamanho, tamanhoPreco]);
                if (bordadoPPreco) items.push(['Bordado P', bordadoPPreco]);
                if (nomeBordadoPreco) items.push(['Nome Bordado', nomeBordadoPreco]);
                if (carimboPreco && carimbo) items.push([carimbo, carimboPreco]);
                if (adicionalPreco > 0) items.push(['Adicional' + (adicionalDesc ? ': ' + adicionalDesc : ''), adicionalPreco]);
                const subtotal = items.reduce((s, [, v]) => s + v, 0);
                return (
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="font-display font-bold text-base mb-3 text-center uppercase tracking-wide">Composição do Pedido</h3>
                    <div className="space-y-1.5">
                      {items.length === 0 && <p className="text-xs text-muted-foreground text-center italic">Nenhum item com preço selecionado ainda.</p>}
                      {items.map(([label, valor], i) => (
                        <div key={`${label}-${i}`} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                          <span className="text-foreground inline-flex items-center gap-1">
                            {label}
                            <InlineVariacaoOlhos names={extractVariationName(label)} />
                          </span>
                          <span className="text-primary font-semibold whitespace-nowrap ml-2">{formatCurrency(valor)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
                        <span className="font-semibold">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-lg pt-1">
                        <span className="font-display font-bold">Total</span>
                        <span className="font-display font-bold text-primary">{formatCurrency(subtotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {mirrorGrouped.map(grupo => (
                <div key={grupo.categoria}>
                  <h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-sm uppercase tracking-wide py-1.5 rounded-sm mb-2">
                    {grupo.categoria}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 px-1">
                    {grupo.itens.map(([label, value]) => (
                      <div key={label} className="flex justify-between py-1 border-b border-border/30">
                        <span className="text-sm text-muted-foreground">{label}:</span>
                        <span className="text-sm font-semibold text-right max-w-[60%] inline-flex items-center justify-end gap-1">
                          {value}
                          <InlineVariacaoOlhos names={String(value).split(/[,|/]|\s—\s/).map(s => s.trim())} size={12} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {observacao && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-semibold mb-1">Observação:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{observacao}</p>
                </div>
              )}
              {fotoUrl && (
                <div>
                  <span className="text-xs font-semibold">Foto de Referência:</span>
                  <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-2 break-all">
                    {fotoUrl.length > 60 ? fotoUrl.slice(0, 60) + '...' : fotoUrl} ↗
                  </a>
                </div>
              )}
            </div>


            <div className="flex gap-3">
              <button onClick={() => {
                if (comprarMode) {
                  if (onComprarEditar) onComprarEditar();
                  else navigate('/modelos', { state: { editComprar: comprarModelo } });
                } else setShowMirror(false);
              }} className="flex-1 bg-muted text-foreground py-3 rounded-lg font-bold hover:bg-muted/80 transition-colors">EDITAR</button>
              <button onClick={confirmOrder} disabled={submitting} className="flex-1 orange-gradient text-primary-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">{submitting ? 'Salvando...' : (estoquePronto ? 'CRIAR ESTOQUE' : 'OK — FINALIZAR')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </FichaEditProvider>
  );
};

export default BeltOrderPage;
