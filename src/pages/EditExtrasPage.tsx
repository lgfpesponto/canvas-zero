import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import SearchableSelect from '@/components/SearchableSelect';
import { toast } from 'sonner';
import { TIPOS_COURO, CORES_COURO } from '@/lib/orderFieldsConfig';
import { EXTRA_PRODUCTS, EXTRA_PRODUCT_NAME_MAP } from '@/lib/extrasConfig';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { BotaPEItem, BotaPEExtra, BOTA_PE_EXTRA_TYPES, BOTA_PE_EXTRA_LABEL, calcEmbeddedExtraPrice, calcBootTotal, emptyBotaPE, serializeBota, deserializeBota } from '@/lib/botaExtraHelpers';

const EditExtrasPage = () => {
  const { id } = useParams();
  const { isAdmin, allOrders, updateOrder, allProfiles, user } = useAuth();
  const navigate = useNavigate();
  const order = allOrders.find(o => o.id === id);

  const [form, setForm] = useState<Record<string, any>>({});
  const [botasPE, setBotasPE] = useState<BotaPEItem[]>([emptyBotaPE()]);
  const { isDuplicate: orderDuplicate } = useCheckDuplicateOrder(form.numeroPedidoBota || '', order?.id);
  const [loaded, setLoaded] = useState(false);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!order || loaded) return;
    const det = (order.extraDetalhes || {}) as Record<string, any>;
    setForm({
      numeroPedidoBota: order.numeroPedidoBota || order.numero || '',
      vendedorSelecionado: order.vendedor || '',
      corTiras: det.corTiras || '',
      qualSola: det.qualSola || '',
      trocaGaspea: det.trocaGaspea || 'Não',
      tipoCouro: det.tipoCouro || '',
      corCouro: det.corCouro || '',
      vaiCanivete: det.vaiCanivete || 'Não',
      qtdCarimbos: det.qtdCarimbos || '1',
      descCarimbos: det.descCarimbos || '',
      ondeAplicado: det.ondeAplicado || '',
      tipoRevitalizador: det.tipoRevitalizador || '',
      quantidade: det.quantidade || String(order.quantidade || 1),
      corTira: det.corTira || '',
      tipoMetal: det.tipoMetal || '',
      corBridao: det.corBridao || '',
      metaisSelecionados: det.metaisSelecionados || [],
      qtdStrass: det.qtdStrass || '1',
      corRegata: det.corRegata || '',
      descBordadoRegata: det.descBordadoRegata || '',
      descricaoProduto: det.descricaoProduto || '',
      valorManual: det.valorManual || String(order.preco || ''),
      numeroPedidoBotaVinculo: det.numeroPedidoBotaVinculo || '',
    });
    // Load multi-bota data
    if (order.tipoExtra === 'bota_pronta_entrega' && Array.isArray(det.botas) && det.botas.length > 0) {
      setBotasPE(det.botas.map((b: any) => deserializeBota(b)));
    } else if (order.tipoExtra === 'bota_pronta_entrega') {
      setBotasPE([{
        descricao: det.descricaoProduto || '',
        valor: det.valorManual || String(order.preco || ''),
        quantidade: '1',
        extras: [],
      }]);
    }
    setLoaded(true);
  }, [order, loaded]);

  if (!isAdmin) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Acesso restrito ao administrador.</p></div>;
  if (!order) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Pedido não encontrado.</p></div>;

  const productId = order.tipoExtra || '';
  const productName = EXTRA_PRODUCT_NAME_MAP[productId] || productId;

  const calcPrice = (): number => {
    switch (productId) {
      case 'tiras_laterais': return 15;
      case 'desmanchar': {
        let total = 65;
        if (form.qualSola === 'Preta borracha') total += 25;
        else if (form.qualSola === 'De cor borracha') total += 40;
        else if (form.qualSola === 'De couro') total += 60;
        if (form.trocaGaspea === 'Sim') total += 35;
        return total;
      }
      case 'kit_canivete': return 30 + (form.vaiCanivete === 'Sim' ? 30 : 0);
      case 'kit_faca': return 35 + (form.vaiCanivete === 'Sim' ? 35 : 0);
      case 'carimbo_fogo': {
        const qty = parseInt(form.qtdCarimbos) || 1;
        return qty >= 4 ? 40 : 20;
      }
      case 'revitalizador': return 10 * (parseInt(form.quantidade) || 1);
      case 'kit_revitalizador': return 26 * (parseInt(form.quantidade) || 1);
      case 'gravata_country': return 30;
      case 'adicionar_metais': {
        let total = 0;
        const sel = (form.metaisSelecionados || []) as string[];
        if (sel.includes('Bola grande')) total += 15;
        if (sel.includes('Strass')) total += 0.60 * (parseInt(form.qtdStrass) || 1);
        return total;
      }
      case 'chaveiro_carimbo': return 50;
      case 'bainha_cartao': return 15;
      case 'regata': return 50;
      case 'bota_pronta_entrega': return botasPE.reduce((sum, b) => sum + (parseFloat(b.valor) || 0) * (parseInt(b.quantidade) || 1), 0);
      default: return 0;
    }
  };

  const PRODUCT_FIELDS: Record<string, string[]> = {
    tiras_laterais: ['corTiras', 'numeroPedidoBotaVinculo'],
    desmanchar: ['qualSola', 'trocaGaspea', 'numeroPedidoBotaVinculo'],
    kit_canivete: ['tipoCouro', 'corCouro', 'vaiCanivete', 'numeroPedidoBotaVinculo'],
    kit_faca: ['tipoCouro', 'corCouro', 'vaiCanivete', 'numeroPedidoBotaVinculo'],
    carimbo_fogo: ['qtdCarimbos', 'descCarimbos', 'ondeAplicado', 'numeroPedidoBotaVinculo'],
    revitalizador: ['tipoRevitalizador', 'quantidade'],
    kit_revitalizador: ['tipoRevitalizador', 'quantidade'],
    gravata_country: ['corTira', 'tipoMetal', 'corBridao'],
    adicionar_metais: ['metaisSelecionados', 'qtdStrass', 'numeroPedidoBotaVinculo'],
    chaveiro_carimbo: ['tipoCouro', 'corCouro', 'descCarimbos'],
    bainha_cartao: ['tipoCouro', 'corCouro'],
    regata: ['corRegata', 'descBordadoRegata'],
    bota_pronta_entrega: ['descricaoProduto', 'valorManual'],
  };

  const handleSave = async () => {
    if (!form.numeroPedidoBota?.trim()) {
      toast.error('Preencha o Nº do pedido');
      return;
    }
    if (productId === 'bota_pronta_entrega') {
      for (let i = 0; i < botasPE.length; i++) {
        if (!botasPE[i].descricao.trim()) {
          toast.error(`Preencha a descrição da bota ${i + 1}`);
          return;
        }
        if (!botasPE[i].valor || parseFloat(botasPE[i].valor) <= 0) {
          toast.error(`Preencha o valor da bota ${i + 1}`);
          return;
        }
      }
    }

    // Check for duplicate order number if changed
    const newNumero = form.numeroPedidoBota.trim();
    if (newNumero !== order.numero) {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: existing } = await supabase.from('orders').select('id').eq('numero', newNumero).neq('id', order.id).maybeSingle();
      if (existing) {
        toast.error('Número de pedido já cadastrado no sistema. Por favor, utilize outro número.');
        return;
      }
    }

    const price = calcPrice();
    let detalhes: Record<string, any> = {};

    if (productId === 'bota_pronta_entrega') {
      detalhes = {
        botas: botasPE.map(b => ({
          descricaoProduto: b.descricao,
          valorManual: b.valor,
          quantidade: b.quantidade,
        })),
      };
      if (botasPE.length === 1) {
        detalhes.descricaoProduto = botasPE[0].descricao;
        detalhes.valorManual = botasPE[0].valor;
      }
    } else {
      const relevantKeys = PRODUCT_FIELDS[productId] || [];
      for (const key of relevantKeys) {
        if (form[key] !== undefined && form[key] !== '') detalhes[key] = form[key];
      }
    }

    await updateOrder(order.id, {
      numero: form.numeroPedidoBota.trim(),
      numeroPedidoBota: form.numeroPedidoBota.trim(),
      vendedor: form.vendedorSelecionado || order.vendedor,
      preco: price,
      quantidade: productId === 'revitalizador' || productId === 'kit_revitalizador' ? (parseInt(form.quantidade) || 1) : 1,
      extraDetalhes: detalhes,
    });
    toast.success('Pedido atualizado com sucesso!');
    navigate(`/pedido/${order.id}`);
  };

  const price = calcPrice();

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft size={16} /> Voltar
        </button>

        <h1 className="text-2xl font-display font-bold mb-6">Editar — {productName}</h1>

        <div className="space-y-4">
          {/* Vendedor — ADM only */}
          {isAdmin && (
            <div>
              <Label>Vendedor</Label>
              <Select value={form.vendedorSelecionado || ''} onValueChange={v => set('vendedorSelecionado', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione vendedor" /></SelectTrigger>
                <SelectContent>
                  {allProfiles.filter(p => !(user?.nomeUsuario?.toLowerCase() === 'fernanda' && p.nomeUsuario?.toLowerCase() === 'fernanda')).map(p => <SelectItem key={p.id} value={p.nomeCompleto}>{p.nomeCompleto}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Número do pedido */}
          <div>
          <Label>{productId === 'bota_pronta_entrega' ? 'Nº do pedido (mesmo do site) *' : 'Nº do pedido *'}</Label>
            <Input value={form.numeroPedidoBota || ''} onChange={e => set('numeroPedidoBota', e.target.value)} placeholder="Ex: 7E-20240001" className={orderDuplicate ? 'border-destructive' : ''} />
            {orderDuplicate && <p className="text-xs text-destructive mt-1">{DUPLICATE_MSG}</p>}
          </div>

          {/* Número do pedido da bota — opcional, para produtos específicos */}
          {['tiras_laterais', 'desmanchar', 'kit_faca', 'kit_canivete', 'carimbo_fogo', 'adicionar_metais'].includes(productId) && (
            <div>
              <Label>Número do pedido da bota (opcional)</Label>
              <Input value={form.numeroPedidoBotaVinculo || ''} onChange={e => set('numeroPedidoBotaVinculo', e.target.value)} placeholder="Ex: 7E-20240010" />
            </div>
          )}

          {/* Product-specific fields — same as ExtrasPage */}
          {productId === 'tiras_laterais' && (
            <div>
              <Label>Cor das tiras *</Label>
              <Input value={form.corTiras || ''} onChange={e => set('corTiras', e.target.value)} placeholder="Ex: Marrom" />
            </div>
          )}

          {productId === 'desmanchar' && (
            <>
              <div>
                <Label>Qual sola *</Label>
                <Select value={form.qualSola || ''} onValueChange={v => set('qualSola', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preta borracha">Preta borracha (+R$ 25)</SelectItem>
                    <SelectItem value="De cor borracha">De cor borracha (+R$ 40)</SelectItem>
                    <SelectItem value="De couro">De couro (+R$ 60)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Troca de gáspea/taloneira *</Label>
                <Select value={form.trocaGaspea || 'Não'} onValueChange={v => set('trocaGaspea', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim (+R$ 35)</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(productId === 'kit_canivete' || productId === 'kit_faca') && (
            <>
              <div>
                <Label>Tipo de couro *</Label>
                <Select value={form.tipoCouro || ''} onValueChange={v => set('tipoCouro', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor do couro *</Label>
                <Select value={form.corCouro || ''} onValueChange={v => set('corCouro', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CORES_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vai o canivete?</Label>
                <Select value={form.vaiCanivete || 'Não'} onValueChange={v => set('vaiCanivete', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim (+R$ {productId === 'kit_canivete' ? '30' : '35'})</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {productId === 'carimbo_fogo' && (
            <>
              <div>
                <Label>Quantidade de carimbos *</Label>
                <Select value={form.qtdCarimbos || '1'} onValueChange={v => set('qtdCarimbos', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} {n >= 4 ? '(+R$ 20)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição dos carimbos *</Label>
                <Textarea value={form.descCarimbos || ''} onChange={e => set('descCarimbos', e.target.value)} placeholder="Descreva os carimbos" />
              </div>
              <div>
                <Label>Onde será aplicado *</Label>
                <Input value={form.ondeAplicado || ''} onChange={e => set('ondeAplicado', e.target.value)} placeholder="Ex: Cano direito" />
              </div>
            </>
          )}

          {productId === 'revitalizador' && (
            <>
              <div>
                <Label>Tipo *</Label>
                <Select value={form.tipoRevitalizador || ''} onValueChange={v => set('tipoRevitalizador', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Creme">Creme</SelectItem>
                    <SelectItem value="Spray">Spray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade *</Label>
                <Input type="number" min="1" value={form.quantidade || '1'} onChange={e => set('quantidade', e.target.value)} />
              </div>
            </>
          )}

          {productId === 'kit_revitalizador' && (
            <>
              <div>
                <Label>Tipo *</Label>
                <Select value={form.tipoRevitalizador || ''} onValueChange={v => set('tipoRevitalizador', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Creme">Creme</SelectItem>
                    <SelectItem value="Spray">Spray</SelectItem>
                    <SelectItem value="Um de cada">Um de cada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade de kits *</Label>
                <Input type="number" min="1" value={form.quantidade || '1'} onChange={e => set('quantidade', e.target.value)} />
              </div>
            </>
          )}

          {productId === 'gravata_country' && (
            <>
              <div>
                <Label>Cor da tira *</Label>
                <Select value={form.corTira || ''} onValueChange={v => set('corTira', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {['Preto', 'Marrom', 'Off White', 'Laranja'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de metal *</Label>
                <Select value={form.tipoMetal || ''} onValueChange={v => { set('tipoMetal', v); if (!v.startsWith('Bridão')) set('corBridao', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {['Bota', 'Chapéu', 'Mula', 'Touro', 'Bridão Estrela', 'Bridão Flor', 'Cruz'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.tipoMetal?.startsWith('Bridão') && (
                <div>
                  <Label>Cor do bridão *</Label>
                  <Select value={form.corBridao || ''} onValueChange={v => set('corBridao', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {['Cristal', 'Rosa', 'Azul', 'Preto'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {productId === 'adicionar_metais' && (
            <>
              <div className="space-y-2">
                <Label>Tipo do metal (multi seleção) *</Label>
                {[{ label: 'Bola grande (R$ 15)', value: 'Bola grande' }, { label: 'Strass (R$ 0,60/un)', value: 'Strass' }].map(item => (
                  <div key={item.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={((form.metaisSelecionados || []) as string[]).includes(item.value)}
                      onCheckedChange={(checked) => {
                        const sel = (form.metaisSelecionados || []) as string[];
                        set('metaisSelecionados', checked ? [...sel, item.value] : sel.filter(s => s !== item.value));
                      }}
                    />
                    <span className="text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
              {((form.metaisSelecionados || []) as string[]).includes('Strass') && (
                <div>
                  <Label>Quantidade de strass *</Label>
                  <Input type="number" min="1" value={form.qtdStrass || '1'} onChange={e => set('qtdStrass', e.target.value)} />
                </div>
              )}
            </>
          )}

          {(productId === 'chaveiro_carimbo' || productId === 'bainha_cartao') && (
            <>
              <div>
                <Label>Tipo de couro *</Label>
                <Select value={form.tipoCouro || ''} onValueChange={v => set('tipoCouro', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor do couro *</Label>
                <Select value={form.corCouro || ''} onValueChange={v => set('corCouro', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{CORES_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {productId === 'chaveiro_carimbo' && (
                <div>
                  <Label>Descrição dos carimbos (até 3) *</Label>
                  <Textarea value={form.descCarimbos || ''} onChange={e => set('descCarimbos', e.target.value)} placeholder="Descreva os carimbos" />
                </div>
              )}
            </>
          )}

          {productId === 'regata' && (
            <>
              <div>
                <Label>Cor *</Label>
                <Select value={form.corRegata || ''} onValueChange={v => set('corRegata', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {['Preto', 'Marrom', 'Bege', 'Azul', 'Rosa', 'Verde'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição do bordado + cor *</Label>
                <Textarea value={form.descBordadoRegata || ''} onChange={e => set('descBordadoRegata', e.target.value)} placeholder="Descrição do bordado e cor" />
              </div>
            </>
          )}

          {productId === 'bota_pronta_entrega' && (
            <>
              {botasPE.map((bota, idx) => (
                <div key={idx} className="space-y-3 p-3 border border-border rounded-lg relative">
                  {botasPE.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBotasPE(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <div>
                    <Label>Descrição da bota{botasPE.length > 1 ? ` ${idx + 1}` : ''} *</Label>
                    <Textarea
                      value={bota.descricao}
                      onChange={e => {
                        const val = e.target.value;
                        setBotasPE(prev => prev.map((b, i) => i === idx ? { ...b, descricao: val } : b));
                      }}
                      placeholder="Nome do produto + tamanho"
                    />
                  </div>
                  <div>
                    <Label>Valor da bota{botasPE.length > 1 ? ` ${idx + 1}` : ''} (R$) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bota.valor}
                      onChange={e => {
                        const val = e.target.value;
                        setBotasPE(prev => prev.map((b, i) => i === idx ? { ...b, valor: val } : b));
                      }}
                      placeholder="Ex: 350,00"
                    />
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value="1"
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setBotasPE(prev => [...prev, { descricao: '', valor: '', quantidade: '1' }])}
              >
                + 1 bota
              </Button>
            </>
          )}

          {/* Price summary */}
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Valor total:</span>
              <span className="text-primary">R$ {price.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={orderDuplicate}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditExtrasPage;
