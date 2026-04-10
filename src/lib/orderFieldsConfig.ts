// ==================== MODELOS ====================
export const MODELOS: { label: string; preco: number }[] = [
  { label: 'Bota Tradicional', preco: 260 },
  { label: 'Bota Feminino', preco: 260 },
  { label: 'Bota Peão', preco: 260 },
  { label: 'Bota Montaria (40)', preco: 270 },
  { label: 'Coturno', preco: 240 },
  { label: 'Destroyer', preco: 200 },
  { label: 'Capota', preco: 230 },
  { label: 'Capota Bico Fino', preco: 230 },
  { label: 'Capota Bico Fino Perfilado', preco: 230 },
  { label: 'Cano Médio', preco: 205 },
  { label: 'Botina', preco: 200 },
  { label: 'Bota Infantil', preco: 170 },
  { label: 'Botina Infantil', preco: 160 },
  { label: 'Bota Over', preco: 270 },
  { label: 'Urbano', preco: 260 },
  { label: 'Bota Bico Fino Feminino', preco: 260 },
  { label: 'Bota Bico Fino Perfilado', preco: 260 },
  { label: 'Tradicional Bico Fino', preco: 260 },
  { label: 'Cano Médio Infantil', preco: 160 },
  { label: 'City', preco: 270 },
  { label: 'Cano Inteiro', preco: 260 },
];

// ==================== TAMANHOS ====================
export const TAMANHOS = Array.from({ length: 22 }, (_, i) => String(24 + i));

// ==================== GÊNERO ====================
export const GENEROS = ['Feminino', 'Masculino'];

// ==================== ACESSÓRIOS ====================
export const ACESSORIOS: { label: string; preco: number }[] = [
  { label: 'Kit Faca', preco: 70 },
  { label: 'Kit Canivete', preco: 60 },
  { label: 'Kit Cantil', preco: 40 },
  { label: 'Bolso', preco: 50 },
  { label: 'Zíper inteiro', preco: 40 },
];

// ==================== COUROS ====================
export const TIPOS_COURO = [
  'Crazy Horse','Látego','Fóssil','Napa Flay','Floter','Nobuck',
  'Estilizado em Avestruz','Estilizado em Arraia','Estilizado em Tilápia',
  'Egípcio','Estilizado em Jacaré','Estilizado em Cobra',
  'Estilizado em Dinossauro','Aramado','Escamado','Estilizado Duplo',
  'Estilizado em Tatu','Vaca Holandesa','Vaca Pintada',
];

export const COURO_PRECOS: Record<string, number> = {
  'Estilizado em Dinossauro': 50,
  'Estilizado em Avestruz': 10,
  'Estilizado em Tatu': 40,
  'Aramado': 40,
  'Escamado': 20,
  'Estilizado Duplo': 20,
  'Vaca Holandesa': 15,
  'Vaca Pintada': 15,
};

export const CORES_COURO = [
  'Nescau','Café','Marrom','Preto','Telha','Mostarda','Bege','Azul',
  'Vermelho','Rosa','Branco','Off White','Pinhão','Verde','Amarelo',
  'Brasileiro','Americano','Cappuccino','Areia','Mustang','Rosa Neon',
  'Laranja','Cru','Havana','Petróleo','Malhado','Chocolate','Castor',
];

// ==================== BORDADOS (legacy – kept for backward compatibility) ====================
export const BORDADOS: { label: string; preco: number }[] = [
  { label: 'Florência', preco: 25 },
  { label: 'Linhas', preco: 25 },
  { label: 'Peão Elite G', preco: 35 },
  { label: 'Velho Barreiro', preco: 70 },
  { label: 'Rozeta', preco: 35 },
  { label: 'Nelore', preco: 25 },
  { label: 'Cruz Bordada', preco: 25 },
  { label: 'Milionário', preco: 35 },
  { label: 'Monster', preco: 35 },
  { label: 'Cruz Básica', preco: 25 },
  { label: 'Mulas', preco: 25 },
  { label: 'Ramos', preco: 25 },
  { label: 'Peão Elite P', preco: 25 },
  { label: 'N. Senhora', preco: 25 },
  { label: 'Logo Marca', preco: 50 },
  { label: 'N. Senhora P', preco: 10 },
  { label: 'Rozeta P', preco: 10 },
  { label: 'Cruz P', preco: 10 },
  { label: 'Monster P', preco: 10 },
  { label: 'Bandeira P', preco: 15 },
  { label: 'Bordado Variado R$5', preco: 5 },
  { label: 'Bordado Variado R$10', preco: 10 },
  { label: 'Bordado Variado R$15', preco: 15 },
  { label: 'Bordado Variado R$20', preco: 20 },
  { label: 'Bordado Variado R$25', preco: 25 },
  { label: 'Bordado Variado R$30', preco: 30 },
  { label: 'Bordado Variado R$35', preco: 35 },
];

