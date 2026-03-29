import { useState, useEffect } from 'react';
import { useAuth, formatBrasiliaDate, formatBrasiliaTime } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { saveDraft, deleteDraft } from '@/lib/drafts';
import { Link2, X, Eye } from 'lucide-react';
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
    <h3 className="text-base font-display font-bold border-b border-border pb-1">{title}</h3>
    {children}
  </div>
);

const BeltOrderPage = () => {
  const { isLoggedIn, user, addOrder, isAdmin, allProfiles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const draftData = (location.state as any)?.draft;

  const isAdminUser = isAdmin;

  // Form state
  const [vendedor, setVendedor] = useState(user?.nomeCompleto || '');
  const [numeroPedido, setNumeroPedido] = useState('');
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
  const [showMirror, setShowMirror] = useState(false);
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

  const confirmOrder = async () => {
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
        toast.success('Pedido de cinto criado com sucesso!');
        navigate('/relatorios');
      } else {
        toast.error('Erro ao salvar o pedido. Faça login novamente e tente.');
      }
    } catch (err) {
      console.error('confirmOrder error:', err);
      toast.error('Erro inesperado ao salvar o pedido.');
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

  const mirrorRows: [string, string][] = [
    ['Vendedor', isAdminUser ? vendedor : (user?.nomeCompleto || '')],
    ['Número do Pedido', numeroPedido],
    ['Cliente', cliente],
    ['Tamanho', tamanho ? `${tamanho} (${formatCurrency(tamanhoPreco)})` : ''],
    ['Tipo de Couro', tipoCouro],
    ['Cor do Couro', corCouro],
    ['Bordado P', bordadoP ? `Tem — ${bordadoPDesc}${bordadoPCor ? ' | Cor: ' + bordadoPCor : ''}` : ''],
    ['Nome Bordado', nomeBordado ? `Tem — ${nomeBordadoDesc}${nomeBordadoCor ? ' | Cor: ' + nomeBordadoCor : ''}${nomeBordadoFonte ? ' | Fonte: ' + nomeBordadoFonte : ''}` : ''],
    ['Carimbo a Fogo', carimbo ? `${carimbo}${carimboDesc ? ' — ' + carimboDesc : ''}${carimboOnde ? ' | Local: ' + carimboOnde : ''}` : ''],
    ['Fivela', fivela ? (fivela === 'Outro' && fivelaOutroDesc ? `Outro — ${fivelaOutroDesc}` : fivela) : ''],
    ['Adicional', adicionalPreco ? `${formatCurrency(adicionalPreco)}${adicionalDesc ? ' — ' + adicionalDesc : ''}` : ''],
    ['Observação', observacao],
    ['Quantidade', '1'],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold mb-6">Ficha de Produção — Cinto</h1>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 md:p-8 western-shadow space-y-6">

          {/* Vendedor + Número */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={cls.label}>Vendedor</label>
              {isAdminUser ? (
                <select value={vendedor} onChange={e => setVendedor(e.target.value)} className={cls.select}>
                  {allProfiles.map(p => (
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
              <input type="text" value={numeroPedido} onChange={e => setNumeroPedido(e.target.value)} placeholder="Ex: 7E-20250001" required className={cls.input} />
            </div>
            <div>
              <label className={cls.label}>Cliente</label>
              <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente (opcional)" className={cls.input} />
            </div>
          </div>

          {/* Tamanho */}
          <div>
            <label className={cls.label}>Tamanho<span className="text-destructive ml-0.5">*</span></label>
            <select value={tamanho} onChange={e => setTamanho(e.target.value)} className={cls.select}>
              <option value="">Selecione...</option>
              {BELT_SIZES.map(s => (
                <option key={s.label} value={s.label}>{s.label} (R${s.preco})</option>
              ))}
            </select>
          </div>

          {/* Couro */}
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

          {/* Fivela */}
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
                <input type="number" step="0.01" min="0" value={adicionalValor} onChange={e => setAdicionalValor(e.target.value)} placeholder="0,00" className={cls.input} />
              </div>
              <div>
                <label className={cls.label}>Descrição do Adicional</label>
                <input type="text" value={adicionalDesc} onChange={e => setAdicionalDesc(e.target.value)} placeholder="Motivo do adicional..." className={cls.input} />
              </div>
            </div>
          </Section>

          {/* Observação */}
          <div>
            <label className={cls.label}>Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className={cls.input + ' min-h-[80px]'} />
          </div>

          {/* Link da Foto */}
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

          <button type="submit" className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2">
            <Eye size={20} /> CONFERIR E FINALIZAR PEDIDO
          </button>
          <button type="button" onClick={handleSaveDraft} className="w-full border-2 border-primary text-primary py-3 rounded-lg font-bold tracking-wider hover:bg-primary/10 transition-colors text-lg flex items-center justify-center gap-2">
            SALVAR RASCUNHO
          </button>
        </form>
      </motion.div>

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
              <button onClick={confirmOrder} className="flex-1 orange-gradient text-primary-foreground py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">OK — FINALIZAR</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BeltOrderPage;
