import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth, formatBrasiliaDate, formatBrasiliaTime } from '@/contexts/AuthContext';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { saveDraft, deleteDraft, Draft } from '@/lib/drafts';
import { supabase } from '@/integrations/supabase/client';
import { Link2, X, Eye, Plus, List, Trash2, Grid3X3, Search, Pencil, Check, Send, Inbox } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useTemplateManagement } from '@/hooks/useTemplateManagement';
import GradeEstoque, { GradeItem } from '@/components/GradeEstoque';
import SearchableSelect from '@/components/SearchableSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCustomOptions } from '@/hooks/useCustomOptions';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';
import { useDynamicFieldFilter } from '@/hooks/useDynamicFieldFilter';
import {
  MODELOS, TAMANHOS, GENEROS, ACESSORIOS, TIPOS_COURO, CORES_COURO, COURO_PRECOS, getCoresCouroFiltradas,
  BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA, LASER_OPTIONS, LASER_CANO_PRECO, LASER_GASPEA_PRECO, LASER_TALONEIRA_PRECO,
  GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO, GLITTER_TALONEIRA_PRECO,
  COR_GLITTER, COR_LINHA, COR_BORRACHINHA,
  COR_VIVO, DESENVOLVIMENTO, AREA_METAL, TIPO_METAL, COR_METAL,
  STRASS_PRECO, CRUZ_METAL_PRECO, BRIDAO_METAL_PRECO, CAVALO_METAL_PRECO,
  FRANJA_PRECO, CORRENTE_PRECO, SOLADO, COR_SOLA, COR_VIRA,
  CARIMBO, SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO,
  PINTURA_PRECO, TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, FORMATO_BICO,
  getModelosForTamanho,
  getSoladosForModelo, getBicosForModeloSolado, getCorSolaOptions, getCorViraOptions, getForma,
  HIDE_PESPONTO_EXTRAS,
} from '@/lib/orderFieldsConfig';

/* ───── helpers ───── */
const cls = {
  label: 'block text-sm font-semibold mb-1',
  select: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none',
  input: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none',
  inputSmall: 'bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none',
  checkItem: 'flex items-center gap-2 text-sm',
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-base font-display font-bold border-b border-border pb-1">{title}</h3>
    {children}
  </div>
);

