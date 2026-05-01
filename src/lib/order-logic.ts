/** Centralized order logic: statuses, filters, helpers, data mapping */
import { EXTRA_PRODUCTS } from '@/lib/extrasConfig';
import type { AppRole } from '@/contexts/AuthContext';
import type { Order, OrderAlteracao } from '@/contexts/AuthContext';

/* ───── Order value helpers (preço final c/ desconto) ─────
 * Centraliza o cálculo do valor exibido em listagens, detalhe e PDFs.
 * Regras (espelham OrderCard / OrderDetailPage):
 *  - Bota normal (sem tipoExtra): preco × quantidade
 *  - Bota Pronta Entrega: preco já é o total
 *  - Revitalizador / kit_revitalizador: preco × quantidade
 *  - Demais extras: preco unitário (quantidade geralmente 1)
 *  - Desconto sempre subtrai do total final (não pode ficar negativo)
 */
export function getOrderBaseValue(order: Pick<Order, 'preco' | 'quantidade' | 'tipoExtra'>): number {
  const preco = Number(order.preco) || 0;
  const qtd = Number(order.quantidade) || 1;
  const isBotaPE = order.tipoExtra === 'bota_pronta_entrega';
  const isRevit = order.tipoExtra === 'revitalizador' || order.tipoExtra === 'kit_revitalizador';
  if (!order.tipoExtra) return preco * qtd;
  if (isBotaPE) return preco;
  if (isRevit) return preco * qtd;
  return preco;
}

export function getOrderFinalValue(order: Pick<Order, 'preco' | 'quantidade' | 'tipoExtra' | 'desconto'>): number {
  const base = getOrderBaseValue(order);
  const desc = order.desconto && order.desconto > 0 ? Number(order.desconto) : 0;
  return Math.max(0, base - desc);
}

/* ───── Production statuses ───── */

export const PRODUCTION_STATUSES = [
  "Em aberto", "Impresso", "Aguardando", "Aguardando Couro", "Emprestado", "Corte", "Baixa Corte", "Sem bordado",
  "Bordado Dinei", "Bordado Sandro", "Bordado 7Estrivos",
  "Pesponto 01", "Pesponto 02", "Pesponto 03", "Pesponto 04", "Pesponto 05", "Pesponto Ailton",
  "Pespontando", "Montagem", "Revisão", "Expedição",
  "Baixa Estoque", "Baixa Site (Despachado)",
  "Entregue", "Cobrado", "Pago", "Cancelado"
];

export const PRODUCTION_STATUSES_USER = [
  "Em aberto", "Impresso", "Aguardando", "Aguardando Couro", "Emprestado", "Corte", "Baixa Corte", "Sem bordado",
  "Bordado Dinei", "Bordado Sandro", "Bordado 7Estrivos",
  "Pesponto 01", "Pesponto 02", "Pesponto 03", "Pesponto 04", "Pesponto 05", "Pesponto Ailton",
  "Pespontando", "Montagem", "Revisão", "Expedição",
  "Entregue", "Cobrado", "Pago", "Cancelado"
];

export const EXTRAS_STATUSES = [
  "Em aberto", "Produzindo", "Expedição", "Entregue", "Cobrado", "Pago", "Cancelado"
];

export const BELT_STATUSES = [
  "Em aberto", "Aguardando", "Corte", "Bordado", "Pesponto",
  "Expedição", "Entregue", "Cobrado", "Pago", "Cancelado"
];

/** Statuses that mean "in production" (for dashboard counters) */
export const PRODUCTION_STATUSES_IN_PROD = [
  'Impresso',
  'Aguardando', 'Aguardando Couro', 'Corte', 'Baixa Corte', 'Sem bordado',
  'Bordado Dinei', 'Bordado Sandro', 'Bordado 7Estrivos',
  'Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05', 'Pesponto Ailton',
  'Pespontando', 'Montagem', 'Revisão', 'Expedição',
];

/** Roles allowed to change order statuses */
export const ADMIN_STATUS_ROLES: AppRole[] = ['admin_master', 'admin_producao'];

