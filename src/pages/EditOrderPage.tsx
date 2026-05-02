import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, Order } from '@/contexts/AuthContext';
import { useOrderById } from '@/hooks/useOrderById';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FotoPedidoSidePanel } from '@/components/FotoPedidoSidePanel';
import { isHttpUrl } from '@/lib/driveUrl';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link2, X, Save, ArrowLeft, Search } from 'lucide-react';
import { useCustomOptions } from '@/hooks/useCustomOptions';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';
import { useDynamicFieldFilter } from '@/hooks/useDynamicFieldFilter';
import {
  MODELOS, TAMANHOS, GENEROS, ACESSORIOS, TIPOS_COURO, CORES_COURO, COURO_PRECOS, getCoresCouroFiltradas,
  BORDADOS_CANO, BORDADOS_GASPEA, BORDADOS_TALONEIRA, LASER_OPTIONS, LASER_CANO_PRECO, LASER_GASPEA_PRECO,
  GLITTER_CANO_PRECO, GLITTER_GASPEA_PRECO,
  COR_GLITTER, COR_LINHA, COR_BORRACHINHA,
  COR_VIVO, DESENVOLVIMENTO, AREA_METAL, TIPO_METAL, COR_METAL,
  STRASS_PRECO, CRUZ_METAL_PRECO, BRIDAO_METAL_PRECO, SOLADO, COR_SOLA, COR_VIRA,
  CARIMBO, SOB_MEDIDA_PRECO, NOME_BORDADO_PRECO, ESTAMPA_PRECO,
  PINTURA_PRECO, TRICE_PRECO, TIRAS_PRECO, COSTURA_ATRAS_PRECO, FORMATO_BICO,
  getModelosForTamanho,
  getSoladosForModelo, getBicosForModeloSolado, getCorSolaOptions, getCorViraOptions, getForma,
} from '@/lib/orderFieldsConfig';

const cls = {
  label: 'block text-sm font-semibold mb-1',
  select: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none',
  input: 'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none',
  inputSmall: 'bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none',
  checkItem: 'flex items-center gap-2 text-sm',
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="bg-primary text-primary-foreground text-center font-display font-bold text-lg uppercase tracking-wide py-2 rounded-sm">{title}</h3>
    {children}
  </div>
);

const ToggleField = ({ label, value, onChange, textValue, onTextChange, textPlaceholder }: {
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
      <input type="text" value={textValue} onChange={e => onTextChange(e.target.value)} placeholder={textPlaceholder} className={cls.inputSmall + ' flex-1 min-w-[180px]'} />
    )}
  </div>
);

const MultiSelect = ({ label, items, selected, onChange,
}: {
  label: string; items: { label: string; preco: number }[]; selected: string[]; onChange: (v: string[]) => void;
}) => {
  const [search, setSearch] = useState('');
  const hasSearch = label.toLowerCase().includes('bordado') || label.toLowerCase().includes('laser');
  const filtered = search ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : items;
  const firstVariadoIdx = filtered.findIndex(i => i.label.startsWith('Bordado Variado'));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className={cls.label + ' mb-0'}>{label}</label>
      </div>
      {hasSearch && (
        <div className="relative mb-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={label.toLowerCase().includes('bordado') ? 'Pesquisar bordado...' : 'Pesquisar...'} className={cls.input + ' pl-8 !py-1.5 text-xs'} />
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

const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] | { label: string; preco: number }[] }) => (
  <div>
    <label className={cls.label}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} className={cls.select}>
      <option value="">Selecione...</option>
      {options.map(o => {
        const lbl = typeof o === 'string' ? o : o.label;
        const extra = typeof o === 'string' ? '' : o.preco ? ` (R$${o.preco})` : '';
        return <option key={lbl} value={lbl}>{lbl}{extra}</option>;
      })}
    </select>
  </div>
);