// ==================== BORDADOS POR REGIÃO ====================
export const BORDADOS_CANO: { label: string; preco: number }[] = [
  { label: 'Florência', preco: 25 },
  { label: 'Linhas', preco: 25 },
  { label: 'Peão Elite G', preco: 35 },
  { label: 'Velho Barreiro', preco: 70 },
  { label: 'Rozeta', preco: 35 },
  { label: 'Nelore', preco: 25 },
  { label: 'Cruz Bordada', preco: 25 },
  { label: 'Milionário', preco: 35 },
  { label: 'Monster', preco: 35 },
  { label: 'Cruz Básica', preco: 25 },
  { label: 'Mulas', preco: 25 },
  { label: 'Ramos', preco: 25 },
  { label: 'Peão Elite P', preco: 25 },
  { label: 'N. Senhora', preco: 25 },
  { label: 'Logo Marca', preco: 50 },
  { label: 'N. Senhora P', preco: 10 },
  { label: 'Rozeta P', preco: 10 },
  { label: 'Cruz P', preco: 10 },
  { label: 'Monster P', preco: 10 },
  { label: 'Bandeira P', preco: 15 },
  { label: 'Bordado Variado R$5', preco: 5 },
  { label: 'Bordado Variado R$10', preco: 10 },
  { label: 'Bordado Variado R$15', preco: 15 },
  { label: 'Bordado Variado R$20', preco: 20 },
  { label: 'Bordado Variado R$25', preco: 25 },
  { label: 'Bordado Variado R$30', preco: 30 },
  { label: 'Bordado Variado R$35', preco: 35 },
];

export const BORDADOS_GASPEA: { label: string; preco: number }[] = [
  { label: 'Florência', preco: 15 },
  { label: 'Peão Elite G', preco: 20 },
  { label: 'Nelore', preco: 15 },
  { label: 'Mulas', preco: 15 },
  { label: 'Cruz Bordada', preco: 15 },
  { label: 'Milionário', preco: 20 },
  { label: 'Monster', preco: 20 },
  { label: 'Cruz Básica', preco: 15 },
  { label: 'Rozeta', preco: 20 },
  { label: 'N. Senhora', preco: 20 },
  { label: 'Velho Barreiro', preco: 35 },
  { label: 'Peão Elite P', preco: 25 },
  { label: 'Logo Marca', preco: 50 },
  { label: 'N. Senhora P', preco: 10 },
  { label: 'Rozeta P', preco: 10 },
  { label: 'Cruz P', preco: 10 },
  { label: 'Monster P', preco: 10 },
  { label: 'Bandeira P', preco: 15 },
  { label: 'Bordado Variado R$5', preco: 5 },
  { label: 'Bordado Variado R$10', preco: 10 },
  { label: 'Bordado Variado R$15', preco: 15 },
  { label: 'Bordado Variado R$20', preco: 20 },
  { label: 'Bordado Variado R$25', preco: 25 },
  { label: 'Bordado Variado R$30', preco: 30 },
  { label: 'Bordado Variado R$35', preco: 35 },
];

export const BORDADOS_TALONEIRA: { label: string; preco: number }[] = [
  { label: 'Florência', preco: 10 },
  { label: 'Nelore', preco: 10 },
  { label: 'Mulas', preco: 10 },
  { label: 'Cruz Bordada', preco: 10 },
  { label: 'Peão Elite P', preco: 25 },
  { label: 'Logo Marca', preco: 50 },
  { label: 'N. Senhora P', preco: 10 },
  { label: 'Rozeta P', preco: 10 },
  { label: 'Cruz P', preco: 10 },
  { label: 'Monster P', preco: 10 },
  { label: 'Bandeira P', preco: 15 },
  { label: 'Bordado Variado R$5', preco: 5 },
  { label: 'Bordado Variado R$10', preco: 10 },
  { label: 'Bordado Variado R$15', preco: 15 },
  { label: 'Bordado Variado R$20', preco: 20 },
  { label: 'Bordado Variado R$25', preco: 25 },
  { label: 'Bordado Variado R$30', preco: 30 },
  { label: 'Bordado Variado R$35', preco: 35 },
];

