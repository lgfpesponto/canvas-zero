/** Centralized extras product definitions and helpers */

export interface ExtraProduct {
  id: string;
  nome: string;
  descricao: string;
  precoBase: number | null;
  precoLabel: string;
}

export const EXTRA_PRODUCTS: ExtraProduct[] = [
  { id: 'tiras_laterais', nome: 'Tiras Laterais', descricao: 'Tiras laterais para botas', precoBase: 15, precoLabel: 'R$ 15,00' },
  { id: 'desmanchar', nome: 'Desmanchar', descricao: 'Serviço de desmanchar bota', precoBase: null, precoLabel: 'A partir de R$ 65,00' },
  { id: 'kit_canivete', nome: 'Kit Canivete', descricao: 'Kit canivete em couro', precoBase: 30, precoLabel: 'A partir de R$ 30,00' },
  { id: 'kit_faca', nome: 'Kit Faca', descricao: 'Kit faca em couro', precoBase: 35, precoLabel: 'A partir de R$ 35,00' },
  { id: 'carimbo_fogo', nome: 'Carimbo a Fogo', descricao: 'Carimbo a fogo personalizado', precoBase: 20, precoLabel: 'A partir de R$ 20,00' },
  { id: 'revitalizador', nome: 'Revitalizador (Unidade)', descricao: 'Revitalizador para couro', precoBase: 10, precoLabel: 'R$ 10,00/un' },
  { id: 'kit_revitalizador', nome: 'Kit 2 Revitalizador', descricao: 'Kit com 2 revitalizadores', precoBase: 26, precoLabel: 'R$ 26,00/kit' },
  { id: 'gravata_country', nome: 'Gravata Country', descricao: 'Gravata country com metal', precoBase: 30, precoLabel: 'R$ 30,00' },
  { id: 'adicionar_metais', nome: 'Adicionar Metais', descricao: 'Metais adicionais para botas', precoBase: null, precoLabel: 'Variável' },
  { id: 'chaveiro_carimbo', nome: 'Chaveiro c/ Carimbo a Fogo', descricao: 'Chaveiro em couro com carimbo', precoBase: 50, precoLabel: 'R$ 50,00' },
  { id: 'bainha_cartao', nome: 'Bainha de Cartão', descricao: 'Bainha de cartão em couro', precoBase: 15, precoLabel: 'R$ 15,00' },
  { id: 'regata', nome: 'Regata', descricao: 'Regata bordada personalizada', precoBase: 50, precoLabel: 'R$ 50,00' },
  { id: 'bota_pronta_entrega', nome: 'Bota Pronta Entrega', descricao: 'Bota pronta para entrega imediata', precoBase: null, precoLabel: 'Valor manual' },
  { id: 'gravata_pronta_entrega', nome: 'Gravata Pronta Entrega', descricao: 'Gravata pronta com controle de estoque', precoBase: 30, precoLabel: 'R$ 30,00' },
];

/** Map tipoExtra id → product name */
export const EXTRA_PRODUCT_NAME_MAP: Record<string, string> = {
  ...Object.fromEntries(EXTRA_PRODUCTS.map(p => [p.id, p.nome])),
  cinto: 'Cinto',
};

/** Readable labels for extraDetalhes keys */
export const EXTRA_DETAIL_LABELS: Record<string, string> = {
  corTiras: 'Cor das Tiras',
  qualSola: 'Sola',
  trocaGaspea: 'Troca de Gáspea/Taloneira',
  tipoCouro: 'Tipo de Couro',
  corCouro: 'Cor do Couro',
  vaiCanivete: 'Vai o Canivete',
  qtdCarimbos: 'Qtd. de Carimbos',
  descCarimbos: 'Descrição dos Carimbos',
  ondeAplicado: 'Onde Aplicado',
  tipoRevitalizador: 'Tipo de Revitalizador',
  quantidade: 'Quantidade',
  corTira: 'Cor da Tira',
  tipoMetal: 'Tipo de Metal',
  corBridao: 'Cor do Bridão',
  metaisSelecionados: 'Metais Selecionados',
  qtdStrass: 'Qtd. de Strass',
  qtdBolaGrande: 'Qtd. de Bola Grande',
  corRegata: 'Cor',
  corBrilho: 'Cor do Brilho',
  descBordadoRegata: 'Descrição do Bordado',
  descricaoProduto: 'Descrição do Produto',
  valorManual: 'Valor',
  // Belt (cinto) fields
  tamanhoCinto: 'Tamanho',
  bordadoP: 'Bordado P',
  bordadoPDesc: 'Descrição Bordado P',
  bordadoPCor: 'Cor Bordado P',
  nomeBordado: 'Nome Bordado',
  nomeBordadoDesc: 'Descrição Nome Bordado',
  nomeBordadoCor: 'Cor Nome Bordado',
  nomeBordadoFonte: 'Fonte Nome Bordado',
  carimbo: 'Carimbo a Fogo',
  carimboDesc: 'Descrição Carimbos',
  fivela: 'Fivela',
  fivelaOutroDesc: 'Descrição da Fivela',
  carimboOnde: 'Onde Aplicado (Carimbo)',
  numeroPedidoBotaVinculo: 'Nº Pedido da Bota',
};

/** Keys to exclude from display in order details */
export const EXTRA_INTERNAL_KEYS = new Set([
  'numeroPedidoBota', 'numeroPedido', 'valor', 'valorTotal',
]);

/** Check if a value is "empty" for display purposes */
export function isExtraValueEmpty(val: any): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (val === 'Não') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

export const FIVELA_OPTIONS = [
  'Prata com Strass', 'Preta com Strass', 'Prata Touro', 'Prata Flor',
  'Infantil', 'Quadrada', 'Outro',
];

export const GRAVATA_COR_TIRA = ['Preto', 'Marrom', 'Off White', 'Laranja'];
export const GRAVATA_TIPO_METAL = ['Bota', 'Chapéu', 'Mula', 'Touro', 'Bridão Estrela', 'Bridão Flor', 'Cruz', 'Nossa Senhora'];

export const COR_BRILHO_GRAVATA = ['Preto', 'Azul', 'Rosa', 'Cristal'];

// ==================== BELT (CINTO) CONFIG ====================
export const BELT_SIZES: { label: string; preco: number }[] = [
  { label: '1,10 cm', preco: 100 },
  { label: '1,25 cm', preco: 130 },
  { label: '50 cm', preco: 70 },
  { label: '70 cm', preco: 70 },
];

export const BORDADO_P_PRECO = 10;
export const NOME_BORDADO_CINTO_PRECO = 40;

export const BELT_CARIMBO: { label: string; preco: number }[] = [
  { label: '1 a 3 carimbos', preco: 20 },
  { label: '4 a 6 carimbos', preco: 40 },
];