/* ───── Product options for production filter ───── */

export const PROD_PRODUCT_OPTIONS = [
  { value: 'bota', label: 'Bota' },
  ...EXTRA_PRODUCTS.map(p => ({ value: p.id, label: p.nome })),
  { value: 'cinto', label: 'Cinto' },
];

/* ───── Helpers ───── */

export const EXCLUDED_PREFIXES = ['TROCA', 'REFAZENDO', 'ERRO', 'INFLUENCER'];

export function isExcludedOrder(numero: string): boolean {
  return EXCLUDED_PREFIXES.some(p => numero.toUpperCase().startsWith(p));
}

export function getProductType(o: { tipoExtra?: string | null }): string {
  if (!o.tipoExtra) return 'bota';
  return o.tipoExtra;
}

export function matchVendedorFilter(
  o: { vendedor: string; cliente?: string },
  filter: string
): boolean {
  if (filter === 'todos') return true;
  if (o.vendedor === filter) return true;
  if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() === filter) return true;
  return false;
}

export function matchVendedorFilterSet(
  o: { vendedor: string; cliente?: string },
  filterSet: Set<string>
): boolean {
  if (filterSet.size === 0) return true;
  if (filterSet.has(o.vendedor)) return true;
  if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() && filterSet.has(o.cliente.trim())) return true;
  return false;
}

export function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Build the vendedores list from orders (including sub-clients of Juliana) */
export function buildVendedoresList(orders: { vendedor: string; cliente?: string }[]): string[] {
  const names = new Set(orders.map(o => o.vendedor));
  orders.forEach(o => {
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
      names.add(o.cliente.trim());
    }
  });
  return [...names].sort();
}