// ==================== LASER ====================
export const LASER_OPTIONS = [
  'Cruz','Bridão','Pipoco','Ouro','Florência Brilhante','Folhas',
  'Lara','Rodeio','Iluminada','Cruz Asas','Beca','Coração',
  'Cruz Circular','Cruz Zero','Borboleta','Livia','Luiza',
  'Duquesa','Julia','Anjo','Pintura Cavalo','Outro',
];
export const LASER_CANO_PRECO = 50;
export const LASER_GASPEA_PRECO = 50;
export const LASER_TALONEIRA_PRECO = 0;
export const GLITTER_CANO_PRECO = 30;
export const GLITTER_GASPEA_PRECO = 30;
export const GLITTER_TALONEIRA_PRECO = 0;

// ==================== COR GLITTER/TECIDO ====================
export const COR_GLITTER = [
  'Dourado','Prata','Rosa Claro','Rosa Pink','Azul','Preto','Marrom','Vermelho',
];

// ==================== COR DA LINHA ====================
export const COR_LINHA = [
  'Bege','Branca','Preta','Café','Vermelha','Azul','Verde','Rosa','Amarelo','Laranja',
];

// ==================== COR BORRACHINHA ====================
export const COR_BORRACHINHA = ['Preto','Marrom','Branco','Rosa'];

// ==================== COR DO VIVO ====================
export const COR_VIVO = ['Preto','Branco','Rosa','Azul','Laranja'];

// ==================== DESENVOLVIMENTO ====================
export const DESENVOLVIMENTO: { label: string; preco: number }[] = [
  { label: 'Estampa', preco: 150 },
  { label: 'Laser', preco: 100 },
  { label: 'Bordado', preco: 50 },
];

// ==================== METAIS ====================
export const AREA_METAL: { label: string; preco: number }[] = [
  { label: 'Inteira', preco: 30 },
  { label: 'Metade da Bota', preco: 15 },
];
export const TIPO_METAL = ['Rebite', 'Bola Grande'];
export const COR_METAL = ['Níquel', 'Ouro Velho', 'Dourado'];
export const STRASS_PRECO = 0.60;
export const CRUZ_METAL_PRECO = 6;
export const BRIDAO_METAL_PRECO = 3;
export const CAVALO_METAL_PRECO = 5;
export const FRANJA_PRECO = 15;
export const CORRENTE_PRECO = 10;

// ==================== SOLADO ====================
export const SOLADO: { label: string; preco: number }[] = [
  { label: 'Borracha', preco: 0 },
  { label: 'Couro Reta', preco: 60 },
  { label: 'Couro Carrapeta', preco: 60 },
  { label: 'Couro Carrapeta com Espaço Espora', preco: 60 },
  { label: 'Jump', preco: 30 },
  { label: 'Rústica', preco: 0 },
  { label: 'Infantil', preco: 0 },
  { label: 'PVC', preco: 0 },
  { label: 'Borracha City', preco: 0 },
];

// ==================== FORMATO DO BICO ====================
export const FORMATO_BICO = ['Quadrado', 'Redondo', 'Fino Ponta Redonda', 'Fino Ponta Quadrada', 'Fino Agulha Ponta Quadrada', 'Fino Agulha Ponta Redonda'];

// ==================== COR DA SOLA ====================
export const COR_SOLA: { label: string; preco: number }[] = [
  { label: 'Marrom', preco: 20 },
  { label: 'Preto', preco: 0 },
  { label: 'Branco', preco: 20 },
  { label: 'Madeira', preco: 0 },
  { label: 'Avermelhada', preco: 10 },
  { label: 'Pintada de Preto', preco: 0 },
  { label: 'Off White', preco: 0 },
];

// ==================== COR DA VIRA ====================
export const COR_VIRA: { label: string; preco: number }[] = [
  { label: 'Bege', preco: 0 },
  { label: 'Preto', preco: 10 },
  { label: 'Rosa', preco: 10 },
  { label: 'Neutra', preco: 0 },
];