const ToggleField = ({
  label, value, onChange, textValue, onTextChange, textPlaceholder,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void;
  textValue?: string; onTextChange?: (v: string) => void; textPlaceholder?: string;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <span className="text-sm font-semibold min-w-[120px]">{label}:</span>
    <select value={value ? 'tem' : 'nao'} onChange={e => onChange(e.target.value === 'tem')} className={cls.inputSmall + ' w-28'}>
      <option value="nao">Não tem</option>
      <option value="tem">Tem</option>
    </select>
    {value && textValue !== undefined && onTextChange && (
      <input type="text" value={textValue} onChange={e => onTextChange(e.target.value)} placeholder={textPlaceholder || 'Descreva...'} className={cls.inputSmall + ' flex-1 min-w-[180px]'} />
    )}
  </div>
);

const MultiSelect = ({
  label, items, selected, onChange,
}: {
  label: string; items: { label: string; preco: number }[]; selected: string[]; onChange: (v: string[]) => void;
}) => {
  const [search, setSearch] = useState('');
  const hasSearch = label.toLowerCase().includes('bordado') || label.toLowerCase().includes('laser');
  const filtered = search
    ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;
  const firstVariadoIdx = filtered.findIndex(i => i.label.startsWith('Bordado Variado'));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className={cls.label + ' mb-0 flex items-center gap-2'}>
          {label}
          {selected.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5">
              {selected.length} selecionado{selected.length > 1 ? 's' : ''}
            </span>
          )}
        </label>
      </div>
      {hasSearch && (
        <div className="relative mb-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={label.toLowerCase().includes('bordado') ? 'Pesquisar bordado...' : 'Pesquisar...'}
            className={cls.input + ' pl-8 !py-1.5 text-xs'}
          />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto border border-border rounded-lg p-3 bg-muted/50">
        {filtered.map((item, idx) => (
          <React.Fragment key={item.label}>
            {hasSearch && idx === firstVariadoIdx && firstVariadoIdx > 0 && (
              <div className="col-span-full text-xs font-bold text-muted-foreground uppercase tracking-wider border-t border-border pt-2 mt-1 mb-1">Bordados Variados</div>
            )}
            <label className={cls.checkItem}>
              <input type="checkbox" checked={selected.includes(item.label)} onChange={e => {
                if (e.target.checked) onChange([...selected, item.label]);
                else onChange(selected.filter(s => s !== item.label));
              }} className="accent-primary w-4 h-4" />
              <span>{item.label} {item.preco > 0 && <span className="text-muted-foreground text-xs">(R${item.preco})</span>}</span>
            </label>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/* ───── main component ───── */
const OrderPage = () => {
  const { isLoggedIn, user, addOrder, addOrderBatch, isAdmin, allProfiles, loading: authLoading } = useAuth();
  const { getByCategoria } = useCustomOptions();
  const { findFichaPrice, getByCustomCategory, loading: fichaLoading } = useFichaVariacoesLookup();
  const { getFilteredOptions } = useDynamicFieldFilter();

  /** Returns filtered color options for a leather part, using DB relationships with hardcoded fallback */
  const getDynCoresCouro = useCallback((tipoCouro: string, campoCouroSlug: string, campoCorSlug: string): string[] => {
    const dbResult = getFilteredOptions(campoCorSlug, { [campoCouroSlug]: tipoCouro });
    return dbResult ?? getCoresCouroFiltradas(tipoCouro);
  }, [getFilteredOptions]);
  const [showGrade, setShowGrade] = useState(false);
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as { draft?: Draft; templateData?: Record<string, string>; productChoice?: string } | null;
  const draftState = locState?.draft;
  const templateInit = locState?.templateData;
  const draftId_init = draftState?.id || '';
  const [draftId, setDraftId] = useState(draftId_init);
  const [productChoice, setProductChoice] = useState<'bota' | null>(draftState ? 'bota' : (locState?.productChoice === 'bota' ? 'bota' : null));
  const [mode, setMode] = useState<'order' | 'template'>('order');
  const tmpl = useTemplateManagement();
  // Restore draft or template form data
  const df = templateInit || draftState?.form || {};

  /* form state */
  const isAdminProducao = user?.role === 'admin_producao';
  const [vendedorSelecionado, setVendedorSelecionado] = useState(isAdminProducao ? '' : (user?.nomeCompleto || ''));
  const [numeroPedido, setNumeroPedido] = useState(draftState?.numeroPedido || '');
  const { isDuplicate: orderDuplicate } = useCheckDuplicateOrder(numeroPedido);
  const [cliente, setCliente] = useState(draftState?.cliente || df.cliente || '');
  const [tamanho, setTamanho] = useState(df.tamanho || '');
  const [genero, setGenero] = useState(df.genero || '');
  const [modelo, setModelo] = useState(df.modelo || '');
  const [sobMedida, setSobMedida] = useState(draftState?.sobMedida || false);
  const [sobMedidaDesc, setSobMedidaDesc] = useState(df.sobMedidaDesc || '');
  const [acessorios, setAcessorios] = useState<string[]>(df.acessorios ? df.acessorios.split('||') : []);

  // couros
  const [tipoCouroCano, setTipoCouroCano] = useState(df.tipoCouroCano || '');
  const [corCouroCano, setCorCouroCano] = useState(df.corCouroCano || '');
  const [tipoCouroGaspea, setTipoCouroGaspea] = useState(df.tipoCouroGaspea || '');
  const [corCouroGaspea, setCorCouroGaspea] = useState(df.corCouroGaspea || '');
  const [tipoCouroTaloneira, setTipoCouroTaloneira] = useState(df.tipoCouroTaloneira || '');
  const [corCouroTaloneira, setCorCouroTaloneira] = useState(df.corCouroTaloneira || '');

  // desenvolvimento (moved before bordados)
  const [desenvolvimento, setDesenvolvimento] = useState(df.desenvolvimento || '');

  // bordados
  const [bordadoCano, setBordadoCano] = useState<string[]>(df.bordadoCano ? df.bordadoCano.split('||') : []);
  const [corBordadoCano, setCorBordadoCano] = useState(df.corBordadoCano || '');
  const [bordadoGaspea, setBordadoGaspea] = useState<string[]>(df.bordadoGaspea ? df.bordadoGaspea.split('||') : []);
  const [corBordadoGaspea, setCorBordadoGaspea] = useState(df.corBordadoGaspea || '');
  const [bordadoTaloneira, setBordadoTaloneira] = useState<string[]>(df.bordadoTaloneira ? df.bordadoTaloneira.split('||') : []);
  const [corBordadoTaloneira, setCorBordadoTaloneira] = useState(df.corBordadoTaloneira || '');

  // bordado variado descriptions
  const [bordadoVariadoDescCano, setBordadoVariadoDescCano] = useState(df.bordadoVariadoDescCano || '');
  const [bordadoVariadoDescGaspea, setBordadoVariadoDescGaspea] = useState(df.bordadoVariadoDescGaspea || '');
  const [bordadoVariadoDescTaloneira, setBordadoVariadoDescTaloneira] = useState(df.bordadoVariadoDescTaloneira || '');

  // nome bordado
  const [nomeBordado, setNomeBordado] = useState(df.nomeBordado === 'true');
  const [nomeBordadoDesc, setNomeBordadoDesc] = useState(df.nomeBordadoDesc || '');

  // laser split by part
  const [laserCano, setLaserCano] = useState<string[]>(df.laserCano ? df.laserCano.split('||') : []);
  const [corGlitterCano, setCorGlitterCano] = useState(df.corGlitterCano || '');
  const [laserGaspea, setLaserGaspea] = useState<string[]>(df.laserGaspea ? df.laserGaspea.split('||') : []);
  const [corGlitterGaspea, setCorGlitterGaspea] = useState(df.corGlitterGaspea || '');
  const [laserTaloneira, setLaserTaloneira] = useState<string[]>(df.laserTaloneira ? df.laserTaloneira.split('||') : []);
  const [corGlitterTaloneira, setCorGlitterTaloneira] = useState(df.corGlitterTaloneira || '');
  const [corBordadoLaserCano, setCorBordadoLaserCano] = useState(df.corBordadoLaserCano || '');
  const [corBordadoLaserGaspea, setCorBordadoLaserGaspea] = useState(df.corBordadoLaserGaspea || '');
  const [corBordadoLaserTaloneira, setCorBordadoLaserTaloneira] = useState(df.corBordadoLaserTaloneira || '');

  // pintura (inside laser section)
  const [pintura, setPintura] = useState(df.pintura === 'true');
  const [pinturaDesc, setPinturaDesc] = useState(df.pinturaDesc || '');

  // estampa (repositioned before pesponto)
  const [estampa, setEstampa] = useState(df.estampa === 'true');
  const [estampaDesc, setEstampaDesc] = useState(df.estampaDesc || '');

  // pesponto
  const [corLinha, setCorLinha] = useState(df.corLinha || '');
  const [corBorrachinha, setCorBorrachinha] = useState(df.corBorrachinha || '');
  const [corVivo, setCorVivo] = useState(df.corVivo || '');

  // metais
  const [areaMetal, setAreaMetal] = useState(df.areaMetal || '');
  const [tipoMetal, setTipoMetal] = useState<string[]>(df.tipoMetal ? df.tipoMetal.split('||') : []);
  const [corMetal, setCorMetal] = useState(df.corMetal || '');
  const [strass, setStrass] = useState(df.strass === 'true');
  const [strassQtd, setStrassQtd] = useState(Number(df.strassQtd) || 0);
  const [cruzMetal, setCruzMetal] = useState(df.cruzMetal === 'true');
  const [cruzMetalQtd, setCruzMetalQtd] = useState(Number(df.cruzMetalQtd) || 0);
  const [bridaoMetal, setBridaoMetal] = useState(df.bridaoMetal === 'true');
  const [bridaoMetalQtd, setBridaoMetalQtd] = useState(Number(df.bridaoMetalQtd) || 0);
  const [cavaloMetal, setCavaloMetal] = useState(df.cavaloMetal === 'true');
  const [cavaloMetalQtd, setCavaloMetalQtd] = useState(Number(df.cavaloMetalQtd) || 0);

  // extras (tiras + tricê)
  const [trice, setTrice] = useState(df.trice === 'true');
  const [triceDesc, setTriceDesc] = useState(df.triceDesc || '');
  const [tiras, setTiras] = useState(df.tiras === 'true');
  const [tirasDesc, setTirasDesc] = useState(df.tirasDesc || '');
  const [franja, setFranja] = useState(df.franja === 'true');
  const [franjaCouro, setFranjaCouro] = useState(df.franjaCouro || '');
  const [franjaCor, setFranjaCor] = useState(df.franjaCor || '');
  const [corrente, setCorrente] = useState(df.corrente === 'true');
  const [correnteCor, setCorrenteCor] = useState(df.correnteCor || '');

  // solados
  const [solado, setSolado] = useState(df.solado || '');
  const [formatoBico, setFormatoBico] = useState(df.formatoBico || '');
  const [corSola, setCorSola] = useState(df.corSola || '');
  const [corVira, setCorVira] = useState(df.corVira || '');
  const [costuraAtras, setCosturaAtras] = useState(df.costuraAtras === 'true');

  // carimbo
  const [carimbo, setCarimbo] = useState(df.carimbo || '');
  const [carimboDesc, setCarimboDesc] = useState(df.carimboDesc || '');

  // adicional
  const [adicionalDesc, setAdicionalDesc] = useState(df.adicionalDesc || '');
  const [adicionalValor, setAdicionalValor] = useState(Number(df.adicionalValor) || 0);

  const [observacao, setObservacao] = useState(df.observacao || '');
  const [fotoUrl, setFotoUrl] = useState(draftState?.fotos?.[0] || '');
  const [showMirror, setShowMirror] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [laserOutroCanoText, setLaserOutroCanoText] = useState(df.laserOutroCanoText || '');
  const [laserOutroGaspeaText, setLaserOutroGaspeaText] = useState(df.laserOutroGaspeaText || '');
  const [laserOutroTaloneiraText, setLaserOutroTaloneiraText] = useState(df.laserOutroTaloneiraText || '');

  

  /* ───── cascading field handlers ───── */
  const handleModeloChange = (newModelo: string) => {
    setModelo(newModelo);
    const sols = getSoladosForModelo(newModelo);
    const newSolado = sols.length === 1 ? sols[0].label : (sols.find(s => s.label === solado) ? solado : '');
    setSolado(newSolado);
    const bicos = getBicosForModeloSolado(newModelo, newSolado);
    const newBico = bicos.length === 1 ? bicos[0] : (bicos.includes(formatoBico) ? formatoBico : '');
    setFormatoBico(newBico);
    const cso = getCorSolaOptions(newModelo, newSolado, newBico);
    setCorSola(cso === null ? '' : cso.length === 1 ? cso[0].label : (cso.find(c => c.label === corSola) ? corSola : ''));
    const cv = getCorViraOptions(newModelo, newSolado);
    setCorVira(cv.length === 1 ? cv[0].label : (cv.find(c => c.label === corVira) ? corVira : ''));
    if (HIDE_PESPONTO_EXTRAS.includes(newModelo)) {
      setCorBorrachinha('');
      setCorVivo('');
    }
  };

  const handleSoladoChange = (newSolado: string) => {
    setSolado(newSolado);
    const bicos = getBicosForModeloSolado(modelo, newSolado);
    const newBico = bicos.length === 1 ? bicos[0] : (bicos.includes(formatoBico) ? formatoBico : '');
    setFormatoBico(newBico);
    const cso = getCorSolaOptions(modelo, newSolado, newBico);
    setCorSola(cso === null ? '' : cso.length === 1 ? cso[0].label : (cso.find(c => c.label === corSola) ? corSola : ''));
    const cv = getCorViraOptions(modelo, newSolado);
    setCorVira(cv.length === 1 ? cv[0].label : (cv.find(c => c.label === corVira) ? corVira : ''));
  };

  const handleBicoChange = (newBico: string) => {
    setFormatoBico(newBico);
    const sols = getSoladosForModelo(modelo, newBico);
    const newSolado = sols.find(s => s.label === solado) ? solado : (sols.length === 1 ? sols[0].label : '');
    if (newSolado !== solado) setSolado(newSolado);
    const cso = getCorSolaOptions(modelo, newSolado, newBico);
    setCorSola(cso === null ? '' : cso.length === 1 ? cso[0].label : (cso.find(c => c.label === corSola) ? corSola : ''));
  };

  // Build form data object from current state
  const buildFormData = useCallback((): Record<string, string> => ({
    modelo, sobMedidaDesc,
    acessorios: acessorios.join('||'),
    tipoCouroCano, corCouroCano, tipoCouroGaspea, corCouroGaspea, tipoCouroTaloneira, corCouroTaloneira,
    desenvolvimento,
    bordadoCano: bordadoCano.join('||'), corBordadoCano,
    bordadoGaspea: bordadoGaspea.join('||'), corBordadoGaspea,
    bordadoTaloneira: bordadoTaloneira.join('||'), corBordadoTaloneira,
    bordadoVariadoDescCano, bordadoVariadoDescGaspea, bordadoVariadoDescTaloneira,
    nomeBordado: String(nomeBordado), nomeBordadoDesc,
    laserCano: laserCano.join('||'), corGlitterCano,
    laserGaspea: laserGaspea.join('||'), corGlitterGaspea,
    laserTaloneira: laserTaloneira.join('||'), corGlitterTaloneira,
    laserOutroCanoText, laserOutroGaspeaText, laserOutroTaloneiraText,
    pintura: String(pintura), pinturaDesc,
    estampa: String(estampa), estampaDesc,
    corLinha, corBorrachinha, corVivo,
    areaMetal, tipoMetal: tipoMetal.join('||'), corMetal,
    strass: String(strass), strassQtd: String(strassQtd),
    cruzMetal: String(cruzMetal), cruzMetalQtd: String(cruzMetalQtd),
    bridaoMetal: String(bridaoMetal), bridaoMetalQtd: String(bridaoMetalQtd),
    cavaloMetal: String(cavaloMetal), cavaloMetalQtd: String(cavaloMetalQtd),
    trice: String(trice), triceDesc,
    tiras: String(tiras), tirasDesc,
    franja: String(franja), franjaCouro, franjaCor,
    corrente: String(corrente), correnteCor,
    corBordadoLaserCano, corBordadoLaserGaspea, corBordadoLaserTaloneira,
    solado, formatoBico, corSola, corVira, costuraAtras: String(costuraAtras),
    carimbo, carimboDesc,
    adicionalDesc, adicionalValor: String(adicionalValor),
    observacao, sobMedida: String(sobMedida),
  }), [modelo, sobMedidaDesc, acessorios, tipoCouroCano, corCouroCano, tipoCouroGaspea, corCouroGaspea, tipoCouroTaloneira, corCouroTaloneira, desenvolvimento, bordadoCano, corBordadoCano, bordadoGaspea, corBordadoGaspea, bordadoTaloneira, corBordadoTaloneira, bordadoVariadoDescCano, bordadoVariadoDescGaspea, bordadoVariadoDescTaloneira, nomeBordado, nomeBordadoDesc, laserCano, corGlitterCano, laserGaspea, corGlitterGaspea, laserTaloneira, corGlitterTaloneira, laserOutroCanoText, laserOutroGaspeaText, laserOutroTaloneiraText, pintura, pinturaDesc, estampa, estampaDesc, corLinha, corBorrachinha, corVivo, areaMetal, tipoMetal, corMetal, strass, strassQtd, cruzMetal, cruzMetalQtd, bridaoMetal, bridaoMetalQtd, cavaloMetal, cavaloMetalQtd, trice, triceDesc, tiras, tirasDesc, franja, franjaCouro, franjaCor, corrente, correnteCor, corBordadoLaserCano, corBordadoLaserGaspea, corBordadoLaserTaloneira, solado, formatoBico, corSola, corVira, costuraAtras, carimbo, carimboDesc, adicionalDesc, adicionalValor, observacao, sobMedida]);

  // Populate all form fields from template data
  const populateFormFromTemplate = useCallback((fd: Record<string, string>) => {
    setModelo(fd.modelo || '');
    setSobMedida(fd.sobMedida === 'true');
    setSobMedidaDesc(fd.sobMedidaDesc || '');
    setAcessorios(fd.acessorios ? fd.acessorios.split('||') : []);
    setTipoCouroCano(fd.tipoCouroCano || '');
    setCorCouroCano(fd.corCouroCano || '');
    setTipoCouroGaspea(fd.tipoCouroGaspea || '');
    setCorCouroGaspea(fd.corCouroGaspea || '');
    setTipoCouroTaloneira(fd.tipoCouroTaloneira || '');
    setCorCouroTaloneira(fd.corCouroTaloneira || '');
    setDesenvolvimento(fd.desenvolvimento || '');
    setBordadoCano(fd.bordadoCano ? fd.bordadoCano.split('||') : []);
    setCorBordadoCano(fd.corBordadoCano || '');
    setBordadoGaspea(fd.bordadoGaspea ? fd.bordadoGaspea.split('||') : []);
    setCorBordadoGaspea(fd.corBordadoGaspea || '');
    setBordadoTaloneira(fd.bordadoTaloneira ? fd.bordadoTaloneira.split('||') : []);
    setCorBordadoTaloneira(fd.corBordadoTaloneira || '');
    setBordadoVariadoDescCano(fd.bordadoVariadoDescCano || '');
    setBordadoVariadoDescGaspea(fd.bordadoVariadoDescGaspea || '');
    setBordadoVariadoDescTaloneira(fd.bordadoVariadoDescTaloneira || '');
    setNomeBordado(fd.nomeBordado === 'true');
    setNomeBordadoDesc(fd.nomeBordadoDesc || '');
    setLaserCano(fd.laserCano ? fd.laserCano.split('||') : []);
    setCorGlitterCano(fd.corGlitterCano || '');
    setLaserGaspea(fd.laserGaspea ? fd.laserGaspea.split('||') : []);
    setCorGlitterGaspea(fd.corGlitterGaspea || '');
    setLaserTaloneira(fd.laserTaloneira ? fd.laserTaloneira.split('||') : []);
    setCorGlitterTaloneira(fd.corGlitterTaloneira || '');
    setCorBordadoLaserCano(fd.corBordadoLaserCano || '');
    setCorBordadoLaserGaspea(fd.corBordadoLaserGaspea || '');
    setCorBordadoLaserTaloneira(fd.corBordadoLaserTaloneira || '');
    setLaserOutroCanoText(fd.laserOutroCanoText || '');
    setLaserOutroGaspeaText(fd.laserOutroGaspeaText || '');
    setLaserOutroTaloneiraText(fd.laserOutroTaloneiraText || '');
    setPintura(fd.pintura === 'true');
    setPinturaDesc(fd.pinturaDesc || '');
    setEstampa(fd.estampa === 'true');
    setEstampaDesc(fd.estampaDesc || '');
    setCorLinha(fd.corLinha || '');
    setCorBorrachinha(fd.corBorrachinha || '');
    setCorVivo(fd.corVivo || '');
    setAreaMetal(fd.areaMetal || '');
    setTipoMetal(fd.tipoMetal ? fd.tipoMetal.split('||') : []);
    setCorMetal(fd.corMetal || '');
    setStrass(fd.strass === 'true');
    setStrassQtd(Number(fd.strassQtd) || 0);
    setCruzMetal(fd.cruzMetal === 'true');
    setCruzMetalQtd(Number(fd.cruzMetalQtd) || 0);
    setBridaoMetal(fd.bridaoMetal === 'true');
    setBridaoMetalQtd(Number(fd.bridaoMetalQtd) || 0);
    setCavaloMetal(fd.cavaloMetal === 'true');
    setCavaloMetalQtd(Number(fd.cavaloMetalQtd) || 0);
    setTrice(fd.trice === 'true');
    setTriceDesc(fd.triceDesc || '');
    setTiras(fd.tiras === 'true');
    setTirasDesc(fd.tirasDesc || '');
    setFranja(fd.franja === 'true');
    setFranjaCouro(fd.franjaCouro || '');
    setFranjaCor(fd.franjaCor || '');
    setCorrente(fd.corrente === 'true');
    setCorrenteCor(fd.correnteCor || '');
    setSolado(fd.solado || '');
    setFormatoBico(fd.formatoBico || '');
    setCorSola(fd.corSola || '');
    setCorVira(fd.corVira || '');
    setCosturaAtras(fd.costuraAtras === 'true');
    setCarimbo(fd.carimbo || '');
    setCarimboDesc(fd.carimboDesc || '');
    setAdicionalDesc(fd.adicionalDesc || '');
    setAdicionalValor(Number(fd.adicionalValor) || 0);
    setObservacao(fd.observacao || '');
  }, []);

  // Template handlers using hook
  const handleSaveTemplate = async () => {
    if (!user) return;
    const success = await tmpl.saveTemplate(user.id, buildFormData());
    if (success) {
      setMode('order');
      resetForm();
    }
  };

  const handleUpdateTemplate = async () => {
    if (!user) return;
    const success = await tmpl.updateTemplate(buildFormData());
    if (success) {
      setMode('order');
      resetForm();
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!user) return;
    await tmpl.deleteTemplate(id, user.id);
  };

  /* ───── envio de modelos ───── */
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<typeof tmpl.templates[number] | null>(null);
  const [usersList, setUsersList] = useState<{ id: string; nome_completo: string; nome_usuario: string }[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [sendingInProgress, setSendingInProgress] = useState(false);

  const openSendDialog = async (template: typeof tmpl.templates[number]) => {
    if (!user) return;
    setSendingTemplate(template);
    setSelectedRecipients([]);
    setRecipientSearch('');
    setSendDialogOpen(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, nome_completo, nome_usuario')
      .neq('id', user.id)
      .order('nome_completo', { ascending: true });
    setUsersList((data as any) || []);
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmSendTemplate = async () => {
    if (!user || !sendingTemplate || selectedRecipients.length === 0) return;
    setSendingInProgress(true);
    const ok = await tmpl.sendTemplateToUsers(
      sendingTemplate,
      selectedRecipients,
      user.id,
      user.nomeCompleto || user.nomeUsuario || 'Usuário',
    );
    setSendingInProgress(false);
    if (ok) {
      setSendDialogOpen(false);
      setSendingTemplate(null);
      setSelectedRecipients([]);
    }
  };


  /* ───── items from DB (with static fallback) ───── */
  const sortAlpha = (arr: {label:string;preco:number}[]) => {
    const normal = arr.filter(i => !i.label.toLowerCase().startsWith('bordado variado'));
    const variado = arr.filter(i => i.label.toLowerCase().startsWith('bordado variado'));
    normal.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    variado.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    return [...normal, ...variado];
  };
  const getDbItems = (cat: string, fallback: {label:string;preco:number}[]) => {
    const ficha = getByCustomCategory(cat);
    if (ficha.length > 0) return sortAlpha(ficha);
    const db = getByCategoria(cat);
    if (db.length > 0) return sortAlpha(db.map(o => ({ label: o.label, preco: o.preco })));
    return sortAlpha(fallback);
  };
  const mergedBordadoCano = getDbItems('bordado_cano', BORDADOS_CANO);
  const mergedBordadoGaspea = getDbItems('bordado_gaspea', BORDADOS_GASPEA);
  const mergedBordadoTaloneira = getDbItems('bordado_taloneira', BORDADOS_TALONEIRA);
  const getLaserItems = (cat: string) => {
    const db = getByCategoria(cat);
    if (db.length === 0) return sortAlpha(LASER_OPTIONS.map(l => ({ label: l, preco: 0 })));
    return sortAlpha(db.map(o => ({ label: o.label, preco: o.preco })));
  };
  const mergedLaserCano = getLaserItems('laser_cano');
  const mergedLaserGaspea = getLaserItems('laser_gaspea');
  const mergedLaserTaloneira = getLaserItems('laser_taloneira');

  /* ───── form data validation (shared by templates & drafts) ───── */
  const validateFormData = useCallback((fd: Record<string, string>): { cleanedData: Record<string, string>; warnings: string[] } => {
    const warnings: string[] = [];
    const cleaned = { ...fd };

    const checkSingle = (key: string, label: string, options: string[]) => {
      if (cleaned[key] && !options.includes(cleaned[key])) {
        warnings.push(`${label}: "${cleaned[key]}" não existe mais`);
        cleaned[key] = '';
      }
    };

    const checkMulti = (key: string, label: string, options: string[]) => {
      if (!cleaned[key]) return;
      const saved = cleaned[key].split('||').filter(Boolean);
      const removed = saved.filter(v => !options.includes(v));
      if (removed.length > 0) {
        warnings.push(`${label}: ${removed.map(r => `"${r}"`).join(', ')} removido(s)`);
        cleaned[key] = saved.filter(v => options.includes(v)).join('||');
      }
    };

    checkSingle('modelo', 'Modelo', MODELOS.map(m => m.label));
    checkSingle('tipoCouroCano', 'Couro Cano', TIPOS_COURO as string[]);
    checkSingle('tipoCouroGaspea', 'Couro Gáspea', TIPOS_COURO as string[]);
    checkSingle('tipoCouroTaloneira', 'Couro Taloneira', TIPOS_COURO as string[]);
    checkSingle('corLinha', 'Cor da Linha', COR_LINHA as string[]);
    checkSingle('corBorrachinha', 'Cor da Borrachinha', COR_BORRACHINHA as string[]);
    checkSingle('corVivo', 'Cor do Vivo', COR_VIVO as string[]);
    checkSingle('desenvolvimento', 'Desenvolvimento', DESENVOLVIMENTO.map(d => d.label));
    checkSingle('areaMetal', 'Área do Metal', AREA_METAL.map(a => a.label));
    checkSingle('corMetal', 'Cor do Metal', COR_METAL);
    checkSingle('solado', 'Solado', SOLADO.map(s => s.label));
    checkSingle('formatoBico', 'Formato do Bico', FORMATO_BICO);
    checkSingle('corVira', 'Cor da Vira', COR_VIRA.map(c => c.label));
    checkSingle('carimbo', 'Carimbo', CARIMBO.map(c => c.label));

    const labels = (items: { label: string }[]) => items.map(i => i.label);
    checkMulti('bordadoCano', 'Bordado Cano', labels(mergedBordadoCano));
    checkMulti('bordadoGaspea', 'Bordado Gáspea', labels(mergedBordadoGaspea));
    checkMulti('bordadoTaloneira', 'Bordado Taloneira', labels(mergedBordadoTaloneira));
    checkMulti('laserCano', 'Laser Cano', labels(mergedLaserCano));
    checkMulti('laserGaspea', 'Laser Gáspea', labels(mergedLaserGaspea));
    checkMulti('laserTaloneira', 'Laser Taloneira', labels(mergedLaserTaloneira));
    checkMulti('tipoMetal', 'Tipo de Metal', TIPO_METAL);
    checkMulti('acessorios', 'Acessórios', ACESSORIOS.map(a => a.label));

    return { cleanedData: cleaned, warnings };
  }, [mergedBordadoCano, mergedBordadoGaspea, mergedBordadoTaloneira, mergedLaserCano, mergedLaserGaspea, mergedLaserTaloneira]);

  const validateAndPopulateTemplate = (fd: Record<string, string>) => {
    const { cleanedData, warnings } = validateFormData(fd);
    if (warnings.length > 0) {
      toast.warning('Variações removidas ou renomeadas', {
        description: warnings.join('\n'),
        duration: 8000,
      });
    }
    populateFormFromTemplate(cleanedData);
  };

  /* ───── draft validation on load ───── */
  const draftValidatedRef = useRef(false);
  useEffect(() => {
    if (draftValidatedRef.current || !draftState || fichaLoading) return;
    draftValidatedRef.current = true;
    const { cleanedData, warnings } = validateFormData(draftState.form);
    if (warnings.length > 0) {
      toast.warning('Rascunho: variações removidas ou renomeadas', {
        description: warnings.join('\n'),
        duration: 8000,
      });
      populateFormFromTemplate(cleanedData);
    }
  }, [draftState, fichaLoading, validateFormData, populateFormFromTemplate]);

  /* ───── carregar templates no mount para mostrar contador de não vistos ───── */
  const templatesLoadedRef = useRef(false);
  useEffect(() => {
    if (templatesLoadedRef.current || !user) return;
    templatesLoadedRef.current = true;
    (async () => {
      await tmpl.loadTemplates(user.id);
      // Consulta direta para contar e descrever recebidos (não depende do state)
      const { data } = await supabase
        .from('order_templates')
        .select('sent_by_name')
        .eq('user_id', user.id)
        .eq('seen', false);
      const recebidos = (data as any[]) || [];
      if (recebidos.length > 0) {
        const remetentes = Array.from(new Set(recebidos.map(t => t.sent_by_name).filter(Boolean)));
        const desc = remetentes.length === 1
          ? `de ${remetentes[0]}`
          : `de ${remetentes.length} usuários`;
        toast.info(`Você recebeu ${recebidos.length} novo${recebidos.length > 1 ? 's' : ''} modelo${recebidos.length > 1 ? 's' : ''} ${desc}`, { duration: 6000 });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleUseTemplate = (formData: Record<string, string>) => {
    tmpl.setShowTemplates(false);
    validateAndPopulateTemplate({ ...formData });
    setProductChoice('bota');
  };

  const handleEditTemplate = (template: { id: string; nome: string; form_data: Record<string, string> }) => {
    tmpl.startEditing(template);
    validateAndPopulateTemplate({ ...template.form_data });
    setMode('template');
    setProductChoice('bota');
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

  // Product selection screen
  if (!productChoice) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-6 text-center">Faça seu Pedido</h1>
          <p className="text-center text-muted-foreground mb-8">Selecione o tipo de produto:</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <button
              onClick={() => setProductChoice('bota')}
              className="bg-card rounded-xl p-8 western-shadow hover:shadow-xl transition-shadow text-center group"
            >
              <div className="text-5xl mb-4">👢</div>
              <h2 className="text-xl font-display font-bold mb-2 group-hover:text-primary transition-colors">Bota</h2>
              <p className="text-sm text-muted-foreground">Ficha de produção completa para botas</p>
            </button>
            <button
              onClick={() => navigate('/pedido-cinto')}
              className="bg-card rounded-xl p-8 western-shadow hover:shadow-xl transition-shadow text-center group"
            >
              <div className="text-5xl mb-4">🪢</div>
              <h2 className="text-xl font-display font-bold mb-2 group-hover:text-primary transition-colors">Cinto</h2>
              <p className="text-sm text-muted-foreground">Ficha de produção para cintos</p>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ───── price calculation ───── */
  const modeloPreco = MODELOS.find(m => m.label === modelo)?.preco || 0;
  const acessoriosPreco = acessorios.reduce((sum, a) => sum + (ACESSORIOS.find(x => x.label === a)?.preco || 0), 0);
  const couroPreco = [
    [tipoCouroCano, 'couro_cano'],
    [tipoCouroGaspea, 'couro_gaspea'],
    [tipoCouroTaloneira, 'couro_taloneira'],
  ].reduce((sum, [t, cat]) => sum + (findFichaPrice(t, cat) ?? COURO_PRECOS[t] ?? 0), 0);
  const findPrice = (b: string, cat: string, fallback: {label:string;preco:number}[]) =>
    findFichaPrice(b, cat) ?? getByCategoria(cat).find(x => x.label === b)?.preco ?? fallback.find(x => x.label === b)?.preco ?? 0;
  const bordadoPreco =
    bordadoCano.reduce((sum, b) => sum + findPrice(b, 'bordado_cano', BORDADOS_CANO), 0) +
    bordadoGaspea.reduce((sum, b) => sum + findPrice(b, 'bordado_gaspea', BORDADOS_GASPEA), 0) +
    bordadoTaloneira.reduce((sum, b) => sum + findPrice(b, 'bordado_taloneira', BORDADOS_TALONEIRA), 0);

  const laserCanoPreco = laserCano.length > 0 ? (findPrice(laserCano[0], 'laser_cano', []) || LASER_CANO_PRECO) : 0;
  const glitterCanoPreco = corGlitterCano ? GLITTER_CANO_PRECO : 0;
  const laserGaspeaPreco = laserGaspea.length > 0 ? (findPrice(laserGaspea[0], 'laser_gaspea', []) || LASER_GASPEA_PRECO) : 0;
  const glitterGaspeaPreco = corGlitterGaspea ? GLITTER_GASPEA_PRECO : 0;
  const laserTaloneiraPreco = laserTaloneira.length > 0 ? (findPrice(laserTaloneira[0], 'laser_taloneira', []) || LASER_TALONEIRA_PRECO) : 0;
  const glitterTaloneiraPreco = corGlitterTaloneira ? GLITTER_TALONEIRA_PRECO : 0;
  const totalLaserPreco = laserCanoPreco + glitterCanoPreco + laserGaspeaPreco + glitterGaspeaPreco + laserTaloneiraPreco + glitterTaloneiraPreco;

  const desenvPreco = DESENVOLVIMENTO.find(d => d.label === desenvolvimento)?.preco || 0;
  const areaMetalPreco = AREA_METAL.find(a => a.label === areaMetal)?.preco || 0;
  const strassPreco = strass ? strassQtd * STRASS_PRECO : 0;
  const cruzMetalPrecoTotal = cruzMetal ? cruzMetalQtd * CRUZ_METAL_PRECO : 0;
  const bridaoMetalPrecoTotal = bridaoMetal ? bridaoMetalQtd * BRIDAO_METAL_PRECO : 0;
  const cavaloMetalPrecoTotal = cavaloMetal ? cavaloMetalQtd * CAVALO_METAL_PRECO : 0;
  const soladoPreco = SOLADO.find(s => s.label === solado)?.preco || 0;
  const corSolaOptsForPrice = getCorSolaOptions(modelo, solado, formatoBico);
  const corSolaPreco = corSolaOptsForPrice?.find(c => c.label === corSola)?.preco || 0;
  const corViraPreco = COR_VIRA.find(c => c.label === corVira)?.preco || 0;
  const carimboPreco = CARIMBO.find(c => c.label === carimbo)?.preco || 0;

  const hasAnyLaser = laserCano.length > 0 || laserGaspea.length > 0 || laserTaloneira.length > 0;

  const total = modeloPreco
    + (sobMedida ? SOB_MEDIDA_PRECO : 0)
    + acessoriosPreco + couroPreco + bordadoPreco
    + (nomeBordado ? NOME_BORDADO_PRECO : 0)
    + totalLaserPreco
    + (pintura ? PINTURA_PRECO : 0)
    + (estampa ? ESTAMPA_PRECO : 0)
    + desenvPreco + areaMetalPreco + strassPreco + cruzMetalPrecoTotal + bridaoMetalPrecoTotal + cavaloMetalPrecoTotal
    + (trice ? TRICE_PRECO : 0)
    + (tiras ? TIRAS_PRECO : 0)
    + (franja ? FRANJA_PRECO : 0)
    + (corrente ? CORRENTE_PRECO : 0)
    + soladoPreco + corSolaPreco + corViraPreco
    + (costuraAtras ? COSTURA_ATRAS_PRECO : 0)
    + carimboPreco
    + (adicionalValor > 0 ? adicionalValor : 0);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const fotos = fotoUrl.trim() ? [fotoUrl.trim()] : [];

  /* ───── submit ───── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isGradeVendedor = isAdmin && (vendedorSelecionado === 'Estoque' || vendedorSelecionado === 'Juliana Cristina Ribeiro');
    const isEstoqueGrade = isGradeVendedor && gradeItems.length > 0;
    if (isAdminProducao && (!vendedorSelecionado || vendedorSelecionado === user?.nomeCompleto)) {
      toast.error('Por favor, selecione um vendedor válido.');
      return;
    }
    const required: [string, string][] = [
      [numeroPedido.trim(), 'Número do Pedido'],
      ...(!isEstoqueGrade ? [[tamanho, 'Tamanho'] as [string, string]] : []),
      ...(vendedorSelecionado === 'Juliana Cristina Ribeiro' ? [[cliente.trim(), 'Cliente'] as [string, string]] : []),
      [genero, 'Gênero'],
      [modelo, 'Modelo'],
      [tipoCouroCano, 'Tipo do Couro do Cano'],
      [corCouroCano, 'Cor do Couro do Cano'],
      [tipoCouroGaspea, 'Tipo do Couro da Gáspea'],
      [corCouroGaspea, 'Cor do Couro da Gáspea'],
      [tipoCouroTaloneira, 'Tipo do Couro da Taloneira'],
      [corCouroTaloneira, 'Cor do Couro da Taloneira'],
      [corLinha, 'Cor da Linha'],
      ...(!HIDE_PESPONTO_EXTRAS.includes(modelo) ? [
        [corBorrachinha, 'Cor da Borrachinha'] as [string, string],
        [corVivo, 'Cor do Vivo'] as [string, string],
      ] : []),
      [solado, 'Tipo do Solado'],
      [formatoBico, 'Formato do Bico'],
      ...(getCorSolaOptions(modelo, solado, formatoBico) !== null ? [[corSola, 'Cor da Sola'] as [string, string]] : []),
      [corVira, 'Cor da Vira'],
    ];
    const missing = required.filter(([val]) => !val);
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.map(([, l]) => l).join(', ')}`);
      return;
    }
    // Validate bordado variado descriptions
    const variadoChecks: [string[], string, string][] = [
      [bordadoCano, bordadoVariadoDescCano, 'Descrição do Bordado Variado (Cano)'],
      [bordadoGaspea, bordadoVariadoDescGaspea, 'Descrição do Bordado Variado (Gáspea)'],
      [bordadoTaloneira, bordadoVariadoDescTaloneira, 'Descrição do Bordado Variado (Taloneira)'],
    ];
    const missingVariado = variadoChecks.filter(([sel, desc]) => sel.some(s => s.includes('Bordado Variado')) && !desc.trim());
    if (missingVariado.length > 0) {
      toast.error(`Preencha: ${missingVariado.map(([,, l]) => l).join(', ')}`);
      return;
    }
    // Validate toggle descriptions (TEM requires description)
    const toggleChecks: [boolean, string, string][] = [
      [sobMedida, sobMedidaDesc, 'Sob Medida'],
      [nomeBordado, nomeBordadoDesc, 'Nome Bordado'],
      [pintura, pinturaDesc, 'Pintura'],
      [estampa, estampaDesc, 'Estampa'],
      [trice, triceDesc, 'Tricê'],
      [tiras, tirasDesc, 'Tiras'],
    ];
    const missingDesc = toggleChecks.filter(([active, desc]) => active && !desc.trim());
    if (missingDesc.length > 0) {
      toast.error(`Preencha a descrição de: ${missingDesc.map(([,, l]) => l).join(', ')}`);
      return;
    }
    if (!fotoUrl.trim()) {
      toast.error('Cole o link da foto de referência!');
      return;
    }
    setShowMirror(true);
  };

  const buildOrderData = () => ({
    cliente: cliente.trim(),
    vendedor: isAdmin ? vendedorSelecionado : (user?.nomeCompleto || ''),
    genero, modelo, sobMedida, sobMedidaDesc,
    solado, formatoBico, quantidade: 1, preco: total, temLaser: hasAnyLaser, fotos,
    couroGaspea: tipoCouroGaspea, couroCano: tipoCouroCano, couroTaloneira: tipoCouroTaloneira,
    corCouroGaspea, corCouroCano, corCouroTaloneira,
    bordadoCano: bordadoCano.join(', '), bordadoGaspea: bordadoGaspea.join(', '),
    bordadoTaloneira: bordadoTaloneira.join(', '),
    corBordadoCano, corBordadoGaspea, corBordadoTaloneira,
    bordadoVariadoDescCano, bordadoVariadoDescGaspea, bordadoVariadoDescTaloneira,
    nomeBordadoDesc: nomeBordado ? nomeBordadoDesc : '',
    laserCano: laserCano.map(l => l === 'Outro' && laserOutroCanoText ? laserOutroCanoText : l).join(', '), corGlitterCano,
    laserGaspea: laserGaspea.map(l => l === 'Outro' && laserOutroGaspeaText ? laserOutroGaspeaText : l).join(', '), corGlitterGaspea,
    laserTaloneira: laserTaloneira.map(l => l === 'Outro' && laserOutroTaloneiraText ? laserOutroTaloneiraText : l).join(', '), corGlitterTaloneira,
    pintura: pintura ? 'Sim' : '', pinturaDesc,
    estampa: estampa ? 'Sim' : '', estampaDesc,
    corLinha, corBorrachinha,
    trisce: trice ? 'Sim' : 'Não', triceDesc,
    tiras: tiras ? 'Sim' : 'Não', tirasDesc,
    metais: areaMetal, tipoMetal: tipoMetal.join(', '), corMetal,
    strassQtd: strass ? strassQtd : 0,
    cruzMetalQtd: cruzMetal ? cruzMetalQtd : 0,
    bridaoMetalQtd: bridaoMetal ? bridaoMetalQtd : 0,
    acessorios: acessorios.join(', '),
    desenvolvimento, observacao,
    corVira, corVivo, corSola,
    forma: getForma(modelo, formatoBico),
    costuraAtras: costuraAtras ? 'Sim' : '',
    carimbo, carimboDesc,
    adicionalDesc, adicionalValor: adicionalValor > 0 ? adicionalValor : 0,
    personalizacaoNome: nomeBordado ? nomeBordadoDesc : '',
    personalizacaoBordado: '',
    extraDetalhes: {
      cavaloMetal, cavaloMetalQtd: cavaloMetal ? cavaloMetalQtd : 0,
      franja, franjaCouro, franjaCor,
      corrente, correnteCor,
      corBordadoLaserCano, corBordadoLaserGaspea, corBordadoLaserTaloneira,
    },
  });


  const resetForm = useCallback(() => {
    setVendedorSelecionado(isAdminProducao ? '' : (user?.nomeCompleto || ''));
    setNumeroPedido('');
    setCliente('');
    setTamanho(''); setGenero(''); setModelo('');
    setSobMedida(false); setSobMedidaDesc('');
    setAcessorios([]);
    setTipoCouroCano(''); setCorCouroCano('');
    setTipoCouroGaspea(''); setCorCouroGaspea('');
    setTipoCouroTaloneira(''); setCorCouroTaloneira('');
    setDesenvolvimento('');
    setBordadoCano([]); setCorBordadoCano('');
    setBordadoGaspea([]); setCorBordadoGaspea('');
    setBordadoTaloneira([]); setCorBordadoTaloneira('');
    setBordadoVariadoDescCano(''); setBordadoVariadoDescGaspea(''); setBordadoVariadoDescTaloneira('');
    setNomeBordado(false); setNomeBordadoDesc('');
    setLaserCano([]); setCorGlitterCano('');
    setLaserGaspea([]); setCorGlitterGaspea('');
    setLaserTaloneira([]); setCorGlitterTaloneira('');
    setCorBordadoLaserCano(''); setCorBordadoLaserGaspea(''); setCorBordadoLaserTaloneira('');
    setLaserOutroCanoText(''); setLaserOutroGaspeaText(''); setLaserOutroTaloneiraText('');
    setPintura(false); setPinturaDesc('');
    setEstampa(false); setEstampaDesc('');
    setCorLinha(''); setCorBorrachinha(''); setCorVivo('');
    setAreaMetal(''); setTipoMetal([]); setCorMetal('');
    setStrass(false); setStrassQtd(0);
    setCruzMetal(false); setCruzMetalQtd(0);
    setBridaoMetal(false); setBridaoMetalQtd(0);
    setCavaloMetal(false); setCavaloMetalQtd(0);
    setTrice(false); setTriceDesc('');
    setTiras(false); setTirasDesc('');
    setFranja(false); setFranjaCouro(''); setFranjaCor('');
    setCorrente(false); setCorrenteCor('');
    setSolado(''); setFormatoBico(''); setCorSola(''); setCorVira('');
    setCosturaAtras(false);
    setCarimbo(''); setCarimboDesc('');
    setAdicionalDesc(''); setAdicionalValor(0);
    setObservacao('');
    setFotoUrl('');
    setGradeItems([]);
    setShowMirror(false);
    setDraftId('');
  }, [isAdminProducao, user?.nomeCompleto]);

  const confirmOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const isGradeVendedor = isAdmin && (vendedorSelecionado === 'Estoque' || vendedorSelecionado === 'Juliana Cristina Ribeiro');
      const isEstoqueGrade = isGradeVendedor && gradeItems.length > 0;

      if (isEstoqueGrade) {
        const orderData = buildOrderData() as any;
        const success = await addOrderBatch(orderData, gradeItems, numeroPedido.trim());
        if (success) {
          const totalPedidos = gradeItems.reduce((s, i) => s + i.quantidade, 0);
          if (draftId) deleteDraft(draftId);
          const numeroSalvo = numeroPedido.trim();
          toast.success(`Grade ${numeroSalvo} criada! ${totalPedidos} pedidos lançados em Meus Pedidos.`, { position: 'bottom-right' });
          resetForm();
        }
      } else {
        const success = await addOrder({
          ...buildOrderData(),
          numeroPedido: numeroPedido.trim(),
          tamanho,
        } as any);
        if (success) {
          if (draftId) deleteDraft(draftId);
          const numeroSalvo = numeroPedido.trim() || '(novo)';
          toast.success(`Pedido ${numeroSalvo} lançado em Meus Pedidos!`, { position: 'bottom-right' });
          resetForm();
        } else {
          toast.error('Erro ao salvar o pedido. Faça login novamente e tente.');
        }
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
    const id = draftId || `draft-${Date.now()}`;
    const form: Record<string, string> = {
      tamanho, genero, modelo, sobMedidaDesc,
      acessorios: acessorios.join('||'),
      tipoCouroCano, corCouroCano, tipoCouroGaspea, corCouroGaspea, tipoCouroTaloneira, corCouroTaloneira,
      desenvolvimento,
      bordadoCano: bordadoCano.join('||'), corBordadoCano,
      bordadoGaspea: bordadoGaspea.join('||'), corBordadoGaspea,
      bordadoTaloneira: bordadoTaloneira.join('||'), corBordadoTaloneira,
      bordadoVariadoDescCano, bordadoVariadoDescGaspea, bordadoVariadoDescTaloneira,
      nomeBordado: String(nomeBordado), nomeBordadoDesc,
      laserCano: laserCano.join('||'), corGlitterCano,
      laserGaspea: laserGaspea.join('||'), corGlitterGaspea,
      laserTaloneira: laserTaloneira.join('||'), corGlitterTaloneira,
      laserOutroCanoText, laserOutroGaspeaText, laserOutroTaloneiraText,
      pintura: String(pintura), pinturaDesc,
      estampa: String(estampa), estampaDesc,
      corLinha, corBorrachinha, corVivo,
      areaMetal, tipoMetal: tipoMetal.join('||'), corMetal,
      strass: String(strass), strassQtd: String(strassQtd),
      cruzMetal: String(cruzMetal), cruzMetalQtd: String(cruzMetalQtd),
      bridaoMetal: String(bridaoMetal), bridaoMetalQtd: String(bridaoMetalQtd),
      cavaloMetal: String(cavaloMetal), cavaloMetalQtd: String(cavaloMetalQtd),
      trice: String(trice), triceDesc,
      tiras: String(tiras), tirasDesc,
      franja: String(franja), franjaCouro, franjaCor,
      corrente: String(corrente), correnteCor,
      corBordadoLaserCano, corBordadoLaserGaspea, corBordadoLaserTaloneira,
      solado, formatoBico, corSola, corVira, costuraAtras: String(costuraAtras),
      carimbo, carimboDesc,
      adicionalDesc, adicionalValor: String(adicionalValor),
      observacao,
      cliente,
    };
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    saveDraft({ id, userId: user.id, savedAt: now.toISOString(), form, sobMedida, quantidade: 1, numeroPedido, cliente, fotos });
    setDraftId(id);
    toast.success('Rascunho salvo!');
  };



  /* ───── mirror data (only filled fields, NO value) ───── */
  const mirrorRows: [string, string][] = [
    ['Vendedor', isAdmin ? vendedorSelecionado : (user?.nomeCompleto || '')],
    ['Número do Pedido', numeroPedido],
    ['Cliente', cliente],
    ['Tamanho', tamanho ? `${tamanho}${genero ? ' — ' + genero : ''}` : ''],
    ['Modelo', modelo],
    ['Sob Medida', sobMedida ? `Sim${sobMedidaDesc ? ' — ' + sobMedidaDesc : ''}` : ''],
    ['Acessórios', acessorios.join(', ')],
    ['Tipo Couro Cano', tipoCouroCano],
    ['Cor Couro Cano', corCouroCano],
    ['Tipo Couro Gáspea', tipoCouroGaspea],
    ['Cor Couro Gáspea', corCouroGaspea],
    ['Tipo Couro Taloneira', tipoCouroTaloneira],
    ['Cor Couro Taloneira', corCouroTaloneira],
    ['Desenvolvimento', desenvolvimento],
    ['Bordado Cano', bordadoCano.join(', ')],
    ['Cor Bordado Cano', corBordadoCano],
    ['Bordado Gáspea', bordadoGaspea.join(', ')],
    ['Cor Bordado Gáspea', corBordadoGaspea],
    ['Bordado Taloneira', bordadoTaloneira.join(', ')],
    ['Cor Bordado Taloneira', corBordadoTaloneira],
    ['Nome Bordado', nomeBordado ? nomeBordadoDesc || 'Sim' : ''],
    ['Laser Cano', laserCano.join(', ')],
    ['Cor Glitter/Tecido Cano', corGlitterCano],
    ['Laser Gáspea', laserGaspea.join(', ')],
    ['Cor Glitter/Tecido Gáspea', corGlitterGaspea],
    ['Laser Taloneira', laserTaloneira.join(', ')],
    ['Cor Glitter/Tecido Taloneira', corGlitterTaloneira],
    ['Cor Bordado Laser Cano', corBordadoLaserCano],
    ['Cor Bordado Laser Gáspea', corBordadoLaserGaspea],
    ['Cor Bordado Laser Taloneira', corBordadoLaserTaloneira],
    ['Pintura', pintura ? pinturaDesc || 'Sim' : ''],
    ['Estampa', estampa ? (estampaDesc ? `Sim — ${estampaDesc}` : 'Sim') : ''],
    ['Cor da Linha', corLinha],
    ...(!HIDE_PESPONTO_EXTRAS.includes(modelo) ? [
      ['Cor Borrachinha', corBorrachinha] as [string, string],
      ['Cor do Vivo', corVivo] as [string, string],
    ] : []),
    ['Área Metal', areaMetal],
    ['Tipo Metal', tipoMetal.join(', ')],
    ['Cor Metal', corMetal],
    ['Strass', strass ? `${strassQtd} un.` : ''],
    ['Cruz (metal)', cruzMetal ? `${cruzMetalQtd} un.` : ''],
    ['Bridão (metal)', bridaoMetal ? `${bridaoMetalQtd} un.` : ''],
    ['Cavalo (metal)', cavaloMetal ? `${cavaloMetalQtd} un.` : ''],
    ['Tricê', trice ? triceDesc || 'Sim' : ''],
    ['Tiras', tiras ? tirasDesc || 'Sim' : ''],
    ['Franja', franja ? `Sim${franjaCouro ? ' — ' + franjaCouro : ''}${franjaCor ? ' / ' + franjaCor : ''}` : ''],
    ['Corrente', corrente ? `Sim${correnteCor ? ' — ' + correnteCor : ''}` : ''],
    ['Solado', solado],
    ['Formato do Bico', formatoBico],
    ['Cor da Sola', corSola],
    ['Cor da Vira', corVira],
    ['Costura Atrás', costuraAtras ? 'Sim' : ''],
    ['Carimbo a Fogo', carimbo ? `${carimbo}${carimboDesc ? ' — ' + carimboDesc : ''}` : ''],
    ['Adicional', adicionalDesc ? `${adicionalDesc}${adicionalValor > 0 ? ` — ${formatCurrency(adicionalValor)}` : ''}` : ''],
    ['Observação', observacao],
    ['Quantidade', '1'],
  ].filter(([, v]) => v) as [string, string][];

  /* ───── select helper ───── */
  const SelectField = ({ label, value, onChange, options, required: req }: { label: string; value: string; onChange: (v: string) => void; options: string[] | { label: string; preco: number }[]; required?: boolean }) => (
    <div>
      <label className={cls.label}>{label}{req && <span className="text-destructive ml-0.5">*</span>}</label>
      <SearchableSelect options={options} value={value} onValueChange={onChange} placeholder="Selecione..." />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-3xl font-display font-bold">
            {tmpl.isEditing ? 'Editar Modelo' : mode === 'template' ? 'Criar Modelo' : 'Ficha de Produção'}
          </h1>
          {mode === 'order' && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => { setMode('template'); setProductChoice('bota'); }}>
                <Plus size={16} /> Criar Modelo
              </Button>
              <Button type="button" variant="outline" size="sm" className="relative" onClick={async () => { if (user) { await tmpl.loadTemplates(user.id); } tmpl.setShowTemplates(true); tmpl.setTemplateSearch(''); if (user) { await tmpl.markTemplatesAsSeen(user.id); } }}>
                <List size={16} /> Modelos
                {tmpl.unseenCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {tmpl.unseenCount}
                  </span>
                )}
              </Button>
            </>
          )}
          {mode === 'template' && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('order'); tmpl.cancelEditing(); }}>
              Voltar para Pedido
            </Button>
          )}
        </div>

        <form onSubmit={mode === 'template' ? (e) => { e.preventDefault(); tmpl.isEditing ? handleUpdateTemplate() : handleSaveTemplate(); } : handleSubmit} className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">

          {/* Template name field */}
          {mode === 'template' && (
            <div>
              <label className={cls.label}>Nome do Modelo<span className="text-destructive ml-0.5">*</span></label>
              <input type="text" value={tmpl.templateName} onChange={e => tmpl.setTemplateName(e.target.value)} placeholder="Ex: Texana tradicional" className={cls.input} />
            </div>
          )}

          {/* 1-2 Vendedor + Número (hidden in template mode) */}
          {mode === 'order' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={cls.label}>Vendedor</label>
              {isAdmin ? (
                <select value={vendedorSelecionado} onChange={e => setVendedorSelecionado(e.target.value)} className={cls.select}>
                  {isAdminProducao && !vendedorSelecionado && <option value="">Selecione um vendedor</option>}
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
              <label className={cls.label}>Cliente{vendedorSelecionado === 'Juliana Cristina Ribeiro' && <span className="text-destructive ml-0.5">*</span>}</label>
              <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder={vendedorSelecionado === 'Juliana Cristina Ribeiro' ? "Nome do cliente (obrigatório)" : "Nome do cliente (opcional)"} className={cls.input} />
            </div>
          </div>
          )}

          {/* 3-4 Tamanho + Gênero + Modelo */}
          {mode === 'order' ? (
            <div className="grid sm:grid-cols-3 gap-4">
              {isAdmin && (vendedorSelecionado === 'Estoque' || vendedorSelecionado === 'Juliana Cristina Ribeiro') ? (
                <div>
                  <label className={cls.label}>Tamanho / Grade</label>
                  {gradeItems.length > 0 ? (
                    <button type="button" onClick={() => setShowGrade(true)} className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border hover:border-primary text-left flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Grid3X3 size={14} className="text-primary" />
                        <span className="font-semibold">{gradeItems.length} tam.</span>
                        <span className="text-muted-foreground">({gradeItems.reduce((s, i) => s + i.quantidade, 0)} pedidos)</span>
                      </span>
                      <span className="text-xs text-primary font-medium">Editar</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => setShowGrade(true)} className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-dashed border-primary/50 hover:border-primary text-primary font-semibold flex items-center justify-center gap-2 transition-colors">
                      <Grid3X3 size={16} /> Gerar Grade
                    </button>
                  )}
                </div>
              ) : (
                <SelectField label="Tamanho" value={tamanho} onChange={v => { setTamanho(v); const allowed = getModelosForTamanho(v); if (modelo && !allowed.find(m => m.label === modelo)) { setModelo(''); setSolado(''); setFormatoBico(''); setCorSola(''); setCorVira(''); } }} options={TAMANHOS} required />
              )}
              <SelectField label="Gênero" value={genero} onChange={setGenero} options={GENEROS} required />
              <SelectField label="Modelo" value={modelo} onChange={handleModeloChange} options={getModelosForTamanho(tamanho)} required />
            </div>
          ) : (
            <SelectField label="Modelo" value={modelo} onChange={handleModeloChange} options={MODELOS} />
          )}

          {/* 5 Sob Medida */}
          <ToggleField label="Sob Medida (+R$50)" value={sobMedida} onChange={setSobMedida} textValue={sobMedidaDesc} onTextChange={setSobMedidaDesc} textPlaceholder="Descreva a medida..." />

          {/* 6 Acessórios */}
          <MultiSelect label="Acessórios" items={ACESSORIOS} selected={acessorios} onChange={setAcessorios} />

          {/* 7 Couros */}
          <Section title="Couros">
            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField label="Tipo Couro do Cano" value={tipoCouroCano} onChange={v => { setTipoCouroCano(v); if (corCouroCano && !getDynCoresCouro(v, 'couro_cano', 'cor_couro_cano').includes(corCouroCano)) setCorCouroCano(''); }} options={TIPOS_COURO} required />
              <SelectField label="Cor Couro do Cano" value={corCouroCano} onChange={setCorCouroCano} options={getDynCoresCouro(tipoCouroCano, 'couro_cano', 'cor_couro_cano')} required />
              <SelectField label="Tipo Couro da Gáspea" value={tipoCouroGaspea} onChange={v => { setTipoCouroGaspea(v); if (corCouroGaspea && !getDynCoresCouro(v, 'couro_gaspea', 'cor_couro_gaspea').includes(corCouroGaspea)) setCorCouroGaspea(''); }} options={TIPOS_COURO} required />
              <SelectField label="Cor Couro da Gáspea" value={corCouroGaspea} onChange={setCorCouroGaspea} options={getDynCoresCouro(tipoCouroGaspea, 'couro_gaspea', 'cor_couro_gaspea')} required />
              <SelectField label="Tipo Couro da Taloneira" value={tipoCouroTaloneira} onChange={v => { setTipoCouroTaloneira(v); if (corCouroTaloneira && !getDynCoresCouro(v, 'couro_taloneira', 'cor_couro_taloneira').includes(corCouroTaloneira)) setCorCouroTaloneira(''); }} options={TIPOS_COURO} required />
              <SelectField label="Cor Couro da Taloneira" value={corCouroTaloneira} onChange={setCorCouroTaloneira} options={getDynCoresCouro(tipoCouroTaloneira, 'couro_taloneira', 'cor_couro_taloneira')} required />
            </div>
          </Section>

          {/* Desenvolvimento (moved before Bordados) */}
          <SelectField label="Desenvolvimento" value={desenvolvimento} onChange={setDesenvolvimento} options={DESENVOLVIMENTO} />

          {/* 8-13 Bordados */}
          <Section title="Bordados">
            <MultiSelect label="Bordado do Cano" items={mergedBordadoCano} selected={bordadoCano} onChange={setBordadoCano} />
            {bordadoCano.some(b => b.includes('Bordado Variado')) && (
              <div><label className={cls.label}>Descrever bordado (Cano)<span className="text-destructive ml-0.5">*</span></label><input type="text" value={bordadoVariadoDescCano} onChange={e => setBordadoVariadoDescCano(e.target.value)} placeholder="Descreva o bordado variado..." className={cls.input} /></div>
            )}
            <div><label className={cls.label}>Cor do Bordado do Cano</label><input type="text" value={corBordadoCano} onChange={e => setCorBordadoCano(e.target.value)} className={cls.input} /></div>

            <MultiSelect label="Bordado da Gáspea" items={mergedBordadoGaspea} selected={bordadoGaspea} onChange={setBordadoGaspea} />
            {bordadoGaspea.some(b => b.includes('Bordado Variado')) && (
              <div><label className={cls.label}>Descrever bordado (Gáspea)<span className="text-destructive ml-0.5">*</span></label><input type="text" value={bordadoVariadoDescGaspea} onChange={e => setBordadoVariadoDescGaspea(e.target.value)} placeholder="Descreva o bordado variado..." className={cls.input} /></div>
            )}
            <div><label className={cls.label}>Cor do Bordado da Gáspea</label><input type="text" value={corBordadoGaspea} onChange={e => setCorBordadoGaspea(e.target.value)} className={cls.input} /></div>

            <MultiSelect label="Bordado da Taloneira" items={mergedBordadoTaloneira} selected={bordadoTaloneira} onChange={setBordadoTaloneira} />
            {bordadoTaloneira.some(b => b.includes('Bordado Variado')) && (
              <div><label className={cls.label}>Descrever bordado (Taloneira)<span className="text-destructive ml-0.5">*</span></label><input type="text" value={bordadoVariadoDescTaloneira} onChange={e => setBordadoVariadoDescTaloneira(e.target.value)} placeholder="Descreva o bordado variado..." className={cls.input} /></div>
            )}
            <div><label className={cls.label}>Cor do Bordado da Taloneira</label><input type="text" value={corBordadoTaloneira} onChange={e => setCorBordadoTaloneira(e.target.value)} className={cls.input} /></div>
          </Section>

          {/* 14 Nome Bordado */}
          <ToggleField label={`Nome Bordado (+R$${NOME_BORDADO_PRECO})`} value={nomeBordado} onChange={setNomeBordado} textValue={nomeBordadoDesc} onTextChange={setNomeBordadoDesc} textPlaceholder="Nome, cor, local..." />

          {/* 15 Laser (split by cano/gáspea/taloneira + pintura) */}
          <Section title="Laser">
            <MultiSelect label="Laser do Cano" items={mergedLaserCano} selected={laserCano} onChange={setLaserCano} />
            {laserCano.includes('Outro') && (
              <div><label className={cls.label}>Descreva o laser (Outro) - Cano</label><input type="text" value={laserOutroCanoText} onChange={e => setLaserOutroCanoText(e.target.value)} className={cls.input} placeholder="Nome do laser..." /></div>
            )}
            <SelectField label="Cor Glitter/Tecido do Cano (+R$30)" value={corGlitterCano} onChange={setCorGlitterCano} options={COR_GLITTER} />
            <div><label className={cls.label}>Cor do Bordado (Cano)</label><input type="text" value={corBordadoLaserCano} onChange={e => setCorBordadoLaserCano(e.target.value)} className={cls.input} placeholder="Cor do bordado..." /></div>

            <MultiSelect label="Laser da Gáspea" items={mergedLaserGaspea} selected={laserGaspea} onChange={setLaserGaspea} />
            {laserGaspea.includes('Outro') && (
              <div><label className={cls.label}>Descreva o laser (Outro) - Gáspea</label><input type="text" value={laserOutroGaspeaText} onChange={e => setLaserOutroGaspeaText(e.target.value)} className={cls.input} placeholder="Nome do laser..." /></div>
            )}
            <SelectField label="Cor Glitter/Tecido da Gáspea (+R$30)" value={corGlitterGaspea} onChange={setCorGlitterGaspea} options={COR_GLITTER} />
            <div><label className={cls.label}>Cor do Bordado (Gáspea)</label><input type="text" value={corBordadoLaserGaspea} onChange={e => setCorBordadoLaserGaspea(e.target.value)} className={cls.input} placeholder="Cor do bordado..." /></div>

            <MultiSelect label="Laser da Taloneira" items={mergedLaserTaloneira} selected={laserTaloneira} onChange={setLaserTaloneira} />
            {laserTaloneira.includes('Outro') && (
              <div><label className={cls.label}>Descreva o laser (Outro) - Taloneira</label><input type="text" value={laserOutroTaloneiraText} onChange={e => setLaserOutroTaloneiraText(e.target.value)} className={cls.input} placeholder="Nome do laser..." /></div>
            )}
            <SelectField label="Cor Glitter/Tecido da Taloneira (sem custo)" value={corGlitterTaloneira} onChange={setCorGlitterTaloneira} options={COR_GLITTER} />
            <div><label className={cls.label}>Cor do Bordado (Taloneira)</label><input type="text" value={corBordadoLaserTaloneira} onChange={e => setCorBordadoLaserTaloneira(e.target.value)} className={cls.input} placeholder="Cor do bordado..." /></div>

            {/* Pintura inside Laser section */}
            <ToggleField label={`Pintura (+R$${PINTURA_PRECO})`} value={pintura} onChange={setPintura} textValue={pinturaDesc} onTextChange={setPinturaDesc} textPlaceholder="Cor da tinta..." />
          </Section>

          {/* Divider after Pintura/Laser, before Estampa */}
          <hr className="border-border" />

          {/* Estampa */}
          <ToggleField label={`Estampa (+R$${ESTAMPA_PRECO})`} value={estampa} onChange={setEstampa} textValue={estampaDesc} onTextChange={setEstampaDesc} textPlaceholder="Descreva a estampa..." />

          {/* Pesponto */}
          <Section title="Pesponto">
            <div className={`grid gap-4 ${HIDE_PESPONTO_EXTRAS.includes(modelo) ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
              <SelectField label="Cor da Linha" value={corLinha} onChange={setCorLinha} options={COR_LINHA} required />
              {!HIDE_PESPONTO_EXTRAS.includes(modelo) && (
                <>
                  <SelectField label="Cor da Borrachinha" value={corBorrachinha} onChange={setCorBorrachinha} options={COR_BORRACHINHA} required />
                  <SelectField label="Cor do Vivo" value={corVivo} onChange={setCorVivo} options={COR_VIVO} required />
                </>
              )}
            </div>
          </Section>

          {/* Metais */}
          <Section title="Metais">
            <div className="grid sm:grid-cols-3 gap-4">
              <SelectField label="Área do Metal" value={areaMetal} onChange={setAreaMetal} options={AREA_METAL} />
              <div>
                <label className={cls.label}>Tipo do Metal</label>
                <div className="flex flex-col gap-1">
                  {TIPO_METAL.map(t => (
                    <label key={t} className={cls.checkItem}>
                      <input type="checkbox" checked={tipoMetal.includes(t)} onChange={e => {
                        if (e.target.checked) setTipoMetal(prev => [...prev, t]);
                        else setTipoMetal(prev => prev.filter(x => x !== t));
                      }} className="accent-primary w-4 h-4" />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <SelectField label="Cor do Metal" value={corMetal} onChange={setCorMetal} options={COR_METAL} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleField label="Strass (R$0,60/un)" value={strass} onChange={setStrass} />
                {strass && <input type="number" min={0} value={strassQtd} onChange={e => setStrassQtd(Math.max(0, Number(e.target.value)))} onWheel={e => (e.target as HTMLInputElement).blur()} className={cls.inputSmall + ' w-20'} placeholder="Qtd" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleField label="Cruz (R$6/un)" value={cruzMetal} onChange={setCruzMetal} />
                {cruzMetal && <input type="number" min={0} value={cruzMetalQtd} onChange={e => setCruzMetalQtd(Math.max(0, Number(e.target.value)))} onWheel={e => (e.target as HTMLInputElement).blur()} className={cls.inputSmall + ' w-20'} placeholder="Qtd" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleField label="Bridão (R$3/un)" value={bridaoMetal} onChange={setBridaoMetal} />
                {bridaoMetal && <input type="number" min={0} value={bridaoMetalQtd} onChange={e => setBridaoMetalQtd(Math.max(0, Number(e.target.value)))} onWheel={e => (e.target as HTMLInputElement).blur()} className={cls.inputSmall + ' w-20'} placeholder="Qtd" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleField label="Cavalo (R$5/un)" value={cavaloMetal} onChange={setCavaloMetal} />
                {cavaloMetal && <input type="number" min={0} value={cavaloMetalQtd} onChange={e => setCavaloMetalQtd(Math.max(0, Number(e.target.value)))} onWheel={e => (e.target as HTMLInputElement).blur()} className={cls.inputSmall + ' w-20'} placeholder="Qtd" />}
              </div>
            </div>
          </Section>

          {/* Extras (Tiras + Tricê) */}
          <Section title="Extras">
            <ToggleField label={`Tricê (+R$${TRICE_PRECO})`} value={trice} onChange={setTrice} textValue={triceDesc} onTextChange={setTriceDesc} textPlaceholder="Cor do tricê..." />
            <ToggleField label={`Tiras (+R$${TIRAS_PRECO})`} value={tiras} onChange={setTiras} textValue={tirasDesc} onTextChange={setTirasDesc} textPlaceholder="Cor das tiras..." />
            <div className="space-y-2">
              <ToggleField label={`Franja (+R$${FRANJA_PRECO})`} value={franja} onChange={setFranja} />
              {franja && (
                <div className="grid sm:grid-cols-2 gap-3 pl-4">
                  <div><label className={cls.label}>Tipo de couro da franja</label><input type="text" value={franjaCouro} onChange={e => setFranjaCouro(e.target.value)} placeholder="Tipo de couro..." className={cls.input} /></div>
                  <div><label className={cls.label}>Cor da franja</label><input type="text" value={franjaCor} onChange={e => setFranjaCor(e.target.value)} placeholder="Cor da franja..." className={cls.input} /></div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <ToggleField label={`Corrente (+R$${CORRENTE_PRECO})`} value={corrente} onChange={setCorrente} />
              {corrente && (
                <div className="pl-4">
                  <label className={cls.label}>Cor da corrente</label>
                  <input type="text" value={correnteCor} onChange={e => setCorrenteCor(e.target.value)} placeholder="Cor da corrente..." className={cls.input} />
                </div>
              )}
            </div>
          </Section>

          {/* Solados */}
          <Section title="Solados">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SelectField label="Tipo de Solado" value={solado} onChange={handleSoladoChange} options={getSoladosForModelo(modelo, formatoBico)} required />
              <SelectField label="Formato do Bico" value={formatoBico} onChange={handleBicoChange} options={getBicosForModeloSolado(modelo, solado)} required />
              {getCorSolaOptions(modelo, solado, formatoBico) !== null && (
                <SelectField label="Cor da Sola" value={corSola} onChange={setCorSola} options={getCorSolaOptions(modelo, solado, formatoBico)!} required />
              )}
              {getCorViraOptions(modelo, solado).length > 1 && (
                <SelectField label="Cor da Vira" value={corVira} onChange={setCorVira} options={getCorViraOptions(modelo, solado)} />
              )}
            </div>
            <ToggleField label={`Costura Atrás (+R$${COSTURA_ATRAS_PRECO})`} value={costuraAtras} onChange={setCosturaAtras} />
          </Section>

          {/* Carimbo a Fogo */}
          <Section title="Carimbo a Fogo">
            <div className="flex flex-wrap items-center gap-3">
              <select value={carimbo} onChange={e => setCarimbo(e.target.value)} className={cls.inputSmall + ' w-44'}>
                <option value="">Sem carimbo</option>
                {CARIMBO.map(c => <option key={c.label} value={c.label}>{c.label} (R${c.preco})</option>)}
              </select>
              <input type="text" value={carimboDesc} onChange={e => setCarimboDesc(e.target.value)} placeholder="Quais carimbos e onde..." className={cls.inputSmall + ' flex-1 min-w-[180px]'} />
            </div>
          </Section>

          {/* Adicional */}
          <Section title="Adicional">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={cls.label}>Descrição do Adicional</label>
                <input type="text" value={adicionalDesc} onChange={e => setAdicionalDesc(e.target.value)} placeholder="Ex: franja extra, peça diferente..." className={cls.input} />
              </div>
              <div>
                <label className={cls.label}>Valor do Adicional (R$)</label>
                <input type="number" min={0} step={0.01} value={adicionalValor || ''} onChange={e => setAdicionalValor(Math.max(0, Number(e.target.value)))} onWheel={e => (e.target as HTMLInputElement).blur()} placeholder="0,00" className={cls.input} />
              </div>
            </div>
          </Section>

          {/* Observação */}
          <div>
            <label className={cls.label}>Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className={cls.input + ' min-h-[80px]'} />
          </div>

          {mode === 'order' && (
            <>
              <label className={cls.label}>Link da Foto de Referência (Google Drive)<span className="text-destructive ml-0.5">*</span></label>
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  type="url"
                  value={fotoUrl}
                  onChange={e => setFotoUrl(e.target.value)}
                  placeholder="Cole o link do Google Drive aqui..."
                  className={cls.input}
                />
                {fotoUrl && (
                  <button type="button" onClick={() => setFotoUrl('')} className="text-destructive hover:text-destructive/80">
                    <X size={16} />
                  </button>
                )}
              </div>
              {fotoUrl && (
                <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Abrir link ↗
                </a>
              )}
            </>
          )}

          {mode === 'order' && (
            <>
              {/* Quantidade */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold">Quantidade:</label>
                <input type="number" value={1} readOnly className={cls.inputSmall + ' w-20 opacity-70'} />
              </div>

              {/* Prazo */}
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm"><span className="font-semibold">Prazo de Produção:</span> 15 dias úteis</p>
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

          {mode === 'template' && (
            <button type="submit" className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2">
              {tmpl.isEditing ? <><Check size={20} /> SALVAR ALTERAÇÕES NO MODELO</> : <><Plus size={20} /> CRIAR MODELO</>}
            </button>
          )}
        </form>
      </motion.div>

      {/* ───── Templates Dialog ───── */}
      <Dialog open={tmpl.showTemplates} onOpenChange={tmpl.setShowTemplates}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modelos Salvos</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Pesquisar modelo..."
            value={tmpl.templateSearch}
            onChange={e => tmpl.setTemplateSearch(e.target.value)}
            className="mb-2"
          />
          {(() => {
            const filtered = tmpl.templates.filter(t => t.nome.toLowerCase().includes(tmpl.templateSearch.toLowerCase()));
            if (tmpl.templates.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo salvo ainda.</p>;
            if (filtered.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo encontrado.</p>;
            return (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-muted rounded-lg p-3 gap-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{t.nome}</span>
                      {t.seen === false && <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Novo</Badge>}
                    </div>
                    {t.sent_by_name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Inbox size={11} /> Recebido de {t.sent_by_name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openSendDialog(t)} title="Enviar para outro usuário"><Send size={14} /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditTemplate(t)} title="Editar modelo"><Pencil size={14} /></Button>
                    <Button size="sm" onClick={() => handleUseTemplate(t.form_data)}>Preencher</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(t.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ───── Send Template Dialog ───── */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar modelo</DialogTitle>
          </DialogHeader>
          {sendingTemplate && (
            <p className="text-sm text-muted-foreground -mt-2">
              Enviando: <span className="font-semibold text-foreground">{sendingTemplate.nome}</span>
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


      {/* ───── Grade de Estoque ───── */}
      <GradeEstoque
        open={showGrade}
        onOpenChange={setShowGrade}
        numeroPedidoBase={numeroPedido.trim()}
        initialItems={gradeItems}
        onConfirm={(items: GradeItem[]) => {
          setGradeItems(items);
          toast.success(`Grade definida: ${items.length} tamanhos, ${items.reduce((s, i) => s + i.quantidade, 0)} pedidos. Preencha a ficha e finalize.`);
        }}
      />

      {/* ───── Mirror ───── */}
      {showMirror && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4" onClick={() => setShowMirror(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl p-6 md:p-8 western-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-display font-bold mb-1 text-center">ESPELHO DA FICHA DE PRODUÇÃO</h2>
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

export default OrderPage;