/* ───── DB row → Order mapping ───── */
export function dbRowToOrder(row: any): Order {
  return {
    id: row.id,
    numero: row.numero,
    vendedor: row.vendedor,
    tamanho: row.tamanho,
    genero: row.genero || undefined,
    modelo: row.modelo,
    solado: row.solado,
    formatoBico: row.formato_bico,
    corVira: row.cor_vira,
    couroGaspea: row.couro_gaspea,
    couroCano: row.couro_cano,
    couroTaloneira: row.couro_taloneira,
    corCouroGaspea: row.cor_couro_gaspea || undefined,
    corCouroCano: row.cor_couro_cano || undefined,
    corCouroTaloneira: row.cor_couro_taloneira || undefined,
    bordadoCano: row.bordado_cano,
    bordadoGaspea: row.bordado_gaspea,
    bordadoTaloneira: row.bordado_taloneira,
    corBordadoCano: row.cor_bordado_cano || undefined,
    corBordadoGaspea: row.cor_bordado_gaspea || undefined,
    corBordadoTaloneira: row.cor_bordado_taloneira || undefined,
    bordadoVariadoDescCano: row.bordado_variado_desc_cano || undefined,
    bordadoVariadoDescGaspea: row.bordado_variado_desc_gaspea || undefined,
    bordadoVariadoDescTaloneira: row.bordado_variado_desc_taloneira || undefined,
    personalizacaoNome: row.personalizacao_nome,
    personalizacaoBordado: row.personalizacao_bordado,
    nomeBordadoDesc: row.nome_bordado_desc || undefined,
    corLinha: row.cor_linha,
    corBorrachinha: row.cor_borrachinha,
    trisce: row.trisce,
    triceDesc: row.trice_desc || undefined,
    tiras: row.tiras,
    tirasDesc: row.tiras_desc || undefined,
    metais: row.metais,
    tipoMetal: row.tipo_metal || undefined,
    corMetal: row.cor_metal || undefined,
    strassQtd: row.strass_qtd ?? undefined,
    cruzMetalQtd: row.cruz_metal_qtd ?? undefined,
    bridaoMetalQtd: row.bridao_metal_qtd ?? undefined,
    acessorios: row.acessorios,
    desenvolvimento: row.desenvolvimento,
    sobMedida: row.sob_medida,
    sobMedidaDesc: row.sob_medida_desc || undefined,
    observacao: row.observacao,
    quantidade: row.quantidade,
    preco: Number(row.preco),
    status: row.status,
    dataCriacao: row.data_criacao,
    horaCriacao: row.hora_criacao,
    diasRestantes: row.dias_restantes,
    temLaser: row.tem_laser,
    fotos: (row.fotos as string[]) || [],
    historico: (row.historico as any[]) || [],
    alteracoes: (row.alteracoes as any[]) || [],
    impressoes: (row.impressoes as any[]) || [],
    laserCano: row.laser_cano || undefined,
    corGlitterCano: row.cor_glitter_cano || undefined,
    laserGaspea: row.laser_gaspea || undefined,
    corGlitterGaspea: row.cor_glitter_gaspea || undefined,
    laserTaloneira: row.laser_taloneira || undefined,
    corGlitterTaloneira: row.cor_glitter_taloneira || undefined,
    estampa: row.estampa || undefined,
    estampaDesc: row.estampa_desc || undefined,
    pintura: row.pintura || undefined,
    pinturaDesc: row.pintura_desc || undefined,
    costuraAtras: row.costura_atras || undefined,
    corSola: row.cor_sola || undefined,
    carimbo: row.carimbo || undefined,
    carimboDesc: row.carimbo_desc || undefined,
    corVivo: row.cor_vivo || undefined,
    adicionalDesc: row.adicional_desc || undefined,
    adicionalValor: row.adicional_valor != null ? Number(row.adicional_valor) : undefined,
    desconto: row.desconto != null ? Number(row.desconto) : undefined,
    descontoJustificativa: row.desconto_justificativa || undefined,
    forma: row.forma || undefined,
    tipoExtra: row.tipo_extra || undefined,
    extraDetalhes: row.extra_detalhes || undefined,
    numeroPedidoBota: row.numero_pedido_bota || undefined,
    cliente: row.cliente || '',
    recorteCano: row.recorte_cano || undefined,
    recorteGaspea: row.recorte_gaspea || undefined,
    recorteTaloneira: row.recorte_taloneira || undefined,
    corRecorteCano: row.cor_recorte_cano || undefined,
    corRecorteGaspea: row.cor_recorte_gaspea || undefined,
    corRecorteTaloneira: row.cor_recorte_taloneira || undefined,
    conferido: row.conferido ?? false,
    conferidoEm: row.conferido_em || undefined,
    conferidoPor: row.conferido_por || undefined,
  };
}

