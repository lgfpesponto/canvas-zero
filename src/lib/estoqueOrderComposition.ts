/**
 * Reconstrói a composição da ficha (Modelo, Couro, Solado, etc.) para uma
 * bota vinda de pedido criado a partir da página Estoque.
 *
 * Fonte: `ficha_snapshot` gravado por bota dentro de `extra_detalhes.botas[]`
 * pelo RPC `comprar_estoque`. Precificação segue o cascateamento padrão
 * (findFichaPrice atual → hardcoded fallback), refletindo sempre a versão
 * atualizada da ficha — conforme regra do produto de estoque.
 */
import {
  COURO_PRECOS,
  SOLADO,
  COR_VIRA,
  MODELOS,
  getCorSolaPrecoContextual,
} from './orderFieldsConfig';

export type FindFichaPrice = (nome: string, categoria: string) => number | undefined;

export interface BotaComposicaoLinha {
  label: string;
  valor: number;
}

export interface BotaComposicao {
  linhas: BotaComposicaoLinha[];
  subtotalFicha: number;
}

const EXTRA_LABELS: Record<string, string> = {
  tiras_laterais: 'Tiras Laterais',
  carimbo_fogo: 'Carimbo a Fogo',
  kit_faca: 'Kit Faca',
  kit_canivete: 'Kit Canivete',
  adicionar_metais: 'Adicionar Metais',
};

export function buildBotaComposicao(
  bota: any,
  findFichaPrice: FindFichaPrice,
): BotaComposicao {
  const snap = (bota?.ficha_snapshot || {}) as Record<string, any>;
  const linhas: BotaComposicaoLinha[] = [];

  const push = (label: string, valor: number | undefined | null) => {
    if (!valor || valor <= 0) return;
    linhas.push({ label, valor });
  };

  const modelo = snap.modelo as string | undefined;
  if (modelo) {
    const p = findFichaPrice(modelo, 'modelo') ?? MODELOS.find(m => m.label === modelo)?.preco;
    push('Modelo: ' + modelo, p);
  }

  // Couros — usa tipo_couro_* (o preço é por tipo, não por cor)
  const cano = snap.tipo_couro_cano as string | undefined;
  if (cano) {
    const p = findFichaPrice(cano, 'couro_cano') ?? COURO_PRECOS[cano] ?? 0;
    push('Couro Cano: ' + cano + (snap.cor_couro_cano ? ` (${snap.cor_couro_cano})` : ''), p);
  }
  const gas = snap.tipo_couro_gaspea as string | undefined;
  if (gas) {
    const p = findFichaPrice(gas, 'couro_gaspea') ?? COURO_PRECOS[gas] ?? 0;
    push('Couro Gáspea: ' + gas + (snap.cor_couro_gaspea ? ` (${snap.cor_couro_gaspea})` : ''), p);
  }
  const tal = snap.tipo_couro_taloneira as string | undefined;
  if (tal) {
    const p = findFichaPrice(tal, 'couro_taloneira') ?? COURO_PRECOS[tal] ?? 0;
    push('Couro Taloneira: ' + tal + (snap.cor_couro_taloneira ? ` (${snap.cor_couro_taloneira})` : ''), p);
  }

  const solado = snap.solado as string | undefined;
  if (solado) {
    const p = findFichaPrice(solado, 'solado') ?? SOLADO.find(s => s.label === solado)?.preco;
    push('Solado: ' + solado, p);
  }

  const corSola = snap.cor_sola as string | undefined;
  if (corSola) {
    const p = getCorSolaPrecoContextual(modelo, solado, snap.formato_bico, corSola)
      || findFichaPrice(corSola, 'cor_sola');
    push('Cor Sola: ' + corSola, p);
  }

  const corVira = snap.cor_vira as string | undefined;
  if (corVira) {
    const p = findFichaPrice(corVira, 'cor_vira') ?? COR_VIRA.find(c => c.label === corVira)?.preco;
    push('Cor Vira: ' + corVira, p);
  }

  const bico = snap.formato_bico as string | undefined;
  if (bico) {
    const p = findFichaPrice(bico, 'formato_bico');
    push('Formato Bico: ' + bico, p);
  }

  const subtotalFicha = linhas.reduce((s, l) => s + l.valor, 0);
  return { linhas, subtotalFicha };
}

/** Formata o rótulo de um extra embutido (usado tanto na composição por item quanto em fallback). */
export function formatBotaExtraLabel(ex: any): string {
  const baseName = EXTRA_LABELS[ex?.tipo] || ex?.tipo || '';
  let detail = '';
  if (ex?.tipo === 'adicionar_metais' && Array.isArray(ex.dados?.metaisSelecionados)) {
    const parts: string[] = [];
    if (ex.dados.metaisSelecionados.includes('Bola grande')) parts.push(`Bola grande x${ex.dados.qtdBolaGrande || 1}`);
    if (ex.dados.metaisSelecionados.includes('Strass')) parts.push(`Strass x${ex.dados.qtdStrass || 1}`);
    detail = parts.length ? ` (${parts.join(', ')})` : '';
  } else if (ex?.tipo === 'carimbo_fogo') {
    detail = ` (${ex.dados?.qtdCarimbos || 1} carimbos)`;
  } else if (ex?.tipo === 'tiras_laterais' && ex.dados?.corTiras) {
    detail = ` (${ex.dados.corTiras})`;
  }
  return `${baseName}${detail}`;
}
