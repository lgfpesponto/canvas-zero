/**
 * Reconstrói a composição da ficha (Modelo, Couro, Solado, Bordados, etc.)
 * para uma bota vinda de pedido criado a partir da página Estoque.
 *
 * Fonte: `ficha_snapshot` gravado por bota dentro de `extra_detalhes.botas[]`
 * pelo RPC `comprar_estoque` (que herda do produto de estoque). Precificação
 * segue o cascateamento padrão (findFichaPrice atual → hardcoded fallback),
 * refletindo sempre a versão atualizada da ficha — conforme regra do produto
 * de estoque.
 *
 * Espelha `recomputeSubtotal` (recomputeOrderPrice.ts): ordem e regras devem
 * bater para o subtotal da composição fechar com o preço do item.
 */
import {
  COURO_PRECOS,
  SOLADO,
  COR_VIRA,
  MODELOS,
  ACESSORIOS,
  AREA_METAL,
  CARIMBO,
  DESENVOLVIMENTO,
  SOB_MEDIDA_PRECO,
  NOME_BORDADO_PRECO,
  ESTAMPA_PRECO,
  PINTURA_PRECO,
  TRICE_PRECO,
  TIRAS_PRECO,
  COSTURA_ATRAS_PRECO,
  STRASS_PRECO,
  CRUZ_METAL_PRECO,
  BRIDAO_METAL_PRECO,
  CAVALO_METAL_PRECO,
  FRANJA_PRECO,
  CORRENTE_PRECO,
  LASER_CANO_PRECO,
  LASER_GASPEA_PRECO,
  GLITTER_CANO_PRECO,
  GLITTER_GASPEA_PRECO,
  BORDADOS_CANO,
  BORDADOS_GASPEA,
  BORDADOS_TALONEIRA,
  getCorSolaPrecoContextual,
} from './orderFieldsConfig';
import { getDynamicUnitPrice } from './dynamicUnitPrice';

export type FindFichaPrice = (nome: string, categoria: string) => number | undefined;
export type GetByCategoria = (categoria: string) => { label: string; preco: number }[];

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

const noFicha: FindFichaPrice = () => undefined;
const noCategoria: GetByCategoria = () => [];