// ==================== CARIMBO A FOGO ====================
export const CARIMBO: { label: string; preco: number }[] = [
  { label: 'Até 3 Carimbos', preco: 20 },
  { label: 'Até 6 Carimbos', preco: 40 },
];

// ==================== FIXED VALUES ====================
export const SOB_MEDIDA_PRECO = 50;
export const NOME_BORDADO_PRECO = 40;
export const ESTAMPA_PRECO = 30;
export const PINTURA_PRECO = 15;
export const TRICE_PRECO = 20;
export const TIRAS_PRECO = 15;
export const COSTURA_ATRAS_PRECO = 20;

// ==================== VIRA HIDDEN (não mostrar na descrição/impressão) ====================
export const VIRA_HIDDEN = ['Bege', 'Neutra'];

// ==================== PESPONTO CONDICIONAL ====================
// Modelos que não exibem borrachinha/vivo (só cor da linha)
export const HIDE_PESPONTO_EXTRAS = ['Botina', 'Botina Infantil', 'Destroyer', 'Coturno'];

// ==================== VINCULAÇÃO TAMANHO → MODELO ====================
export function getModelosForTamanho(tamanho: string): { label: string; preco: number }[] {
  if (!tamanho) return MODELOS;
  const t = Number(tamanho);
  if (isNaN(t)) return MODELOS;

  const allowed: string[] = [];

  // 24-33: infantis
  if (t >= 24 && t <= 33) {
    allowed.push('Bota Infantil', 'Botina Infantil', 'Cano Médio Infantil');
  }
  // 34-45: adultos
  if (t >= 34 && t <= 45) {
    allowed.push(
      'Bota Tradicional', 'Bota Feminino', 'Bota Peão',
      'Coturno', 'Destroyer', 'Capota',
      'Bota Over', 'Capota Bico Fino Perfilado',
      'Cano Médio', 'Botina', 'Urbano',
      'Bota Bico Fino Perfilado', 'Tradicional Bico Fino',
    );
    // Montaria só até 40
    if (t <= 40) allowed.push('Bota Montaria (40)');
    allowed.push('Cano Inteiro');
  }
  // 33-40: bico fino feminino + capota bico fino
  if (t >= 33 && t <= 40) {
    allowed.push('Bota Bico Fino Feminino', 'Capota Bico Fino');
  }
  // 34-40: City
  if (t >= 34 && t <= 40) {
    allowed.push('City');
  }

  if (allowed.length === 0) return MODELOS;
  return MODELOS.filter(m => allowed.includes(m.label));
}

// ==================== BLOCOS DE VINCULAÇÃO ====================
export type ModelBlock = 'infantil' | 'city' | 'tradicional' | 'bicoFinoFeminino' | 'perfilado';

const INFANTIL_MODELOS = ['Bota Infantil', 'Botina Infantil', 'Cano Médio Infantil'];
const TRADICIONAL_MODELOS = ['Bota Tradicional', 'Bota Feminino', 'Bota Peão', 'Bota Montaria (40)', 'Coturno', 'Destroyer', 'Capota', 'Cano Médio', 'Botina', 'Urbano', 'Cano Inteiro'];
const BF_FEMININO_MODELOS = ['Bota Bico Fino Feminino', 'Capota Bico Fino'];
const PERFILADO_MODELOS = ['Bota Bico Fino Perfilado', 'Bota Over', 'Capota Bico Fino Perfilado', 'Tradicional Bico Fino'];

export function getBlockForModelo(modelo: string): ModelBlock | null {
  if (INFANTIL_MODELOS.includes(modelo)) return 'infantil';
  if (modelo === 'City') return 'city';
  if (TRADICIONAL_MODELOS.includes(modelo)) return 'tradicional';
  if (BF_FEMININO_MODELOS.includes(modelo)) return 'bicoFinoFeminino';
  if (PERFILADO_MODELOS.includes(modelo)) return 'perfilado';
  return null;
}

