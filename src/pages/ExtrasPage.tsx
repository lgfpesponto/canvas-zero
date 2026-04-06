import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckDuplicateOrder, DUPLICATE_MSG } from '@/hooks/useCheckDuplicateOrder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { TIPOS_COURO, CORES_COURO } from '@/lib/orderFieldsConfig';
import { EXTRA_PRODUCTS, GRAVATA_COR_TIRA, GRAVATA_TIPO_METAL, COR_BRILHO_GRAVATA } from '@/lib/extrasConfig';
import { ShoppingCart, Package, Settings, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StockItem {
  id: string;
  cor_tira: string;
  tipo_metal: string;
  quantidade: number;
  cor_brilho?: string;
}

const emptyForm = (): Record<string, any> => ({
  numeroPedidoBota: '',
  cliente: '',
  corTiras: '',
  qualSola: '',
  trocaGaspea: 'Não',
  tipoCouro: '',
  corCouro: '',
  vaiCanivete: 'Não',
  qtdCarimbos: '1',
  descCarimbos: '',
  ondeAplicado: '',
  tipoRevitalizador: '',
  quantidade: '1',
  corTira: '',
  tipoMetal: '',
  corBridao: '',
  metaisSelecionados: [] as string[],
  qtdStrass: '1',
  corRegata: '',
  descBordadoRegata: '',
  descricaoProduto: '',
  valorManual: '',
  numeroPedidoBotaVinculo: '',
});

const ExtrasPage = () => {
  const { isLoggedIn, user, addOrder, isAdmin, allProfiles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(emptyForm());
  const { isDuplicate: orderDuplicate } = useCheckDuplicateOrder(form.numeroPedidoBota || '');

  // Gravata stock
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [showStockManager, setShowStockManager] = useState(false);
  const [stockCorTira, setStockCorTira] = useState('');
  const [stockTipoMetal, setStockTipoMetal] = useState('');
  const [stockQtd, setStockQtd] = useState('');
  const [stockCorBrilho, setStockCorBrilho] = useState('');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockQtd, setEditingStockQtd] = useState('');
  const [gravataSearch, setGravataSearch] = useState('');

  const fetchStock = useCallback(async () => {
    const { data } = await supabase.from('gravata_stock').select('*');
    if (data) setStockItems(data as StockItem[]);
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const openModal = (productId: string) => {
    if (!isLoggedIn) {
      toast({ title: 'Faça login para comprar extras', variant: 'destructive' });
      navigate('/login');
      return;
    }
    setForm(emptyForm());
    setSelectedStockId('');
    setOpenProduct(productId);
    if (productId === 'gravata_pronta_entrega') fetchStock();
  };

  const calcPrice = (productId: string): number => {
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
      case 'gravata_pronta_entrega': return 30;
      case 'adicionar_metais': {
        let total = 0;
        const sel = form.metaisSelecionados as string[];
        if (sel.includes('Bola grande')) total += 15;
        if (sel.includes('Strass')) total += 0.60 * (parseInt(form.qtdStrass) || 1);
        return total;
      }
      case 'chaveiro_carimbo': return 50;
      case 'bainha_cartao': return 15;
      case 'regata': return 50;
      case 'bota_pronta_entrega': return parseFloat(form.valorManual) || 0;
      default: return 0;
    }
  };

  const handleSubmit = async (productId: string) => {
    try {
      const product = EXTRA_PRODUCTS.find(p => p.id === productId)!;

      const isFernandaUser = user?.nomeUsuario?.toLowerCase() === 'fernanda';
      if (isFernandaUser && (!form.vendedorSelecionado || form.vendedorSelecionado === user?.nomeCompleto)) {
        toast({ title: 'Por favor, selecione um vendedor válido.', variant: 'destructive' });
        return;
      }
      if (!form.numeroPedidoBota.trim()) {
        toast({ title: 'Preencha o Nº do pedido', variant: 'destructive' });
        return;
      }

      if (productId === 'bota_pronta_entrega') {
        if (!form.valorManual || parseFloat(form.valorManual) <= 0) {
          toast({ title: 'Preencha o valor do produto', variant: 'destructive' });
          return;
        }
      }

      if (productId === 'gravata_pronta_entrega') {
        if (!selectedStockId) {
          toast({ title: 'Selecione uma variação disponível', variant: 'destructive' });
          return;
        }
        const stockItem = stockItems.find(s => s.id === selectedStockId);
        if (!stockItem || stockItem.quantidade <= 0) {
          toast({ title: 'Variação sem estoque disponível', variant: 'destructive' });
          return;
        }
      }

      const price = calcPrice(productId);

      const PRODUCT_FIELDS: Record<string, string[]> = {
        tiras_laterais: ['corTiras', 'numeroPedidoBotaVinculo'],
        desmanchar: ['qualSola', 'trocaGaspea', 'numeroPedidoBotaVinculo'],
        kit_canivete: ['tipoCouro', 'corCouro', 'vaiCanivete', 'numeroPedidoBotaVinculo'],
        kit_faca: ['tipoCouro', 'corCouro', 'vaiCanivete', 'numeroPedidoBotaVinculo'],
        carimbo_fogo: ['qtdCarimbos', 'descCarimbos', 'ondeAplicado', 'numeroPedidoBotaVinculo'],
        revitalizador: ['tipoRevitalizador', 'quantidade'],
        kit_revitalizador: ['tipoRevitalizador', 'quantidade'],
        gravata_country: ['corTira', 'tipoMetal', 'corBridao'],
        gravata_pronta_entrega: ['corTira', 'tipoMetal'],
        adicionar_metais: ['metaisSelecionados', 'qtdStrass', 'numeroPedidoBotaVinculo'],
        chaveiro_carimbo: ['tipoCouro', 'corCouro', 'descCarimbos'],
        bainha_cartao: ['tipoCouro', 'corCouro'],
        regata: ['corRegata', 'descBordadoRegata'],
        bota_pronta_entrega: ['descricaoProduto', 'valorManual'],
      };

      let detalhes: Record<string, any> = {};

      if (productId === 'gravata_pronta_entrega') {
        const stockItem = stockItems.find(s => s.id === selectedStockId)!;
        detalhes = { corTira: stockItem.cor_tira, tipoMetal: stockItem.tipo_metal };
        if (stockItem.cor_brilho) detalhes.corBrilho = stockItem.cor_brilho;
      } else {
        const relevantKeys = PRODUCT_FIELDS[productId] || [];
        for (const key of relevantKeys) {
          if (form[key] !== undefined && form[key] !== '') detalhes[key] = form[key];
        }
      }

      const success = await addOrder({
        vendedor: isAdmin ? (form.vendedorSelecionado || user?.nomeCompleto || '') : (user?.nomeCompleto || ''),
        cliente: (form.cliente || '').trim(),
        tamanho: '-',
        modelo: `Extra — ${product.nome}`,
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
        observacao: '',
        quantidade: productId === 'revitalizador' || productId === 'kit_revitalizador' ? (parseInt(form.quantidade) || 1) : 1,
        preco: price,
        temLaser: false,
        fotos: [],
        tipoExtra: productId,
        extraDetalhes: detalhes,
        numeroPedidoBota: form.numeroPedidoBota.trim(),
        numeroPedido: form.numeroPedidoBota.trim(),
      });

      if (success) {
        // Decrement stock for gravata_pronta_entrega
        if (productId === 'gravata_pronta_entrega') {
          await supabase.rpc('decrement_stock', { stock_id: selectedStockId });
          fetchStock();
        }
        setOpenProduct(null);
        toast({ title: `Pedido de ${product.nome} criado com sucesso!` });
        navigate('/relatorios');
      } else {
        toast({ title: 'Erro ao salvar o pedido. Faça login novamente e tente.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('handleSubmit error:', err);
      toast({ title: 'Erro inesperado ao salvar o pedido.', variant: 'destructive' });
    }
  };

  const handleSaveStock = async () => {
    if (!stockCorTira || !stockTipoMetal || !stockQtd || parseInt(stockQtd) <= 0) {
      toast({ title: 'Preencha todos os campos do estoque', variant: 'destructive' });
      return;
    }
    const needsBrilho = stockTipoMetal === 'Bridão Flor' || stockTipoMetal === 'Bridão Estrela';
    if (needsBrilho && !stockCorBrilho) {
      toast({ title: 'Selecione a cor do brilho', variant: 'destructive' });
      return;
    }
    const qty = parseInt(stockQtd);
    const corBrilhoVal = needsBrilho ? stockCorBrilho : null;
    // Check if combination exists
    const existing = stockItems.find(s => s.cor_tira === stockCorTira && s.tipo_metal === stockTipoMetal && (s.cor_brilho || null) === corBrilhoVal);
    if (existing) {
      const { error } = await supabase.from('gravata_stock').update({ quantidade: existing.quantidade + qty }).eq('id', existing.id);
      if (error) {
        toast({ title: 'Erro ao atualizar estoque', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase.from('gravata_stock').insert({ cor_tira: stockCorTira, tipo_metal: stockTipoMetal, quantidade: qty, cor_brilho: corBrilhoVal } as any);
      if (error) {
        toast({ title: 'Erro ao criar estoque', description: error.message, variant: 'destructive' });
        return;
      }
    }
    setStockCorTira('');
    setStockTipoMetal('');
    setStockQtd('');
    setStockCorBrilho('');
    await fetchStock();
    toast({ title: 'Estoque atualizado com sucesso!' });
  };

  const renderForm = (productId: string) => {
    const price = calcPrice(productId);

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Vendedor — ADM only */}
        {isAdmin && (
          <div>
            <Label>Vendedor</Label>
            <Select value={form.vendedorSelecionado || (user?.nomeUsuario?.toLowerCase() === 'fernanda' ? '' : (user?.nomeCompleto || ''))} onValueChange={v => set('vendedorSelecionado', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione vendedor" /></SelectTrigger>
              <SelectContent>
                {allProfiles.filter(p => !(user?.nomeUsuario?.toLowerCase() === 'fernanda' && p.nomeUsuario?.toLowerCase() === 'fernanda')).map(p => <SelectItem key={p.id} value={p.nomeCompleto}>{p.nomeCompleto}</SelectItem>)}
                <SelectItem value="Estoque">Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Número do pedido — obrigatório em TODOS */}
        <div>
          <Label>Nº do pedido *</Label>
          <Input value={form.numeroPedidoBota} onChange={e => set('numeroPedidoBota', e.target.value)} placeholder="Ex: 7E-20240001" className={orderDuplicate ? 'border-destructive' : ''} />
          {orderDuplicate && <p className="text-xs text-destructive mt-1">{DUPLICATE_MSG}</p>}
        </div>
        {/* Número do pedido da bota — opcional, para produtos específicos */}
        {['tiras_laterais', 'desmanchar', 'kit_faca', 'kit_canivete', 'carimbo_fogo', 'adicionar_metais'].includes(productId) && (
          <div>
            <Label>Número do pedido da bota (opcional)</Label>
            <Input value={form.numeroPedidoBotaVinculo || ''} onChange={e => set('numeroPedidoBotaVinculo', e.target.value)} placeholder="Ex: 7E-20240010" />
          </div>
        )}
        {/* Cliente — opcional */}
        <div>
          <Label>Cliente</Label>
          <Input value={form.cliente || ''} onChange={e => set('cliente', e.target.value)} placeholder="Nome do cliente (opcional)" />
        </div>

        {/* Product-specific fields */}
        {productId === 'tiras_laterais' && (
          <div>
            <Label>Cor das tiras *</Label>
            <Input value={form.corTiras} onChange={e => set('corTiras', e.target.value)} placeholder="Ex: Marrom" />
          </div>
        )}

        {productId === 'desmanchar' && (
          <>
            <div>
              <Label>Qual sola *</Label>
              <Select value={form.qualSola} onValueChange={v => set('qualSola', v)}>
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
              <Select value={form.trocaGaspea} onValueChange={v => set('trocaGaspea', v)}>
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
              <SearchableSelect options={TIPOS_COURO} value={form.tipoCouro} onValueChange={v => set('tipoCouro', v)} placeholder="Selecione" />
            </div>
            <div>
              <Label>Cor do couro *</Label>
              <SearchableSelect options={CORES_COURO} value={form.corCouro} onValueChange={v => set('corCouro', v)} placeholder="Selecione" />
            </div>
            <div>
              <Label>Vai o canivete?</Label>
              <Select value={form.vaiCanivete} onValueChange={v => set('vaiCanivete', v)}>
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
              <Select value={form.qtdCarimbos} onValueChange={v => set('qtdCarimbos', v)}>
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
              <Textarea value={form.descCarimbos} onChange={e => set('descCarimbos', e.target.value)} placeholder="Descreva os carimbos" />
            </div>
            <div>
              <Label>Onde será aplicado *</Label>
              <Input value={form.ondeAplicado} onChange={e => set('ondeAplicado', e.target.value)} placeholder="Ex: Cano direito" />
            </div>
          </>
        )}

        {productId === 'revitalizador' && (
          <>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipoRevitalizador} onValueChange={v => set('tipoRevitalizador', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Creme">Creme</SelectItem>
                  <SelectItem value="Spray">Spray</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input type="number" min="1" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
            </div>
          </>
        )}

        {productId === 'kit_revitalizador' && (
          <>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipoRevitalizador} onValueChange={v => set('tipoRevitalizador', v)}>
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
              <Input type="number" min="1" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
            </div>
          </>
        )}

        {productId === 'gravata_country' && (
          <>
            <div>
              <Label>Cor da tira *</Label>
              <SearchableSelect options={GRAVATA_COR_TIRA} value={form.corTira} onValueChange={v => set('corTira', v)} placeholder="Selecione" />
            </div>
            <div>
              <Label>Tipo de metal *</Label>
              <SearchableSelect options={GRAVATA_TIPO_METAL} value={form.tipoMetal} onValueChange={v => { set('tipoMetal', v); if (!v.startsWith('Bridão')) set('corBridao', ''); }} placeholder="Selecione" />
            </div>
            {form.tipoMetal?.startsWith('Bridão') && (
              <div>
                <Label>Cor do bridão *</Label>
                <SearchableSelect options={['Cristal', 'Rosa', 'Azul', 'Preto']} value={form.corBridao} onValueChange={v => set('corBridao', v)} placeholder="Selecione" />
              </div>
            )}
          </>
        )}

        {productId === 'gravata_pronta_entrega' && (
          <>
            {(() => {
              const available = stockItems.filter(s => s.quantidade > 0);
              const searchLower = gravataSearch.toLowerCase();
              const filtered = gravataSearch
                ? available.filter(s => `${s.cor_tira} ${s.tipo_metal} ${s.cor_brilho || ''}`.toLowerCase().includes(searchLower))
                : available;
              if (available.length === 0) {
                return <p className="text-sm text-muted-foreground">Nenhuma variação com estoque disponível.</p>;
              }
              return (
                <div>
                  <Label>Selecione a variação *</Label>
                  <div className="relative mt-1 mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={gravataSearch}
                      onChange={e => setGravataSearch(e.target.value)}
                      placeholder="Pesquisar gravata..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <RadioGroup value={selectedStockId} onValueChange={setSelectedStockId} className="space-y-2">
                    {filtered.map(item => (
                      <div key={item.id} className="flex items-center space-x-2 rounded-lg border border-border p-3">
                        <RadioGroupItem value={item.id} id={`stock-${item.id}`} />
                        <Label htmlFor={`stock-${item.id}`} className="flex-1 cursor-pointer font-normal">
                          {item.cor_tira} + {item.tipo_metal}{item.cor_brilho ? ` + ${item.cor_brilho}` : ''} <span className="text-muted-foreground">({item.quantidade} disponíve{item.quantidade === 1 ? 'l' : 'is'})</span>
                        </Label>
                      </div>
                    ))}
                    {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum resultado para "{gravataSearch}".</p>}
                  </RadioGroup>
                </div>
              );
            })()}
          </>
        )}

        {productId === 'adicionar_metais' && (
          <>
            <div className="space-y-2">
              <Label>Tipo do metal (multi seleção) *</Label>
              {[{ label: 'Bola grande (R$ 15)', value: 'Bola grande' }, { label: 'Strass (R$ 0,60/un)', value: 'Strass' }].map(item => (
                <div key={item.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={(form.metaisSelecionados as string[]).includes(item.value)}
                    onCheckedChange={(checked) => {
                      const sel = form.metaisSelecionados as string[];
                      set('metaisSelecionados', checked ? [...sel, item.value] : sel.filter(s => s !== item.value));
                    }}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
            {(form.metaisSelecionados as string[]).includes('Strass') && (
              <div>
                <Label>Quantidade de strass *</Label>
                <Input type="number" min="1" value={form.qtdStrass} onChange={e => set('qtdStrass', e.target.value)} />
              </div>
            )}
          </>
        )}

        {(productId === 'chaveiro_carimbo' || productId === 'bainha_cartao') && (
          <>
            <div>
              <Label>Tipo de couro *</Label>
              <SearchableSelect options={TIPOS_COURO} value={form.tipoCouro} onValueChange={v => set('tipoCouro', v)} placeholder="Selecione" />
            </div>
            <div>
              <Label>Cor do couro *</Label>
              <SearchableSelect options={CORES_COURO} value={form.corCouro} onValueChange={v => set('corCouro', v)} placeholder="Selecione" />
            </div>
            {productId === 'chaveiro_carimbo' && (
              <div>
                <Label>Descrição dos carimbos (até 3) *</Label>
                <Textarea value={form.descCarimbos} onChange={e => set('descCarimbos', e.target.value)} placeholder="Descreva os carimbos" />
              </div>
            )}
          </>
        )}

        {productId === 'regata' && (
          <>
            <div>
              <Label>Cor *</Label>
              <SearchableSelect options={['Preto', 'Marrom', 'Bege', 'Azul', 'Rosa', 'Verde']} value={form.corRegata} onValueChange={v => set('corRegata', v)} placeholder="Selecione" />
            </div>
            <div>
              <Label>Descrição do bordado + cor *</Label>
              <Textarea value={form.descBordadoRegata} onChange={e => set('descBordadoRegata', e.target.value)} placeholder="Descrição do bordado e cor" />
            </div>
          </>
        )}

        {productId === 'bota_pronta_entrega' && (
          <>
            <div>
              <Label>Descrição do produto</Label>
              <Textarea value={form.descricaoProduto} onChange={e => set('descricaoProduto', e.target.value)} placeholder="Descreva o produto" />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={form.valorManual} onChange={e => set('valorManual', e.target.value)} placeholder="Ex: 350,00" />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value="1" disabled className="opacity-60" />
            </div>
          </>
        )}

        {/* Price summary */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Valor total:</span>
            <span className="text-primary">R$ {price.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <Button className="w-full" onClick={() => handleSubmit(productId)} disabled={orderDuplicate}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Finalizar Pedido
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">EXTRAS</h1>
          <p className="text-muted-foreground mt-2">Produtos e serviços adicionais</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {EXTRA_PRODUCTS.map(product => (
            <Card key={product.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{product.nome}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2 flex-1">{product.descricao}</p>
                <p className="text-sm font-bold text-primary mb-4">{product.precoLabel}</p>
                <div className="space-y-2">
                  <Button onClick={() => openModal(product.id)} className="w-full">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Comprar
                  </Button>
                  {product.id === 'gravata_pronta_entrega' && isAdmin && (
                    <Button variant="outline" className="w-full" onClick={() => { fetchStock(); setShowStockManager(true); }}>
                      <Settings className="mr-2 h-4 w-4" />
                      Organizar estoque
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Product modals */}
      {EXTRA_PRODUCTS.map(product => (
        <Dialog key={product.id} open={openProduct === product.id} onOpenChange={open => !open && setOpenProduct(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{product.nome}</DialogTitle>
            </DialogHeader>
            {openProduct === product.id && renderForm(product.id)}
          </DialogContent>
        </Dialog>
      ))}

      {/* Stock Manager Dialog */}
      <Dialog open={showStockManager} onOpenChange={setShowStockManager}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Organizar Estoque — Gravata Pronta Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Current stock */}
            {stockItems.length > 0 && (
              <div>
                <Label className="text-base font-semibold">Estoque atual</Label>
                <div className="mt-2 space-y-1">
                  {stockItems.map(item => {
                    const isEditing = editingStockId === item.id;
                    return (
                      <div key={item.id} className="flex justify-between items-center rounded-lg border border-border p-2 text-sm gap-2">
                        <span className="flex-1">{item.cor_tira} + {item.tipo_metal}{item.cor_brilho ? ` + ${item.cor_brilho}` : ''}</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              className="w-20 h-8"
                              value={editingStockQtd}
                              onChange={e => setEditingStockQtd(e.target.value)}
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={async () => {
                              await supabase.from('gravata_stock').update({ quantidade: parseInt(editingStockQtd) || 0 }).eq('id', item.id);
                              setEditingStockId(null);
                              fetchStock();
                            }}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingStockId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{item.quantidade} un</span>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingStockId(item.id); setEditingStockQtd(String(item.quantidade)); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={async () => {
                              await supabase.from('gravata_stock').delete().eq('id', item.id);
                              fetchStock();
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {stockItems.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma variação cadastrada.</p>
            )}

            {/* Add stock form */}
            <div className="pt-4 border-t border-border space-y-3">
              <Label className="text-base font-semibold">Adicionar ao estoque</Label>
              <div>
                <Label>Cor da tira *</Label>
                <select value={stockCorTira} onChange={e => setStockCorTira(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option value="">Selecione</option>
                  {GRAVATA_COR_TIRA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Tipo de metal *</Label>
                <select value={stockTipoMetal} onChange={e => { const v = e.target.value; setStockTipoMetal(v); if (v !== 'Bridão Flor' && v !== 'Bridão Estrela') setStockCorBrilho(''); }} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option value="">Selecione</option>
                  {GRAVATA_TIPO_METAL.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {(stockTipoMetal === 'Bridão Flor' || stockTipoMetal === 'Bridão Estrela') && (
                <div>
                  <Label>Cor do brilho *</Label>
                  <select value={stockCorBrilho} onChange={e => setStockCorBrilho(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                    <option value="">Selecione</option>
                    {COR_BRILHO_GRAVATA.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <Label>Quantidade *</Label>
                <Input type="number" min="1" value={stockQtd} onChange={e => setStockQtd(e.target.value)} placeholder="Ex: 5" />
              </div>
              <Button className="w-full" onClick={handleSaveStock}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExtrasPage;
