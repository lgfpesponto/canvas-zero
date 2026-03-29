import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TIPOS_COURO, CORES_COURO } from '@/lib/orderFieldsConfig';
import { EXTRA_PRODUCTS } from '@/lib/extrasConfig';
import { ShoppingCart, Package } from 'lucide-react';

const emptyForm = (): Record<string, any> => ({
  numeroPedidoBota: '',
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
});

const ExtrasPage = () => {
  const { isLoggedIn, user, addOrder, isAdmin, allProfiles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(emptyForm());

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const openModal = (productId: string) => {
    if (!isLoggedIn) {
      toast({ title: 'Faça login para comprar extras', variant: 'destructive' });
      navigate('/login');
      return;
    }
    setForm(emptyForm());
    setOpenProduct(productId);
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

      const price = calcPrice(productId);

      const PRODUCT_FIELDS: Record<string, string[]> = {
        tiras_laterais: ['corTiras'],
        desmanchar: ['qualSola', 'trocaGaspea'],
        kit_canivete: ['tipoCouro', 'corCouro', 'vaiCanivete'],
        kit_faca: ['tipoCouro', 'corCouro', 'vaiCanivete'],
        carimbo_fogo: ['qtdCarimbos', 'descCarimbos', 'ondeAplicado'],
        revitalizador: ['tipoRevitalizador', 'quantidade'],
        kit_revitalizador: ['tipoRevitalizador', 'quantidade'],
        gravata_country: ['corTira', 'tipoMetal', 'corBridao'],
        adicionar_metais: ['metaisSelecionados', 'qtdStrass'],
        chaveiro_carimbo: ['tipoCouro', 'corCouro', 'descCarimbos'],
        bainha_cartao: ['tipoCouro', 'corCouro'],
        regata: ['corRegata', 'descBordadoRegata'],
        bota_pronta_entrega: ['descricaoProduto', 'valorManual'],
      };
      const relevantKeys = PRODUCT_FIELDS[productId] || [];
      const detalhes: Record<string, any> = {};
      for (const key of relevantKeys) {
        if (form[key] !== undefined && form[key] !== '') detalhes[key] = form[key];
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

  const renderForm = (productId: string) => {
    const price = calcPrice(productId);

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Vendedor — ADM only */}
        {isAdmin && (
          <div>
            <Label>Vendedor</Label>
            <Select value={form.vendedorSelecionado || user?.nomeCompleto || ''} onValueChange={v => set('vendedorSelecionado', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione vendedor" /></SelectTrigger>
              <SelectContent>
                {allProfiles.map(p => <SelectItem key={p.id} value={p.nomeCompleto}>{p.nomeCompleto}</SelectItem>)}
                <SelectItem value="Estoque">Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Número do pedido — obrigatório em TODOS */}
        <div>
          <Label>Nº do pedido *</Label>
          <Input value={form.numeroPedidoBota} onChange={e => set('numeroPedidoBota', e.target.value)} placeholder="Ex: 7E-20240001" />
        </div>
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
              <Select value={form.tipoCouro} onValueChange={v => set('tipoCouro', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TIPOS_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cor do couro *</Label>
              <Select value={form.corCouro} onValueChange={v => set('corCouro', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CORES_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
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
              <Select value={form.corTira} onValueChange={v => set('corTira', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['Preto', 'Marrom', 'Off White', 'Laranja'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de metal *</Label>
              <Select value={form.tipoMetal} onValueChange={v => { set('tipoMetal', v); if (!v.startsWith('Bridão')) set('corBridao', ''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['Bota', 'Chapéu', 'Mula', 'Touro', 'Bridão Estrela', 'Bridão Flor', 'Cruz'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.tipoMetal?.startsWith('Bridão') && (
              <div>
                <Label>Cor do bridão *</Label>
                <Select value={form.corBridao} onValueChange={v => set('corBridao', v)}>
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
              <Select value={form.tipoCouro} onValueChange={v => set('tipoCouro', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TIPOS_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cor do couro *</Label>
              <Select value={form.corCouro} onValueChange={v => set('corCouro', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CORES_COURO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
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
              <Select value={form.corRegata} onValueChange={v => set('corRegata', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['Preto', 'Marrom', 'Bege', 'Azul', 'Rosa', 'Verde'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
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

        <Button className="w-full" onClick={() => handleSubmit(productId)}>
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
                <Button onClick={() => openModal(product.id)} className="w-full">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Comprar
                </Button>
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
    </div>
  );
};

export default ExtrasPage;
