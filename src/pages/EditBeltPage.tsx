import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderById } from '@/hooks/useOrderById';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FotoPedidoSidePanel } from '@/components/FotoPedidoSidePanel';
import { isHttpUrl } from '@/lib/driveUrl';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link2, X, Save, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { TIPOS_COURO, CORES_COURO } from '@/lib/orderFieldsConfig';
import {
  BELT_SIZES, BORDADO_P_PRECO, NOME_BORDADO_CINTO_PRECO, BELT_CARIMBO,
  FIVELA_OPTIONS,
} from '@/lib/extrasConfig';
import { useEditWithJustification } from '@/hooks/useEditWithJustification';
import { JustificativaDialog } from '@/components/JustificativaDialog';

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

const EditBeltPage = () => {
  const { id } = useParams();
  const { isAdmin, updateOrder, allProfiles } = useAuth();
  const { requestSave, dialogProps } = useEditWithJustification();
  const { order, loading: orderLoading } = useOrderById(id);
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

  const [vendedor, setVendedor] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const { isDuplicate: orderDuplicate } = useCheckDuplicateOrder(numeroPedido, order?.id);
  const [cliente, setCliente] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [tipoCouro, setTipoCouro] = useState('');
  const [corCouro, setCorCouro] = useState('');

  const [bordadoP, setBordadoP] = useState(false);
  const [bordadoPDesc, setBordadoPDesc] = useState('');
  const [bordadoPCor, setBordadoPCor] = useState('');

  const [nomeBordado, setNomeBordado] = useState(false);
  const [nomeBordadoDesc, setNomeBordadoDesc] = useState('');
  const [nomeBordadoCor, setNomeBordadoCor] = useState('');
  const [nomeBordadoFonte, setNomeBordadoFonte] = useState('');

  const [carimbo, setCarimbo] = useState('');
  const [carimboDesc, setCarimboDesc] = useState('');
  const [carimboOnde, setCarimboOnde] = useState('');

  const [fivela, setFivela] = useState('');
  const [fivelaOutroDesc, setFivelaOutroDesc] = useState('');

  const [adicionalValor, setAdicionalValor] = useState('');
  const [adicionalDesc, setAdicionalDesc] = useState('');

  const [observacao, setObservacao] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!order || loaded) return;
    const det = (order.extraDetalhes || {}) as Record<string, any>;
    setVendedor(order.vendedor || '');
    setNumeroPedido(order.numero || '');
    setCliente(order.cliente || '');
    // tamanho cinto saved like "P (R$X)" or "P" → strip suffix and find best match
    const tamRaw = det.tamanhoCinto || '';
    const matchedSize = BELT_SIZES.find(s => tamRaw.startsWith(s.label))?.label || '';
    setTamanho(matchedSize);
    setTipoCouro(det.tipoCouro || '');
    setCorCouro(det.corCouro || '');
    setBordadoP(det.bordadoP === 'Tem');
    setBordadoPDesc(det.bordadoPDesc || '');
    setBordadoPCor(det.bordadoPCor || '');
    setNomeBordado(det.nomeBordado === 'Tem');
    setNomeBordadoDesc(det.nomeBordadoDesc || '');
    setNomeBordadoCor(det.nomeBordadoCor || '');
    setNomeBordadoFonte(det.nomeBordadoFonte || '');
    setCarimbo(det.carimbo || '');
    setCarimboDesc(det.carimboDesc || '');
    setCarimboOnde(det.ondeAplicado || '');
    setFivela(det.fivela || '');
    setFivelaOutroDesc(det.fivelaOutroDesc || '');
    setAdicionalValor(order.adicionalValor ? String(order.adicionalValor) : '');
    setAdicionalDesc(order.adicionalDesc || '');
    setObservacao(order.observacao || '');
    setFotoUrl((order.fotos || []).find(f => isHttpUrl(f)) || '');
    setLoaded(true);
  }, [order, loaded]);

  if (!isAdmin) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Acesso restrito ao administrador.</p></div>;
  if (orderLoading) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!order) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Pedido não encontrado.</p></div>;
  if (order.tipoExtra !== 'cinto') {
    return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Este pedido não é um cinto.</p></div>;
  }

  const tamanhoPreco = BELT_SIZES.find(s => s.label === tamanho)?.preco || 0;
  const bordadoPPreco = bordadoP ? BORDADO_P_PRECO : 0;
  const nomeBordadoPreco = nomeBordado ? NOME_BORDADO_CINTO_PRECO : 0;
  const carimboPreco = BELT_CARIMBO.find(c => c.label === carimbo)?.preco || 0;
  const adicionalPreco = parseFloat(adicionalValor) || 0;
  const total = tamanhoPreco + bordadoPPreco + nomeBordadoPreco + carimboPreco + adicionalPreco;

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
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
    if (orderDuplicate) {
      toast.error(DUPLICATE_MSG);
      return;
    }

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

      await updateOrder(order.id, {
        numero: numeroPedido.trim(),
        cliente: cliente.trim(),
        vendedor,
        preco: total,
        quantidade: 1,
        observacao,
        adicionalValor: adicionalPreco > 0 ? adicionalPreco : null,
        adicionalDesc: adicionalDesc.trim() || null,
        fotos: fotoUrl.trim() ? [fotoUrl.trim()] : [],
        extraDetalhes,
      } as any);
      toast.success('Cinto atualizado com sucesso!');
      const sp = new URLSearchParams(searchParams);
      if (fotoParam) sp.set('foto', '1'); else sp.delete('foto');
      const qs = sp.toString();
      navigate(`/pedido/${order.id}${qs ? `?${qs}` : ''}`, { replace: true });
    } catch (err) {
      console.error('updateBelt error:', err);
      toast.error('Erro ao salvar alterações.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${showFotoPanel ? 'max-w-7xl' : 'max-w-4xl'} transition-[max-width] duration-300`}>
      <div className={showFotoPanel ? 'grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start' : ''}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <h1 className="text-3xl font-display font-bold mb-6">Editar Cinto — {order.numero}</h1>

          <form onSubmit={handleSave} className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">
            <Section title="Identificação">
              <div>
                <label className={cls.label}>Link da Foto de Referência (Google Drive)</label>
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-muted-foreground flex-shrink-0" />
                  <input type="url" value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} placeholder="Cole o link do Google Drive aqui..." className={cls.input} />
                  {fotoUrl && (
                    <button type="button" onClick={() => setFotoUrl('')} className="text-destructive hover:text-destructive/80">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Vendedor</label>
                  <select value={vendedor} onChange={e => setVendedor(e.target.value)} className={cls.select}>
                    <option value="">Selecione...</option>
                    {allProfiles.map(p => <option key={p.id} value={p.nomeCompleto}>{p.nomeCompleto}</option>)}
                    <option value="Estoque">Estoque</option>
                  </select>
                </div>
                <div>
                  <label className={cls.label}>Número do Pedido<span className="text-destructive ml-0.5">*</span></label>
                  <input type="text" value={numeroPedido} onChange={e => setNumeroPedido(e.target.value)} className={`${cls.input} ${orderDuplicate ? 'border-destructive' : ''}`} />
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

            <Section title="Couro">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Tipo de Couro<span className="text-destructive ml-0.5">*</span></label>
                  <SearchableSelect options={TIPOS_COURO} value={tipoCouro} onValueChange={setTipoCouro} placeholder="Selecione..." />
                </div>
                <div>
                  <label className={cls.label}>Cor do Couro<span className="text-destructive ml-0.5">*</span></label>
                  <SearchableSelect options={CORES_COURO} value={corCouro} onValueChange={setCorCouro} placeholder="Selecione..." />
                </div>
              </div>
            </Section>

            <Section title="Fivela">
              <div>
                <label className={cls.label}>Fivela<span className="text-destructive ml-0.5">*</span></label>
                <SearchableSelect options={FIVELA_OPTIONS} value={fivela} onValueChange={setFivela} placeholder="Selecione..." />
              </div>
              {fivela === 'Outro' && (
                <div className="mt-3">
                  <label className={cls.label}>Descrever fivela</label>
                  <input type="text" value={fivelaOutroDesc} onChange={e => setFivelaOutroDesc(e.target.value)} placeholder="Descreva a fivela..." className={cls.input} />
                </div>
              )}
            </Section>

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
                    <label className={cls.label}>Descrição do Bordado<span className="text-destructive ml-0.5">*</span></label>
                    <input type="text" value={bordadoPDesc} onChange={e => setBordadoPDesc(e.target.value)} placeholder="Descreva o bordado..." className={cls.input} />
                  </div>
                  <div>
                    <label className={cls.label}>Cor do Bordado</label>
                    <input type="text" value={bordadoPCor} onChange={e => setBordadoPCor(e.target.value)} placeholder="Cor..." className={cls.input} />
                  </div>
                </div>
              )}
            </Section>

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
                    <label className={cls.label}>Descrição<span className="text-destructive ml-0.5">*</span></label>
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

            <Section title="Adicional">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={cls.label}>Valor do Adicional (R$)</label>
                  <input type="number" step="0.01" min="0" value={adicionalValor} onChange={e => setAdicionalValor(e.target.value)} placeholder="0,00" className={cls.input} />
                </div>
                <div>
                  <label className={cls.label}>Descrição do Adicional</label>
                  <input type="text" value={adicionalDesc} onChange={e => setAdicionalDesc(e.target.value)} placeholder="Motivo do adicional..." className={cls.input} />
                </div>
              </div>
            </Section>

            <div>
              <label className={cls.label}>Observação</label>
              <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className={cls.input + ' min-h-[80px]'} />
            </div>



            <div className="bg-muted rounded-lg p-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Valor Total</span><span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <button type="submit" disabled={orderDuplicate || submitting} className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={20} /> {submitting ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
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

export default EditBeltPage;
