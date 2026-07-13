/**
 * Schema por produto extra — descreve os campos editáveis pelo admin
 * (nome, variações, preço base) no popover de edição do card.
 *
 * `group` é a chave dentro do JSONB `extra_produtos.variacoes` onde ficam
 * salvas as opções desse campo (nome + preço unitário).
 */

export type ExtraFieldSpec =
  | {
      key: string;
      label: string;
      kind: 'select' | 'multi' | 'checkbox';
      source: 'variacoes';
      group: string;
    }
  | {
      key: string;
      label: string;
      kind: 'select';
      source: 'shared';
      sharedList: 'TIPOS_COURO' | 'CORES_COURO' | 'TAMANHOS';
    };

export interface ExtraSchema {
  fields: ExtraFieldSpec[];
  /** Mostra input "Preço base" no popover. Se false, o preço vem das variações. */
  basePriceEditable: boolean;
}

export const EXTRA_SCHEMA: Record<string, ExtraSchema> = {
  tiras_laterais: {
    basePriceEditable: true,
    fields: [
      { key: 'corTiras', label: 'Cor das tiras', kind: 'select', source: 'variacoes', group: 'cor_tiras' },
    ],
  },
  desmanchar: {
    basePriceEditable: true,
    fields: [
      { key: 'qualSola', label: 'Qual sola', kind: 'select', source: 'variacoes', group: 'qual_sola' },
      { key: 'trocaGaspea', label: 'Troca de gáspea/taloneira', kind: 'select', source: 'variacoes', group: 'troca_gaspea' },
    ],
  },
  kit_canivete: {
    basePriceEditable: true,
    fields: [
      { key: 'tipoCouro', label: 'Tipo de couro', kind: 'select', source: 'shared', sharedList: 'TIPOS_COURO' },
      { key: 'corCouro', label: 'Cor do couro', kind: 'select', source: 'shared', sharedList: 'CORES_COURO' },
      { key: 'vaiCanivete', label: 'Vai o canivete? (preço do Sim)', kind: 'select', source: 'variacoes', group: 'vai_canivete' },
    ],
  },
  kit_faca: {
    basePriceEditable: true,
    fields: [
      { key: 'tipoCouro', label: 'Tipo de couro', kind: 'select', source: 'shared', sharedList: 'TIPOS_COURO' },
      { key: 'corCouro', label: 'Cor do couro', kind: 'select', source: 'shared', sharedList: 'CORES_COURO' },
      { key: 'vaiFaca', label: 'Vai a faca? (preço do Sim)', kind: 'select', source: 'variacoes', group: 'vai_faca' },
    ],
  },
  carimbo_fogo: {
    basePriceEditable: false,
    fields: [
      { key: 'faixaCarimbos', label: 'Faixa de qtd. de carimbos', kind: 'select', source: 'variacoes', group: 'faixas' },
    ],
  },
  revitalizador: {
    basePriceEditable: true,
    fields: [
      { key: 'tipoRevitalizador', label: 'Tipo', kind: 'select', source: 'variacoes', group: 'tipo' },
    ],
  },
  kit_revitalizador: {
    basePriceEditable: true,
    fields: [
      { key: 'tipoRevitalizador', label: 'Tipo', kind: 'select', source: 'variacoes', group: 'tipo' },
    ],
  },
  gravata_country: {
    basePriceEditable: true,
    fields: [
      { key: 'corTira', label: 'Cor da tira', kind: 'select', source: 'variacoes', group: 'cor_tira' },
      { key: 'tipoMetal', label: 'Tipo de metal', kind: 'select', source: 'variacoes', group: 'tipo_metal' },
      { key: 'corBridao', label: 'Cor do bridão', kind: 'select', source: 'variacoes', group: 'cor_bridao' },
    ],
  },
  gravata_pronta_entrega: {
    basePriceEditable: true,
    fields: [
      { key: 'corTira', label: 'Cor da tira', kind: 'select', source: 'variacoes', group: 'cor_tira' },
      { key: 'tipoMetal', label: 'Tipo de metal', kind: 'select', source: 'variacoes', group: 'tipo_metal' },
      { key: 'corBrilho', label: 'Cor do brilho', kind: 'select', source: 'variacoes', group: 'cor_brilho' },
    ],
  },
  adicionar_metais: {
    basePriceEditable: false,
    fields: [
      { key: 'metaisSelecionados', label: 'Itens (preço unitário)', kind: 'multi', source: 'variacoes', group: 'itens' },
    ],
  },
  chaveiro_carimbo: {
    basePriceEditable: true,
    fields: [
      { key: 'tipoCouro', label: 'Tipo de couro', kind: 'select', source: 'shared', sharedList: 'TIPOS_COURO' },
      { key: 'corCouro', label: 'Cor do couro', kind: 'select', source: 'shared', sharedList: 'CORES_COURO' },
    ],
  },
  bainha_cartao: {
    basePriceEditable: true,
    fields: [
      { key: 'tipoCouro', label: 'Tipo de couro', kind: 'select', source: 'shared', sharedList: 'TIPOS_COURO' },
      { key: 'corCouro', label: 'Cor do couro', kind: 'select', source: 'shared', sharedList: 'CORES_COURO' },
    ],
  },
  bainha_celular: {
    basePriceEditable: true,
    fields: [
      { key: 'tipoCouro', label: 'Tipo de couro', kind: 'select', source: 'shared', sharedList: 'TIPOS_COURO' },
      { key: 'corCouro', label: 'Cor do couro', kind: 'select', source: 'shared', sharedList: 'CORES_COURO' },
    ],
  },
  regata: {
    basePriceEditable: true,
    fields: [
      { key: 'corRegata', label: 'Cor', kind: 'select', source: 'variacoes', group: 'cor' },
    ],
  },
  regata_pronta_entrega: {
    basePriceEditable: true,
    fields: [],
  },
  bota_pronta_entrega: {
    basePriceEditable: false,
    fields: [],
  },
  palmilha: {
    basePriceEditable: true,
    fields: [
      { key: 'tamanhoPalmilha', label: 'Tamanho', kind: 'select', source: 'shared', sharedList: 'TAMANHOS' },
      { key: 'formatoBicoPalmilha', label: 'Formato do bico', kind: 'select', source: 'variacoes', group: 'formato_bico' },
    ],
  },
};

/** Retorna a lista de nomes de uma variação de produto extra, com fallback. */
export function getExtraOptionsFromDB(
  variacoes: Record<string, { nome: string; preco: number }[]> | undefined,
  group: string,
  fallback: string[],
): string[] {
  const list = variacoes?.[group];
  if (list && list.length > 0) return list.map(v => v.nome);
  return fallback;
}

/** Retorna o preço unitário de uma opção específica dentro da variação. */
export function getExtraOptionPrice(
  variacoes: Record<string, { nome: string; preco: number }[]> | undefined,
  group: string,
  nome: string,
  fallback: number,
): number {
  const list = variacoes?.[group];
  if (!list) return fallback;
  const found = list.find(v => v.nome === nome);
  return found ? Number(found.preco) || 0 : fallback;
}