/* ───── Order → DB row mapping ───── */
export function orderToDbRow(order: any, userId: string) {
  return {
    user_id: userId,
    numero: order.numero,
    vendedor: order.vendedor || '',
    tamanho: order.tamanho || '',
    genero: order.genero || null,
    modelo: order.modelo || '',
    solado: order.solado || '',
    formato_bico: order.formatoBico || '',
    cor_vira: order.corVira || '',
    couro_gaspea: order.couroGaspea || '',
    couro_cano: order.couroCano || '',
    couro_taloneira: order.couroTaloneira || '',
    cor_couro_gaspea: order.corCouroGaspea || null,
    cor_couro_cano: order.corCouroCano || null,
    cor_couro_taloneira: order.corCouroTaloneira || null,
    bordado_cano: order.bordadoCano || '',
    bordado_gaspea: order.bordadoGaspea || '',
    bordado_taloneira: order.bordadoTaloneira || '',
    cor_bordado_cano: order.corBordadoCano || null,
    cor_bordado_gaspea: order.corBordadoGaspea || null,
    cor_bordado_taloneira: order.corBordadoTaloneira || null,
    bordado_variado_desc_cano: order.bordadoVariadoDescCano || null,
    bordado_variado_desc_gaspea: order.bordadoVariadoDescGaspea || null,
    bordado_variado_desc_taloneira: order.bordadoVariadoDescTaloneira || null,
    personalizacao_nome: order.personalizacaoNome || '',
    personalizacao_bordado: order.personalizacaoBordado || '',
    nome_bordado_desc: order.nomeBordadoDesc || null,
    cor_linha: order.corLinha || '',
    cor_borrachinha: order.corBorrachinha || '',
    trisce: order.trisce || 'Não',
    trice_desc: order.triceDesc || null,
    tiras: order.tiras || 'Não',
    tiras_desc: order.tirasDesc || null,
    metais: order.metais || '',
    tipo_metal: order.tipoMetal || null,
    cor_metal: order.corMetal || null,
    strass_qtd: order.strassQtd ?? null,
    cruz_metal_qtd: order.cruzMetalQtd ?? null,
    bridao_metal_qtd: order.bridaoMetalQtd ?? null,
    acessorios: order.acessorios || '',
    desenvolvimento: order.desenvolvimento || '',
    sob_medida: order.sobMedida ?? false,
    sob_medida_desc: order.sobMedidaDesc || null,
    observacao: order.observacao || '',
    quantidade: order.quantidade ?? 1,
    preco: order.preco ?? 0,
    status: order.status || 'Em aberto',
    data_criacao: order.dataCriacao,
    hora_criacao: order.horaCriacao,
    dias_restantes: order.diasRestantes ?? 10,
    tem_laser: order.temLaser ?? false,
    fotos: order.fotos || [],
    historico: order.historico || [],
    alteracoes: order.alteracoes || [],
    laser_cano: order.laserCano || null,
    cor_glitter_cano: order.corGlitterCano || null,
    laser_gaspea: order.laserGaspea || null,
    cor_glitter_gaspea: order.corGlitterGaspea || null,
    laser_taloneira: order.laserTaloneira || null,
    cor_glitter_taloneira: order.corGlitterTaloneira || null,
    estampa: order.estampa || null,
    estampa_desc: order.estampaDesc || null,
    pintura: order.pintura || null,
    pintura_desc: order.pinturaDesc || null,
    costura_atras: order.costuraAtras || null,
    cor_sola: order.corSola || null,
    carimbo: order.carimbo || null,
    carimbo_desc: order.carimboDesc || null,
    cor_vivo: order.corVivo || null,
    adicional_desc: order.adicionalDesc || null,
    adicional_valor: order.adicionalValor ?? null,
    desconto: order.desconto ?? null,
    desconto_justificativa: order.descontoJustificativa || null,
    forma: order.forma || null,
    tipo_extra: order.tipoExtra || null,
    extra_detalhes: order.extraDetalhes || null,
    numero_pedido_bota: order.numeroPedidoBota || null,
    cliente: order.cliente || '',
    recorte_cano: order.recorteCano || null,
    recorte_gaspea: order.recorteGaspea || null,
    recorte_taloneira: order.recorteTaloneira || null,
    cor_recorte_cano: order.corRecorteCano || null,
    cor_recorte_gaspea: order.corRecorteGaspea || null,
    cor_recorte_taloneira: order.corRecorteTaloneira || null,
  };
}