const EditOrderPage = () => {
  const { id } = useParams();
  const { isAdmin, updateOrder, allProfiles } = useAuth();
  const { requestSave, dialogProps } = useEditWithJustification();
  const { order, loading: orderLoading } = useOrderById(id);
  const { getByCategoria, loading: customOptsLoading } = useCustomOptions();
  const { findFichaPrice, getByCustomCategory, loading: fichaLoading } = useFichaVariacoesLookup();
  const { getFilteredOptions } = useDynamicFieldFilter();
  const catalogReady = !customOptsLoading && !fichaLoading;

  const getDynCoresCouro = useCallback((tipoCouro: string, campoCouroSlug: string, campoCorSlug: string): string[] => {
    const dbResult = getFilteredOptions(campoCorSlug, { [campoCouroSlug]: tipoCouro });
    return dbResult ?? getCoresCouroFiltradas(tipoCouro);
  }, [getFilteredOptions]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fotoParam = searchParams.get('foto') === '1';
  const fotoUrlAtual = (order?.fotos || []).find(f => isHttpUrl(f)) ?? null;
  const showFotoPanel = fotoParam && !!fotoUrlAtual;
  const closeFotoPanel = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete('foto');
    setSearchParams(sp, { replace: true });
  };

  const [numeroPedido, setNumeroPedido] = useState('');
  const { isDuplicate: orderDuplicate } = useCheckDuplicateOrder(numeroPedido, order?.id);
  const [vendedor, setVendedor] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [genero, setGenero] = useState('');
  const [modelo, setModelo] = useState('');
  const [sobMedida, setSobMedida] = useState(false);
  const [sobMedidaDesc, setSobMedidaDesc] = useState('');
  const [acessorios, setAcessorios] = useState<string[]>([]);
  const [tipoCouroCano, setTipoCouroCano] = useState('');
  const [corCouroCano, setCorCouroCano] = useState('');
  const [tipoCouroGaspea, setTipoCouroGaspea] = useState('');
  const [corCouroGaspea, setCorCouroGaspea] = useState('');
  const [tipoCouroTaloneira, setTipoCouroTaloneira] = useState('');
  const [corCouroTaloneira, setCorCouroTaloneira] = useState('');
  const [desenvolvimento, setDesenvolvimento] = useState('');
  const [bordadoCano, setBordadoCano] = useState<string[]>([]);
  const [corBordadoCano, setCorBordadoCano] = useState('');
  const [bordadoGaspea, setBordadoGaspea] = useState<string[]>([]);
  const [corBordadoGaspea, setCorBordadoGaspea] = useState('');
  const [bordadoTaloneira, setBordadoTaloneira] = useState<string[]>([]);
  const [corBordadoTaloneira, setCorBordadoTaloneira] = useState('');
  const [bordadoVariadoDescCano, setBordadoVariadoDescCano] = useState('');
  const [bordadoVariadoDescGaspea, setBordadoVariadoDescGaspea] = useState('');
  const [bordadoVariadoDescTaloneira, setBordadoVariadoDescTaloneira] = useState('');
  const [nomeBordado, setNomeBordado] = useState(false);
  const [nomeBordadoDesc, setNomeBordadoDesc] = useState('');
  const [laserCano, setLaserCano] = useState<string[]>([]);
  const [corGlitterCano, setCorGlitterCano] = useState('');
  const [laserGaspea, setLaserGaspea] = useState<string[]>([]);
  const [corGlitterGaspea, setCorGlitterGaspea] = useState('');
  const [laserTaloneira, setLaserTaloneira] = useState<string[]>([]);
  const [corGlitterTaloneira, setCorGlitterTaloneira] = useState('');
  const [pintura, setPintura] = useState(false);
  const [pinturaDesc, setPinturaDesc] = useState('');
  const [estampa, setEstampa] = useState(false);
  const [estampaDesc, setEstampaDesc] = useState('');
  const [corLinha, setCorLinha] = useState('');
  const [corBorrachinha, setCorBorrachinha] = useState('');
  const [corVivo, setCorVivo] = useState('');
  const [areaMetal, setAreaMetal] = useState('');
  const [tipoMetal, setTipoMetal] = useState<string[]>([]);
  const [corMetal, setCorMetal] = useState('');
  const [strass, setStrass] = useState(false);
  const [strassQtd, setStrassQtd] = useState(0);
  const [cruzMetal, setCruzMetal] = useState(false);
  const [cruzMetalQtd, setCruzMetalQtd] = useState(0);
  const [bridaoMetal, setBridaoMetal] = useState(false);
  const [bridaoMetalQtd, setBridaoMetalQtd] = useState(0);
  const [trice, setTrice] = useState(false);
  const [triceDesc, setTriceDesc] = useState('');
  const [tiras, setTiras] = useState(false);
  const [tirasDesc, setTirasDesc] = useState('');
  const [solado, setSolado] = useState('');
  const [formatoBico, setFormatoBico] = useState('');
  const [corSola, setCorSola] = useState('');
  const [corVira, setCorVira] = useState('');
  const [costuraAtras, setCosturaAtras] = useState(false);
  const [carimbo, setCarimbo] = useState('');
  const [carimboDesc, setCarimboDesc] = useState('');
  const [adicionalDesc, setAdicionalDesc] = useState('');
  const [adicionalValor, setAdicionalValor] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [laserOutroCanoText, setLaserOutroCanoText] = useState('');
  const [laserOutroGaspeaText, setLaserOutroGaspeaText] = useState('');
  const [laserOutroTaloneiraText, setLaserOutroTaloneiraText] = useState('');
  const [recorteCano, setRecorteCano] = useState('');
  const [corRecorteCano, setCorRecorteCano] = useState('');
  const [recorteGaspea, setRecorteGaspea] = useState('');
  const [corRecorteGaspea, setCorRecorteGaspea] = useState('');
  const [recorteTaloneira, setRecorteTaloneira] = useState('');
  const [corRecorteTaloneira, setCorRecorteTaloneira] = useState('');

  useEffect(() => {
    if (!order) return;
    if (!catalogReady) return;

    // Helpers para validar seleções contra o catálogo atual
    const sortAlphaInit = (arr: { label: string; preco: number }[]) => {
      const normal = arr.filter(i => !i.label.toLowerCase().startsWith('bordado variado'));
      const variado = arr.filter(i => i.label.toLowerCase().startsWith('bordado variado'));
      normal.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      variado.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      return [...normal, ...variado];
    };
    const validBordadoLabels = (cat: string, fallback: { label: string; preco: number }[]) => {
      const ficha = getByCustomCategory(cat);
      if (ficha.length > 0) return new Set(sortAlphaInit(ficha).map(i => i.label));
      const db = getByCategoria(cat);
      if (db.length > 0) return new Set(db.map(o => o.label));
      return new Set(fallback.map(i => i.label));
    };
    const validLaserLabels = (cat: string) => {
      const db = getByCategoria(cat);
      if (db.length === 0) return new Set(LASER_OPTIONS);
      return new Set(db.map(o => o.label));
    };
    const validAcessoriosLabels = new Set(ACESSORIOS.map(a => a.label));

    const removidos: string[] = [];
    const filterArr = (raw: string | undefined, valid: Set<string>, campo: string): string[] => {
      const arr = raw ? raw.split(', ').filter(Boolean) : [];
      const kept: string[] = [];
      arr.forEach(v => {
        if (valid.has(v)) kept.push(v);
        else removidos.push(`${campo}: "${v}"`);
      });
      return kept;
    };

    const bcKept = filterArr(order.bordadoCano, validBordadoLabels('bordado_cano', BORDADOS_CANO), 'Bordado Cano');
    const bgKept = filterArr(order.bordadoGaspea, validBordadoLabels('bordado_gaspea', BORDADOS_GASPEA), 'Bordado Gáspea');
    const btKept = filterArr(order.bordadoTaloneira, validBordadoLabels('bordado_taloneira', BORDADOS_TALONEIRA), 'Bordado Taloneira');
    const lcKept = filterArr(order.laserCano, validLaserLabels('laser_cano'), 'Laser Cano');
    const lgKept = filterArr(order.laserGaspea, validLaserLabels('laser_gaspea'), 'Laser Gáspea');
    const ltKept = filterArr(order.laserTaloneira, validLaserLabels('laser_taloneira'), 'Laser Taloneira');
    const acKept = filterArr(order.acessorios, validAcessoriosLabels, 'Acessório');

    setNumeroPedido(order.numero);
    setVendedor(order.vendedor || '');
    setTamanho(order.tamanho);
    setGenero(order.genero || '');
    setModelo(order.modelo);
    setSobMedida(order.sobMedida);
    setSobMedidaDesc(order.sobMedidaDesc || '');
    setAcessorios(acKept);
    setTipoCouroCano(order.couroCano || '');
    setCorCouroCano(order.corCouroCano || '');
    setTipoCouroGaspea(order.couroGaspea || '');
    setCorCouroGaspea(order.corCouroGaspea || '');
    setTipoCouroTaloneira(order.couroTaloneira || '');
    setCorCouroTaloneira(order.corCouroTaloneira || '');
    setDesenvolvimento(order.desenvolvimento || '');
    setBordadoCano(bcKept);
    setCorBordadoCano(order.corBordadoCano || '');
    setBordadoGaspea(bgKept);
    setCorBordadoGaspea(order.corBordadoGaspea || '');
    setBordadoTaloneira(btKept);
    setCorBordadoTaloneira(order.corBordadoTaloneira || '');
    setBordadoVariadoDescCano(order.bordadoVariadoDescCano || '');
    setBordadoVariadoDescGaspea(order.bordadoVariadoDescGaspea || '');
    setBordadoVariadoDescTaloneira(order.bordadoVariadoDescTaloneira || '');
    setNomeBordado(!!(order.nomeBordadoDesc || order.personalizacaoNome));
    setNomeBordadoDesc(order.nomeBordadoDesc || order.personalizacaoNome || '');
    setLaserCano(lcKept);
    setCorGlitterCano(order.corGlitterCano || '');
    setLaserGaspea(lgKept);
    setCorGlitterGaspea(order.corGlitterGaspea || '');
    setLaserTaloneira(ltKept);
    setCorGlitterTaloneira(order.corGlitterTaloneira || '');
    setPintura(order.pintura === 'Sim');
    setPinturaDesc(order.pinturaDesc || '');
    setEstampa(order.estampa === 'Sim');
    setEstampaDesc(order.estampaDesc || '');
    setCorLinha(order.corLinha || '');
    setCorBorrachinha(order.corBorrachinha || '');
    setCorVivo(order.corVivo || '');
    setAreaMetal(order.metais || '');
    setTipoMetal(order.tipoMetal ? order.tipoMetal.split(', ').filter(Boolean) : []);
    setCorMetal(order.corMetal || '');
    setStrass(!!(order.strassQtd && order.strassQtd > 0));
    setStrassQtd(order.strassQtd || 0);
    setCruzMetal(!!(order.cruzMetalQtd && order.cruzMetalQtd > 0));
    setCruzMetalQtd(order.cruzMetalQtd || 0);
    setBridaoMetal(!!(order.bridaoMetalQtd && order.bridaoMetalQtd > 0));
    setBridaoMetalQtd(order.bridaoMetalQtd || 0);
    setTrice(order.trisce === 'Sim');
    setTriceDesc(order.triceDesc || '');
    setTiras(order.tiras === 'Sim');
    setTirasDesc(order.tirasDesc || '');
    setSolado(order.solado || '');
    setFormatoBico(order.formatoBico || '');
    setCorSola(order.corSola || '');
    setCorVira(order.corVira || '');
    setCosturaAtras(order.costuraAtras === 'Sim');
    setCarimbo(order.carimbo || '');
    setCarimboDesc(order.carimboDesc || '');
    setAdicionalDesc(order.adicionalDesc || '');
    setAdicionalValor(order.adicionalValor || 0);
    setObservacao(order.observacao || '');
    setFotoUrl(order.fotos?.[0] || '');
    setRecorteCano(order.recorteCano || '');
    setCorRecorteCano(order.corRecorteCano || '');
    setRecorteGaspea(order.recorteGaspea || '');
    setCorRecorteGaspea(order.corRecorteGaspea || '');
    setRecorteTaloneira(order.recorteTaloneira || '');
    setCorRecorteTaloneira(order.corRecorteTaloneira || '');

    if (removidos.length > 0) {
      toast.warning(
        `${removidos.length} item(ns) foram desmarcados pois não existem mais no catálogo: ${removidos.join('; ')}. Confira a composição e clique em Salvar para atualizar o pedido.`,
        { duration: 10000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, catalogReady]);

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

  if (!isAdmin) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Acesso restrito ao administrador.</p></div>;
  if (!order) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Pedido não encontrado.</p></div>;

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
  const getLaserItems = (cat: string) => {
    const db = getByCategoria(cat);
    if (db.length === 0) return sortAlpha(LASER_OPTIONS.map(l => ({ label: l, preco: 0 })));
    return sortAlpha(db.map(o => ({ label: o.label, preco: o.preco })));
  };
  const mergedBordadoCano = getDbItems('bordado_cano', BORDADOS_CANO);
  const mergedBordadoGaspea = getDbItems('bordado_gaspea', BORDADOS_GASPEA);
  const mergedBordadoTaloneira = getDbItems('bordado_taloneira', BORDADOS_TALONEIRA);
  const mergedLaserCano = getLaserItems('laser_cano');
  const mergedLaserGaspea = getLaserItems('laser_gaspea');
  const mergedLaserTaloneira = getLaserItems('laser_taloneira');
  const laserCanoPreco = laserCano.length > 0 ? (findPrice(laserCano[0], 'laser_cano', []) || LASER_CANO_PRECO) : 0;
  const glitterCanoPreco = corGlitterCano ? GLITTER_CANO_PRECO : 0;
  const laserGaspeaPreco = laserGaspea.length > 0 ? (findPrice(laserGaspea[0], 'laser_gaspea', []) || LASER_GASPEA_PRECO) : 0;
  const glitterGaspeaPreco = corGlitterGaspea ? GLITTER_GASPEA_PRECO : 0;
  const totalLaserPreco = laserCanoPreco + glitterCanoPreco + laserGaspeaPreco + glitterGaspeaPreco;
  const desenvPreco = DESENVOLVIMENTO.find(d => d.label === desenvolvimento)?.preco || 0;
  const areaMetalPreco = AREA_METAL.find(a => a.label === areaMetal)?.preco || 0;
  const strassPreco = strass ? strassQtd * STRASS_PRECO : 0;
  const cruzMetalPrecoTotal = cruzMetal ? cruzMetalQtd * CRUZ_METAL_PRECO : 0;
  const bridaoMetalPrecoTotal = bridaoMetal ? bridaoMetalQtd * BRIDAO_METAL_PRECO : 0;
  const soladoPreco = SOLADO.find(s => s.label === solado)?.preco || 0;
  const corSolaOptsForPrice = getCorSolaOptions(modelo, solado, formatoBico);
  const corSolaPreco = corSolaOptsForPrice?.find(c => c.label === corSola)?.preco || 0;
  const corViraPreco = COR_VIRA.find(c => c.label === corVira)?.preco || 0;
  const carimboPreco = CARIMBO.find(c => c.label === carimbo)?.preco || 0;
  const hasAnyLaser = laserCano.length > 0 || laserGaspea.length > 0 || laserTaloneira.length > 0;

  const total = modeloPreco + (sobMedida ? SOB_MEDIDA_PRECO : 0) + acessoriosPreco + couroPreco + bordadoPreco
    + (nomeBordado ? NOME_BORDADO_PRECO : 0) + totalLaserPreco + (pintura ? PINTURA_PRECO : 0)
    + (estampa ? ESTAMPA_PRECO : 0) + desenvPreco + areaMetalPreco + strassPreco + cruzMetalPrecoTotal + bridaoMetalPrecoTotal
    + (trice ? TRICE_PRECO : 0) + (tiras ? TIRAS_PRECO : 0) + soladoPreco + corSolaPreco + corViraPreco
    + (costuraAtras ? COSTURA_ATRAS_PRECO : 0) + carimboPreco + (adicionalValor > 0 ? adicionalValor : 0);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const fotos = fotoUrl.trim() ? [fotoUrl.trim()] : [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modelo) {
      toast.error('Selecione o modelo da bota antes de continuar.');
      return;
    }

    // Check for duplicate order number if changed
    if (numeroPedido !== order.numero) {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: existing } = await supabase.from('orders').select('id').eq('numero', numeroPedido).neq('id', order.id).maybeSingle();
      if (existing) {
        toast.error('Número de pedido já cadastrado no sistema. Por favor, utilize outro número.');
        return;
      }
    }

    await updateOrder(order.id, {
      numero: numeroPedido, tamanho, genero, modelo, sobMedida, sobMedidaDesc,
      ...(isAdmin ? { vendedor } : {}),
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
      corLinha, corBorrachinha, trisce: trice ? 'Sim' : 'Não', triceDesc,
      tiras: tiras ? 'Sim' : 'Não', tirasDesc,
      metais: areaMetal, tipoMetal: tipoMetal.join(', '), corMetal,
      strassQtd: strass ? strassQtd : 0, cruzMetalQtd: cruzMetal ? cruzMetalQtd : 0,
      bridaoMetalQtd: bridaoMetal ? bridaoMetalQtd : 0,
      acessorios: acessorios.join(', '), desenvolvimento, observacao,
      corVira, corVivo, corSola,
      forma: getForma(modelo, formatoBico),
      costuraAtras: costuraAtras ? 'Sim' : '', carimbo, carimboDesc,
      adicionalDesc, adicionalValor: adicionalValor > 0 ? adicionalValor : 0,
      personalizacaoNome: nomeBordado ? nomeBordadoDesc : '', personalizacaoBordado: '',
      recorteCano, corRecorteCano: recorteCano ? corRecorteCano : '',
      recorteGaspea, corRecorteGaspea: recorteGaspea ? corRecorteGaspea : '',
      recorteTaloneira, corRecorteTaloneira: recorteTaloneira ? corRecorteTaloneira : '',
    });
    toast.success('Pedido atualizado com sucesso!');
    const sp = new URLSearchParams(searchParams);
    if (fotoParam) sp.set('foto', '1'); else sp.delete('foto');
    const qs = sp.toString();
    navigate(`/pedido/${id}${qs ? `?${qs}` : ''}`, { replace: true });
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${showFotoPanel ? 'max-w-7xl' : 'max-w-4xl'} transition-[max-width] duration-300`}>
      <div className={showFotoPanel ? 'grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="text-3xl font-display font-bold mb-6">Editar Pedido — {order.numero}</h1>

        <form onSubmit={handleSave} className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">
          <Section title="Identificação">
            <div>
              <label className={cls.label}>Link da Foto de Referência (Google Drive)</label>
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
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={cls.label}>Vendedor</label>
                {isAdmin ? (
                  <select value={vendedor} onChange={e => setVendedor(e.target.value)} className={cls.select}>
                    <option value="">Selecione...</option>
                    {allProfiles.map(p => <option key={p.id} value={p.nomeCompleto}>{p.nomeCompleto}</option>)}
                    <option value="Estoque">Estoque</option>
                  </select>
                ) : (
                  <input type="text" value={order.vendedor} readOnly className={cls.input + ' opacity-70'} />
                )}
              </div>
              <div>
                <label className={cls.label}>Número do Pedido</label>
                <input type="text" value={numeroPedido} onChange={e => setNumeroPedido(e.target.value)} className={`${cls.input} ${orderDuplicate ? 'border-destructive' : ''}`} />
                {orderDuplicate && <p className="text-xs text-destructive mt-1">{DUPLICATE_MSG}</p>}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <SelectField label="Tamanho" value={tamanho} onChange={v => { setTamanho(v); const allowed = getModelosForTamanho(v); if (modelo && !allowed.find(m => m.label === modelo)) { setModelo(''); setSolado(''); setFormatoBico(''); setCorSola(''); setCorVira(''); } }} options={TAMANHOS} />
              <SelectField label="Gênero" value={genero} onChange={setGenero} options={GENEROS} />
              <SelectField label="Modelo" value={modelo} onChange={handleModeloChange} options={getModelosForTamanho(tamanho)} />
            </div>

            <ToggleField label="Sob Medida (+R$50)" value={sobMedida} onChange={setSobMedida} textValue={sobMedidaDesc} onTextChange={setSobMedidaDesc} textPlaceholder="Descreva a medida..." />
          </Section>

          <ToggleField label="Sob Medida (+R$50)" value={sobMedida} onChange={setSobMedida} textValue={sobMedidaDesc} onTextChange={setSobMedidaDesc} textPlaceholder="Descreva a medida..." />
          <MultiSelect label="Acessórios" items={ACESSORIOS} selected={acessorios} onChange={setAcessorios} />

          <Section title="Couros">
            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField label="Tipo Couro do Cano" value={tipoCouroCano} onChange={v => { setTipoCouroCano(v); if (corCouroCano && !getDynCoresCouro(v, 'couro_cano', 'cor_couro_cano').includes(corCouroCano)) setCorCouroCano(''); }} options={TIPOS_COURO} />
              <SelectField label="Cor Couro do Cano" value={corCouroCano} onChange={setCorCouroCano} options={getDynCoresCouro(tipoCouroCano, 'couro_cano', 'cor_couro_cano')} />
              <SelectField label="Tipo Couro da Gáspea" value={tipoCouroGaspea} onChange={v => { setTipoCouroGaspea(v); if (corCouroGaspea && !getDynCoresCouro(v, 'couro_gaspea', 'cor_couro_gaspea').includes(corCouroGaspea)) setCorCouroGaspea(''); }} options={TIPOS_COURO} />
              <SelectField label="Cor Couro da Gáspea" value={corCouroGaspea} onChange={setCorCouroGaspea} options={getDynCoresCouro(tipoCouroGaspea, 'couro_gaspea', 'cor_couro_gaspea')} />
              <SelectField label="Tipo Couro da Taloneira" value={tipoCouroTaloneira} onChange={v => { setTipoCouroTaloneira(v); if (corCouroTaloneira && !getDynCoresCouro(v, 'couro_taloneira', 'cor_couro_taloneira').includes(corCouroTaloneira)) setCorCouroTaloneira(''); }} options={TIPOS_COURO} />
              <SelectField label="Cor Couro da Taloneira" value={corCouroTaloneira} onChange={setCorCouroTaloneira} options={getDynCoresCouro(tipoCouroTaloneira, 'couro_taloneira', 'cor_couro_taloneira')} />
            </div>
          </Section>

          {/* Desenvolvimento before Bordados */}
          <SelectField label="Desenvolvimento" value={desenvolvimento} onChange={setDesenvolvimento} options={DESENVOLVIMENTO} />

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

          <ToggleField label={`Nome Bordado (+R$${NOME_BORDADO_PRECO})`} value={nomeBordado} onChange={setNomeBordado} textValue={nomeBordadoDesc} onTextChange={setNomeBordadoDesc} textPlaceholder="Nome, cor, local..." />

          <Section title="Laser e Recortes">
            <MultiSelect label="Laser do Cano" items={mergedLaserCano} selected={laserCano} onChange={setLaserCano} />
            {laserCano.includes('Outro') && (
              <div><label className={cls.label}>Descreva o laser (Outro) - Cano</label><input type="text" value={laserOutroCanoText} onChange={e => setLaserOutroCanoText(e.target.value)} className={cls.input} placeholder="Nome do laser..." /></div>
            )}
            <SelectField label="Cor Glitter/Tecido do Cano (+R$30)" value={corGlitterCano} onChange={setCorGlitterCano} options={COR_GLITTER} />
            <SelectField label="Recortes do Cano" value={recorteCano} onChange={v => { setRecorteCano(v); if (!v) setCorRecorteCano(''); }} options={getDbItems('recorte_cano', [])} />
            {recorteCano && (
              <div><label className={cls.label}>Cor do Recorte (Cano)</label><input type="text" value={corRecorteCano} onChange={e => setCorRecorteCano(e.target.value)} className={cls.input} placeholder="Cor do recorte..." /></div>
            )}

            <MultiSelect label="Laser da Gáspea" items={mergedLaserGaspea} selected={laserGaspea} onChange={setLaserGaspea} />
            {laserGaspea.includes('Outro') && (
              <div><label className={cls.label}>Descreva o laser (Outro) - Gáspea</label><input type="text" value={laserOutroGaspeaText} onChange={e => setLaserOutroGaspeaText(e.target.value)} className={cls.input} placeholder="Nome do laser..." /></div>
            )}
            <SelectField label="Cor Glitter/Tecido da Gáspea (+R$30)" value={corGlitterGaspea} onChange={setCorGlitterGaspea} options={COR_GLITTER} />
            <SelectField label="Recortes da Gáspea" value={recorteGaspea} onChange={v => { setRecorteGaspea(v); if (!v) setCorRecorteGaspea(''); }} options={getDbItems('recorte_gaspea', [])} />
            {recorteGaspea && (
              <div><label className={cls.label}>Cor do Recorte (Gáspea)</label><input type="text" value={corRecorteGaspea} onChange={e => setCorRecorteGaspea(e.target.value)} className={cls.input} placeholder="Cor do recorte..." /></div>
            )}

            <MultiSelect label="Laser da Taloneira" items={mergedLaserTaloneira} selected={laserTaloneira} onChange={setLaserTaloneira} />
            {laserTaloneira.includes('Outro') && (
              <div><label className={cls.label}>Descreva o laser (Outro) - Taloneira</label><input type="text" value={laserOutroTaloneiraText} onChange={e => setLaserOutroTaloneiraText(e.target.value)} className={cls.input} placeholder="Nome do laser..." /></div>
            )}
            <SelectField label="Cor Glitter/Tecido da Taloneira (sem custo)" value={corGlitterTaloneira} onChange={setCorGlitterTaloneira} options={COR_GLITTER} />
            <SelectField label="Recortes da Taloneira" value={recorteTaloneira} onChange={v => { setRecorteTaloneira(v); if (!v) setCorRecorteTaloneira(''); }} options={getDbItems('recorte_taloneira', [])} />
            {recorteTaloneira && (
              <div><label className={cls.label}>Cor do Recorte (Taloneira)</label><input type="text" value={corRecorteTaloneira} onChange={e => setCorRecorteTaloneira(e.target.value)} className={cls.input} placeholder="Cor do recorte..." /></div>
            )}

            <ToggleField label={`Pintura (+R$${PINTURA_PRECO})`} value={pintura} onChange={setPintura} textValue={pinturaDesc} onTextChange={setPinturaDesc} textPlaceholder="Cor da tinta..." />
          </Section>

          <hr className="border-border" />

          <ToggleField label={`Estampa (+R$${ESTAMPA_PRECO})`} value={estampa} onChange={setEstampa} textValue={estampaDesc} onTextChange={setEstampaDesc} textPlaceholder="Descreva a estampa..." />

          <Section title="Pesponto">
            <div className="grid sm:grid-cols-3 gap-4">
              <SelectField label="Cor da Linha" value={corLinha} onChange={setCorLinha} options={COR_LINHA} />
              <SelectField label="Cor da Borrachinha" value={corBorrachinha} onChange={setCorBorrachinha} options={COR_BORRACHINHA} />
              <SelectField label="Cor do Vivo" value={corVivo} onChange={setCorVivo} options={COR_VIVO} />
            </div>
          </Section>

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
                      }} className="accent-primary w-4 h-4" /> {t}
                    </label>
                  ))}
                </div>
              </div>
              <SelectField label="Cor do Metal" value={corMetal} onChange={setCorMetal} options={COR_METAL} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleField label="Strass (R$0,60/un)" value={strass} onChange={setStrass} />
                {strass && <input type="number" min={0} value={strassQtd} onChange={e => setStrassQtd(Math.max(0, Number(e.target.value)))} className={cls.inputSmall + ' w-20'} placeholder="Qtd" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleField label="Cruz (R$6/un)" value={cruzMetal} onChange={setCruzMetal} />
                {cruzMetal && <input type="number" min={0} value={cruzMetalQtd} onChange={e => setCruzMetalQtd(Math.max(0, Number(e.target.value)))} className={cls.inputSmall + ' w-20'} placeholder="Qtd" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ToggleField label="Bridão (R$3/un)" value={bridaoMetal} onChange={setBridaoMetal} />
                {bridaoMetal && <input type="number" min={0} value={bridaoMetalQtd} onChange={e => setBridaoMetalQtd(Math.max(0, Number(e.target.value)))} className={cls.inputSmall + ' w-20'} placeholder="Qtd" />}
              </div>
            </div>
          </Section>

          <Section title="Extras">
            <ToggleField label={`Tricê (+R$${TRICE_PRECO})`} value={trice} onChange={setTrice} textValue={triceDesc} onTextChange={setTriceDesc} textPlaceholder="Cor do tricê..." />
            <ToggleField label={`Tiras (+R$${TIRAS_PRECO})`} value={tiras} onChange={setTiras} textValue={tirasDesc} onTextChange={setTirasDesc} textPlaceholder="Cor das tiras..." />
          </Section>

          <Section title="Solados">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SelectField label="Tipo de Solado" value={solado} onChange={handleSoladoChange} options={getSoladosForModelo(modelo, formatoBico)} />
              <SelectField label="Formato do Bico" value={formatoBico} onChange={handleBicoChange} options={getBicosForModeloSolado(modelo, solado)} />
              {getCorSolaOptions(modelo, solado, formatoBico) !== null && (
                <SelectField label="Cor da Sola" value={corSola} onChange={setCorSola} options={getCorSolaOptions(modelo, solado, formatoBico)!} />
              )}
              {getCorViraOptions(modelo, solado).length > 1 && (
                <SelectField label="Cor da Vira" value={corVira} onChange={setCorVira} options={getCorViraOptions(modelo, solado)} />
              )}
            </div>
            <ToggleField label={`Costura Atrás (+R$${COSTURA_ATRAS_PRECO})`} value={costuraAtras} onChange={setCosturaAtras} />
          </Section>

          <Section title="Carimbo a Fogo">
            <div className="flex flex-wrap items-center gap-3">
              <select value={carimbo} onChange={e => setCarimbo(e.target.value)} className={cls.inputSmall + ' w-44'}>
                <option value="">Sem carimbo</option>
                {CARIMBO.map(c => <option key={c.label} value={c.label}>{c.label} (R${c.preco})</option>)}
              </select>
              <input type="text" value={carimboDesc} onChange={e => setCarimboDesc(e.target.value)} placeholder="Quais carimbos e onde..." className={cls.inputSmall + ' flex-1 min-w-[180px]'} />
            </div>
          </Section>

          <Section title="Adicional">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={cls.label}>Descrição do Adicional</label>
                <input type="text" value={adicionalDesc} onChange={e => setAdicionalDesc(e.target.value)} placeholder="Ex: franja extra..." className={cls.input} />
              </div>
              <div>
                <label className={cls.label}>Valor do Adicional (R$)</label>
                <input type="number" min={0} step={0.01} value={adicionalValor || ''} onChange={e => setAdicionalValor(Math.max(0, Number(e.target.value)))} className={cls.input} />
              </div>
            </div>
          </Section>

          <div>
            <label className={cls.label}>Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className={cls.input + ' min-h-[80px]'} />
          </div>


          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Quantidade:</label>
            <input type="number" value={1} readOnly className={cls.inputSmall + ' w-20 opacity-70'} />
          </div>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm"><span className="font-semibold">Prazo de Produção:</span> 15 dias úteis</p>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Valor Total</span><span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <button type="submit" disabled={orderDuplicate} className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={20} /> SALVAR ALTERAÇÕES
          </button>
        </form>
      </motion.div>
        {showFotoPanel && (
          <FotoPedidoSidePanel url={fotoUrlAtual} onClose={closeFotoPanel} />
        )}
      </div>
    </div>
  );
};

export default EditOrderPage;