export function buildBotaComposicao(
  bota: any,
  findFichaPrice: FindFichaPrice = noFicha,
  getByCategoria: GetByCategoria = noCategoria,
  /**
   * Valor unitário congelado do item (gravado no momento da compra).
   * Quando informado, a composição é normalizada para fechar exatamente com ele:
   * a diferença residual fica embutida na linha do Modelo — o total nunca infla.
   */
  valorCongelado?: number,
): BotaComposicao {
  const snap = (bota?.ficha_snapshot || {}) as Record<string, any>;

  const linhas: BotaComposicaoLinha[] = [];

  const push = (label: string, valor: number | undefined | null) => {
    if (!valor || valor <= 0) return;
    linhas.push({ label, valor });
  };
  const pushFixed = (label: string, valor: number) => {
    if (valor > 0) linhas.push({ label, valor });
  };

  const modelo = snap.modelo as string | undefined;
  const solado = snap.solado as string | undefined;
  const bico = snap.formato_bico as string | undefined;

  // Modelo
  if (modelo) {
    const p = findFichaPrice(modelo, 'modelo') ?? MODELOS.find(m => m.label === modelo)?.preco;
    push('Modelo: ' + modelo, p);
  }

  // Sob Medida
  if (snap.sob_medida) pushFixed('Sob Medida', SOB_MEDIDA_PRECO);

  // Acessórios (multi separado por ", ")
  if (typeof snap.acessorios === 'string' && snap.acessorios) {
    snap.acessorios.split(', ').filter(Boolean).forEach((a: string) => {
      const p = findFichaPrice(a, 'acessorios') ?? ACESSORIOS.find(x => x.label === a)?.preco;
      push('Acessório: ' + a, p);
    });
  }

  // Couros — preço por tipo, cor apenas descritiva
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

  // Desenvolvimento (legacy campo único + novo em extra_detalhes)
  const desenvolvimento = snap.desenvolvimento as string | undefined;
  if (desenvolvimento) {
    const p = findFichaPrice(desenvolvimento, 'desenvolvimento')
      ?? DESENVOLVIMENTO.find(d => d.label === desenvolvimento)?.preco;
    push('Desenvolvimento: ' + desenvolvimento, p);
  }
  const det: any = snap.extra_detalhes || {};
  if (det.desenvBordado) pushFixed('Desenvolvimento (Bordado)', 50);
  if (det.desenvLaser) pushFixed('Desenvolvimento (Laser)', 100);
  if (det.desenvEstampa) pushFixed('Desenvolvimento (Estampa)', 150);

  const findDetailPrice = (b: string, cat: string, fallback: { label: string; preco: number }[]) =>
    findFichaPrice(b, cat)
    ?? getByCategoria(cat).find(x => x.label === b)?.preco
    ?? fallback.find(x => x.label === b)?.preco
    ?? 0;

  // Bordados (cano/gáspea/taloneira) — multi
  ([
    ['bordado_cano', 'Bordado Cano', 'bordado_cano', BORDADOS_CANO, snap.cor_bordado_cano],
    ['bordado_gaspea', 'Bordado Gáspea', 'bordado_gaspea', BORDADOS_GASPEA, snap.cor_bordado_gaspea],
    ['bordado_taloneira', 'Bordado Taloneira', 'bordado_taloneira', BORDADOS_TALONEIRA, snap.cor_bordado_taloneira],
  ] as const).forEach(([field, prefix, cat, fallback, cor]) => {
    const raw = snap[field] as string | undefined;
    if (!raw) return;
    raw.split(', ').filter(Boolean).forEach(b => {
      push(`${prefix}: ${b}` + (cor ? ` (${cor})` : ''), findDetailPrice(b, cat, fallback as any));
    });
  });

  // Nome bordado / personalização
  if (snap.nome_bordado_desc || snap.personalizacao_nome) {
    pushFixed('Nome Bordado', NOME_BORDADO_PRECO);
  }

  // Laser + Glitter
  if (snap.laser_cano) pushFixed('Laser Cano: ' + snap.laser_cano, LASER_CANO_PRECO);
  if (snap.cor_glitter_cano) pushFixed('Glitter Cano: ' + snap.cor_glitter_cano, GLITTER_CANO_PRECO);
  if (snap.laser_gaspea) pushFixed('Laser Gáspea: ' + snap.laser_gaspea, LASER_GASPEA_PRECO);
  if (snap.cor_glitter_gaspea) pushFixed('Glitter Gáspea: ' + snap.cor_glitter_gaspea, GLITTER_GASPEA_PRECO);
  if (snap.laser_taloneira) pushFixed('Laser Taloneira: ' + snap.laser_taloneira, LASER_CANO_PRECO);
  if (snap.cor_glitter_taloneira) pushFixed('Glitter Taloneira: ' + snap.cor_glitter_taloneira, GLITTER_CANO_PRECO);

  // Pintura / Estampa
  if (snap.pintura === 'Sim') pushFixed('Pintura', getDynamicUnitPrice('pintura', PINTURA_PRECO));
  if (snap.estampa === 'Sim') pushFixed('Estampa', getDynamicUnitPrice('estampa', ESTAMPA_PRECO));

  // Metais — área + qtds
  const metais = snap.metais as string | undefined;
  if (metais) {
    const p = findFichaPrice(metais, 'area_metal') ?? AREA_METAL.find(a => a.label === metais)?.preco;
    push('Metais: ' + metais, p);
  }
  if (snap.strass_qtd) pushFixed(`Strass x${snap.strass_qtd}`, snap.strass_qtd * getDynamicUnitPrice('strass', STRASS_PRECO));
  if (snap.cruz_metal_qtd) pushFixed(`Cruz Metal x${snap.cruz_metal_qtd}`, snap.cruz_metal_qtd * getDynamicUnitPrice('cruz_metal', CRUZ_METAL_PRECO));
  if (snap.bridao_metal_qtd) pushFixed(`Bridão Metal x${snap.bridao_metal_qtd}`, snap.bridao_metal_qtd * getDynamicUnitPrice('bridao_metal', BRIDAO_METAL_PRECO));
  if (det.cavaloMetal && det.cavaloMetalQtd) {
    pushFixed(`Cavalo Metal x${det.cavaloMetalQtd}`, det.cavaloMetalQtd * getDynamicUnitPrice('cavalo_metal', CAVALO_METAL_PRECO));
  }

  // Trice / Tiras / Franja / Corrente
  if (snap.trisce === 'Sim') pushFixed('Tricê', getDynamicUnitPrice('trice', TRICE_PRECO));
  if (snap.tiras === 'Sim') pushFixed('Tiras', getDynamicUnitPrice('tiras', TIRAS_PRECO));
  if (det.franja) pushFixed('Franja', getDynamicUnitPrice('franja', FRANJA_PRECO));
  if (det.corrente) pushFixed('Corrente', getDynamicUnitPrice('corrente', CORRENTE_PRECO));

  // Solado
  if (solado) {
    const p = findFichaPrice(solado, 'solado') ?? SOLADO.find(s => s.label === solado)?.preco;
    push('Solado: ' + solado, p);
  }

  // Cor Sola: contextual tem prioridade (Marrom+Borracha=R$20, Marrom+PVC=R$0)
  const corSola = snap.cor_sola as string | undefined;
  if (corSola) {
    const p = getCorSolaPrecoContextual(modelo, solado, bico, corSola)
      || findFichaPrice(corSola, 'cor_sola');
    push('Cor Sola: ' + corSola, p);
  }

  // Cor Vira
  const corVira = snap.cor_vira as string | undefined;
  if (corVira) {
    const p = findFichaPrice(corVira, 'cor_vira') ?? COR_VIRA.find(c => c.label === corVira)?.preco;
    push('Cor Vira: ' + corVira, p);
  }

  // Costura Atrás
  if (snap.costura_atras === 'Sim') pushFixed('Costura Atrás', getDynamicUnitPrice('costura_atras', COSTURA_ATRAS_PRECO));

  // Carimbo
  const carimbo = snap.carimbo as string | undefined;
  if (carimbo) {
    const p = findFichaPrice(carimbo, 'carimbo') ?? CARIMBO.find(c => c.label === carimbo)?.preco;
    push('Carimbo: ' + carimbo, p);
  }

  // Formato Bico (só se cobrar preço próprio, mantido por retrocompatibilidade)
  if (bico) {
    const p = findFichaPrice(bico, 'formato_bico');
    push('Formato Bico: ' + bico, p);
  }

  // Adicional livre
  if (snap.adicional_valor && Number(snap.adicional_valor) > 0) {
    pushFixed(
      snap.adicional_desc ? `Adicional: ${snap.adicional_desc}` : 'Adicional',
      Number(snap.adicional_valor),
    );
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