/* ───── camelCase → snake_case key map for partial updates ───── */
export const CAMEL_TO_SNAKE: Record<string, string> = {
  formatoBico: 'formato_bico', corVira: 'cor_vira', couroGaspea: 'couro_gaspea', couroCano: 'couro_cano',
  couroTaloneira: 'couro_taloneira', corCouroGaspea: 'cor_couro_gaspea', corCouroCano: 'cor_couro_cano',
  corCouroTaloneira: 'cor_couro_taloneira', bordadoCano: 'bordado_cano', bordadoGaspea: 'bordado_gaspea',
  bordadoTaloneira: 'bordado_taloneira', corBordadoCano: 'cor_bordado_cano', corBordadoGaspea: 'cor_bordado_gaspea',
  corBordadoTaloneira: 'cor_bordado_taloneira', bordadoVariadoDescCano: 'bordado_variado_desc_cano',
  bordadoVariadoDescGaspea: 'bordado_variado_desc_gaspea', bordadoVariadoDescTaloneira: 'bordado_variado_desc_taloneira',
  personalizacaoNome: 'personalizacao_nome', personalizacaoBordado: 'personalizacao_bordado',
  nomeBordadoDesc: 'nome_bordado_desc', corLinha: 'cor_linha', corBorrachinha: 'cor_borrachinha',
  triceDesc: 'trice_desc', tirasDesc: 'tiras_desc', tipoMetal: 'tipo_metal', corMetal: 'cor_metal',
  strassQtd: 'strass_qtd', cruzMetalQtd: 'cruz_metal_qtd', bridaoMetalQtd: 'bridao_metal_qtd',
  sobMedida: 'sob_medida', sobMedidaDesc: 'sob_medida_desc', dataCriacao: 'data_criacao',
  horaCriacao: 'hora_criacao', diasRestantes: 'dias_restantes', temLaser: 'tem_laser',
  laserCano: 'laser_cano', corGlitterCano: 'cor_glitter_cano', laserGaspea: 'laser_gaspea',
  corGlitterGaspea: 'cor_glitter_gaspea', laserTaloneira: 'laser_taloneira',
  corGlitterTaloneira: 'cor_glitter_taloneira', estampaDesc: 'estampa_desc', pinturaDesc: 'pintura_desc',
  costuraAtras: 'costura_atras', corSola: 'cor_sola', carimboDesc: 'carimbo_desc',
  corVivo: 'cor_vivo', adicionalDesc: 'adicional_desc', adicionalValor: 'adicional_valor',
  descontoJustificativa: 'desconto_justificativa', tipoExtra: 'tipo_extra',
  extraDetalhes: 'extra_detalhes', numeroPedidoBota: 'numero_pedido_bota',
  recorteCano: 'recorte_cano', recorteGaspea: 'recorte_gaspea', recorteTaloneira: 'recorte_taloneira',
  corRecorteCano: 'cor_recorte_cano', corRecorteGaspea: 'cor_recorte_gaspea', corRecorteTaloneira: 'cor_recorte_taloneira',
};

/** Field labels for change tracking */
export const FIELD_LABELS: Record<string, string> = {
  modelo: 'Modelo', tamanho: 'Tamanho', genero: 'Gênero', solado: 'Solado',
  couroCano: 'Couro do Cano', couroGaspea: 'Couro da Gáspea', couroTaloneira: 'Couro da Taloneira',
  corCouroCano: 'Cor Couro Cano', corCouroGaspea: 'Cor Couro Gáspea', corCouroTaloneira: 'Cor Couro Taloneira',
  bordadoCano: 'Bordado Cano', bordadoGaspea: 'Bordado Gáspea', bordadoTaloneira: 'Bordado Taloneira',
  corBordadoCano: 'Cor Bordado Cano', corBordadoGaspea: 'Cor Bordado Gáspea', corBordadoTaloneira: 'Cor Bordado Taloneira',
  nomeBordadoDesc: 'Nome Bordado', laserCano: 'Laser Cano', laserGaspea: 'Laser Gáspea',
  laserTaloneira: 'Laser Taloneira', corGlitterCano: 'Glitter Cano', corGlitterGaspea: 'Glitter Gáspea',
  corGlitterTaloneira: 'Glitter Taloneira', pintura: 'Pintura', pinturaDesc: 'Cor Pintura',
  estampa: 'Estampa', estampaDesc: 'Descrição Estampa', corLinha: 'Cor da Linha',
  corBorrachinha: 'Cor Borrachinha', corVivo: 'Cor do Vivo', metais: 'Área Metal',
  tipoMetal: 'Tipo Metal', corMetal: 'Cor Metal', observacao: 'Observação',
  desenvolvimento: 'Desenvolvimento', acessorios: 'Acessórios', corVira: 'Cor Vira',
  corSola: 'Cor Sola', costuraAtras: 'Costura Atrás', carimbo: 'Carimbo',
  carimboDesc: 'Descrição Carimbo', adicionalDesc: 'Adicional', formatoBico: 'Formato Bico',
  preco: 'Valor total', desconto: 'Desconto', descontoJustificativa: 'Justificativa do Desconto',
  vendedor: 'Vendedor',
};