export function getSoladosForModelo(modelo: string, formatoBico?: string): { label: string; preco: number }[] {
  const block = getBlockForModelo(modelo);
  if (!block) return SOLADO;
  switch (block) {
    case 'infantil': return SOLADO.filter(s => s.label === 'Infantil');
    case 'city': return SOLADO.filter(s => s.label === 'Borracha City');
    case 'tradicional': {
      let result = SOLADO.filter(s => ['Borracha', 'Couro Reta', 'Couro Carrapeta', 'Couro Carrapeta com Espaço Espora', 'Jump', 'Rústica'].includes(s.label));
      if (formatoBico === 'Redondo') result = result.filter(s => !['Jump', 'Rústica'].includes(s.label));
      return result;
    }
    case 'bicoFinoFeminino': return SOLADO.filter(s => ['PVC', 'Couro Reta'].includes(s.label));
    case 'perfilado': return SOLADO.filter(s => ['PVC', 'Couro Reta'].includes(s.label));
    default: return SOLADO;
  }
}

export function getBicosForModeloSolado(modelo: string, solado?: string): string[] {
  const block = getBlockForModelo(modelo);
  if (!block) return [...FORMATO_BICO];
  switch (block) {
    case 'infantil': return ['Quadrado'];
    case 'city': return ['Fino Ponta Redonda'];
    case 'tradicional': return ['Quadrado', 'Redondo'];
    case 'bicoFinoFeminino': return ['Fino Ponta Redonda'];
    case 'perfilado':
      if (solado === 'PVC') return ['Fino Agulha Ponta Quadrada'];
      return ['Fino Agulha Ponta Quadrada', 'Fino Agulha Ponta Redonda'];
    default: return [...FORMATO_BICO];
  }
}

export function getCorSolaOptions(modelo: string, solado: string, formatoBico?: string): { label: string; preco: number }[] | null {
  const block = getBlockForModelo(modelo);
  if (!block) return COR_SOLA;
  switch (block) {
    case 'infantil': return null;
    case 'city': return [{ label: 'Preto', preco: 0 }];
    case 'tradicional':
      if (solado === 'Borracha') {
        let opts = COR_SOLA.filter(c => ['Marrom', 'Preto', 'Branco'].includes(c.label));
        if (formatoBico === 'Redondo') opts = opts.filter(c => ['Preto', 'Branco'].includes(c.label));
        return opts;
      }
      if (['Couro Reta', 'Couro Carrapeta', 'Couro Carrapeta com Espaço Espora'].includes(solado))
        return COR_SOLA.filter(c => ['Madeira', 'Avermelhada', 'Pintada de Preto'].includes(c.label));
      if (solado === 'Jump') return null;
      if (solado === 'Rústica') return COR_SOLA.filter(c => c.label === 'Madeira');
      return COR_SOLA;
    case 'bicoFinoFeminino':
      if (solado === 'PVC') return [{ label: 'Preto', preco: 0 }, { label: 'Off White', preco: 0 }, { label: 'Marrom', preco: 0 }];
      if (solado === 'Couro Reta') return COR_SOLA.filter(c => ['Madeira', 'Avermelhada', 'Pintada de Preto'].includes(c.label));
      return COR_SOLA;
    case 'perfilado':
      if (solado === 'PVC') return [{ label: 'Marrom', preco: 0 }];
      if (solado === 'Couro Reta') return COR_SOLA.filter(c => ['Madeira', 'Avermelhada', 'Pintada de Preto'].includes(c.label));
      return COR_SOLA;
    default: return COR_SOLA;
  }
}

export function getCorViraOptions(modelo: string, solado?: string): { label: string; preco: number }[] {
  const block = getBlockForModelo(modelo);
  if (!block) return COR_VIRA;
  switch (block) {
    case 'infantil': return COR_VIRA.filter(c => c.label === 'Bege');
    case 'city': return COR_VIRA.filter(c => c.label === 'Neutra');
    case 'tradicional':
      if (solado === 'Borracha') return COR_VIRA.filter(c => ['Bege', 'Rosa', 'Preto'].includes(c.label));
      return COR_VIRA.filter(c => c.label === 'Neutra');
    case 'bicoFinoFeminino': return COR_VIRA.filter(c => c.label === 'Neutra');
    case 'perfilado': return COR_VIRA.filter(c => c.label === 'Neutra');
    default: return COR_VIRA;
  }
}

export function getForma(modelo: string, formatoBico?: string): string {
  const block = getBlockForModelo(modelo);
  if (!block) return '';
  switch (block) {
    case 'infantil': return '1652';
    case 'city': return '13446';
    case 'tradicional': return formatoBico === 'Redondo' ? '7576' : '2300';
    case 'bicoFinoFeminino': return '6761';
    case 'perfilado': return '4394';
    default: return '';
  }
}
