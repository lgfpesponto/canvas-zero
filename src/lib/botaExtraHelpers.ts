/** Helpers for embedded extras inside Bota Pronta Entrega items */

export interface BotaPEExtra {
  tipo: string;
  dados: Record<string, any>;
  preco: number;
}

export interface BotaPEItem {
  descricao: string;
  valor: string;
  quantidade: string;
  extras: BotaPEExtra[];
}

export const BOTA_PE_EXTRA_TYPES = [
  { id: 'adicionar_metais', label: 'Adicionar Metais' },
  { id: 'carimbo_fogo', label: 'Carimbo a Fogo' },
  { id: 'kit_faca', label: 'Kit Faca' },
  { id: 'kit_canivete', label: 'Kit Canivete' },
  { id: 'tiras_laterais', label: 'Tiras Laterais' },
] as const;

export const BOTA_PE_EXTRA_LABEL: Record<string, string> = Object.fromEntries(
  BOTA_PE_EXTRA_TYPES.map(t => [t.id, t.label])
);

/** Calculate the price for an embedded extra based on its type and data */
export function calcEmbeddedExtraPrice(tipo: string, dados: Record<string, any>): number {
  switch (tipo) {
    case 'tiras_laterais': return 15;
    case 'kit_canivete': return 30 + (dados.vaiCanivete === 'Sim' ? 30 : 0);
    case 'kit_faca': return 35 + (dados.vaiCanivete === 'Sim' ? 35 : 0);
    case 'carimbo_fogo': {
      const qty = parseInt(dados.qtdCarimbos) || 1;
      return qty >= 4 ? 40 : 20;
    }
    case 'adicionar_metais': {
      let total = 0;
      const sel = (dados.metaisSelecionados || []) as string[];
      if (sel.includes('Bola grande')) total += 15;
      if (sel.includes('Strass')) total += 0.60 * (parseInt(dados.qtdStrass) || 1);
      return total;
    }
    default: return 0;
  }
}

/** Get total value of a boot item (manual value + extras) */
export function calcBootTotal(bota: BotaPEItem): number {
  const base = parseFloat(bota.valor) || 0;
  const extrasTotal = (bota.extras || []).reduce((s, e) => s + (e.preco || 0), 0);
  return base + extrasTotal;
}

/** Create empty bota item */
export function emptyBotaPE(): BotaPEItem {
  return { descricao: '', valor: '', quantidade: '1', extras: [] };
}

/** Serialize bota for saving to extraDetalhes */
export function serializeBota(b: BotaPEItem) {
  return {
    descricaoProduto: b.descricao,
    valorManual: b.valor,
    quantidade: b.quantidade,
    extras: (b.extras || []).map(e => ({ tipo: e.tipo, dados: e.dados, preco: e.preco })),
  };
}

/** Deserialize bota from extraDetalhes */
export function deserializeBota(b: any): BotaPEItem {
  return {
    descricao: b.descricaoProduto || '',
    valor: b.valorManual || '',
    quantidade: b.quantidade || '1',
    extras: Array.isArray(b.extras) ? b.extras.map((e: any) => ({
      tipo: e.tipo || '',
      dados: e.dados || {},
      preco: e.preco || 0,
    })) : [],
  };
}
