/**
 * Tabela de valores de mão de obra de montagem por modelo de bota.
 * Usado no PDF de Baixa Montagem.
 */

const norm = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const VALOR_23 = [
  'Capota Bico Fino',
  'Capota Bico Fino Perfilado',
  'Bota Bico Fino Feminino',
  'Bota Bico Fino Perfilado',
  'Tradicional Bico Fino',
  'Bota Over',
  'City',
];

const VALOR_21 = [
  'Bota Tradicional',
  'Bota Feminino',
  'Bota Peão',
  'Bota Montaria (40)',
  'Bota Montaria',
  'Capota',
  'Cano Inteiro',
  'Urbana',
  'Coturno',
];

const VALOR_19 = [
  'Botina',
  'Bota Infantil',
  'Botina Infantil',
  'Cano Médio Infantil',
  'Destroyer',
  'Cano Médio',
];

const TABELA: { valor: number; nomes: Set<string> }[] = [
  { valor: 23, nomes: new Set(VALOR_23.map(norm)) },
  { valor: 21, nomes: new Set(VALOR_21.map(norm)) },
  { valor: 19, nomes: new Set(VALOR_19.map(norm)) },
];

/** Retorna o valor de montagem para o modelo, ou 0 se não estiver tabelado. */
export function getValorMontagem(modelo?: string | null): number {
  const k = norm(modelo || '');
  if (!k) return 0;
  for (const linha of TABELA) {
    if (linha.nomes.has(k)) return linha.valor;
  }
  return 0;
}

export const VALORES_MONTAGEM = [19, 21, 23] as const;
