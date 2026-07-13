/**
 * Mapping label text (exact or prefix, case-insensitive) → slug em ficha_campos.
 * Aceita prefixos porque muitos labels vêm com "(+R$XX)" ou variações.
 * Se um label não estiver aqui, o controle inline não aparece (fallback silencioso).
 */

export type FichaSlug = 'bota' | 'cinto' | string;

const BOTA_MAP: Record<string, string> = {
  // Identificação
  'vendedor': 'vendedor',
  'número do pedido': 'numero_pedido',
  'numero do pedido': 'numero_pedido',
  'nº do pedido': 'numero_pedido',
  'cliente': 'cliente',
  'whatsapp do cliente': 'whatsapp',
  'link da foto de referência': 'foto_referencia',
  // Tamanho / Modelo
  'tamanho': 'tamanho',
  'gênero': 'genero',
  'genero': 'genero',
  'modelo': 'modelo',
  'sob medida': 'sob_medida',
  // Couros
  'tipo couro do cano': 'couro_cano',
  'cor couro do cano': 'cor_couro_cano',
  'tipo couro da gáspea': 'couro_gaspea',
  'cor couro da gáspea': 'cor_couro_gaspea',
  'tipo couro da taloneira': 'couro_taloneira',
  'cor couro da taloneira': 'cor_couro_taloneira',
  // Bordados
  'bordado do cano': 'bordado_cano',
  'bordado da gáspea': 'bordado_gaspea',
  'bordado da taloneira': 'bordado_taloneira',
  'cor do bordado do cano': 'cor_bordado_cano',
  'cor do bordado da gáspea': 'cor_bordado_gaspea',
  'cor do bordado da taloneira': 'cor_bordado_taloneira',
  'nome bordado': 'nome_bordado',
  'desenvolvimento': 'desenvolvimento',
  // Laser / Recortes
  'laser do cano': 'laser_cano',
  'laser da gáspea': 'laser_gaspea',
  'laser da taloneira': 'laser_taloneira',
  'cor glitter/tecido do cano': 'cor_glitter_cano',
  'cor glitter/tecido da gáspea': 'cor_glitter_gaspea',
  'cor glitter/tecido da taloneira': 'cor_glitter_taloneira',
  'recortes do cano': 'recorte_cano',
  'recortes da gáspea': 'recorte_gaspea',
  'recortes da taloneira': 'recorte_taloneira',
  'cor do recorte do cano': 'cor_recorte_cano',
  'cor do recorte da gáspea': 'cor_recorte_gaspea',
  'cor do recorte da taloneira': 'cor_recorte_taloneira',
  'pintura': 'pintura',
  'estampa': 'estampa',
  // Pesponto
  'cor da linha': 'cor_linha',
  'cor da borrachinha': 'cor_borrachinha',
  'cor do vivo': 'cor_vivo',
  // Metais
  'área do metal': 'area_metal',
  'area do metal': 'area_metal',
  'tipo do metal': 'tipo_metal',
  'cor do metal': 'cor_metal',
  'strass': 'strass',
  'bola grande': 'bola_grande',
  'cruz': 'cruz_metal',
  'cruz (metal)': 'cruz_metal',
  'bridão': 'bridao_metal',
  'bridão (metal)': 'bridao_metal',
  'cavalo': 'cavalo_metal',
  'cavalo (metal)': 'cavalo_metal',
  // Extras
  'tricê': 'trice',
  'trice': 'trice',
  'corrente': 'corrente',
  'tiras': 'tiras',
  'franja': 'franja',
  'acessórios': 'acessorios',
  'acessorios': 'acessorios',
  // Solados
  'tipo de solado': 'solado',
  'solado': 'solado',
  'formato do bico': 'formato_bico',
  'cor da sola': 'cor_sola',
  'cor da vira': 'cor_vira',
  'costura atrás': 'costura_atras',
  'costura atras': 'costura_atras',
  // Carimbo / Adicional / Obs
  'carimbo a fogo': 'carimbo',
  'carimbo a fogo:': 'carimbo',
  'carimbo': 'carimbo',
  'quais carimbos': 'carimbo_desc',
  'onde será aplicado': 'carimbo_onde',
  'onde sera aplicado': 'carimbo_onde',
  'valor adicional': 'adicional_valor',
  'valor do adicional': 'adicional_valor',
  'valor do adicional (r$)': 'adicional_valor',
  'descrição do adicional': 'adicional_desc',
  'descricao do adicional': 'adicional_desc',
  'observação': 'observacao',
  'observacao': 'observacao',
};

const CINTO_MAP: Record<string, string> = {
  'vendedor': 'vendedor',
  'número do pedido': 'numero_pedido',
  'numero do pedido': 'numero_pedido',
  'nº do pedido': 'numero_pedido',
  'cliente': 'cliente',
  'whatsapp do cliente': 'whatsapp',
  'link da foto de referência': 'foto_referencia',
  'link da foto de referência (google drive)': 'foto_referencia',
  'tamanho': 'tamanho',
  'modelo': 'modelo',
  'largura': 'largura',
  'tipo de couro': 'tipo_couro',
  'cor do couro': 'cor_couro',
  'fivela': 'fivela',
  'descrever fivela': 'fivela_desc',
  'cor da fivela': 'cor_fivela',
  'bordado': 'bordado',
  'bordado p': 'bordado_p',
  'descrição do bordado': 'bordado_desc',
  'cor do bordado': 'cor_bordado',
  'nome bordado': 'nome_bordado',
  'descrição': 'nome_bordado_desc',
  'descricao': 'nome_bordado_desc',
  'cor': 'nome_bordado_cor',
  'fonte': 'nome_bordado_fonte',
  'laser': 'laser',
  'cor do glitter': 'cor_glitter',
  'recorte': 'recorte',
  'cor do recorte': 'cor_recorte',
  'personalização': 'personalizacao',
  'personalizacao': 'personalizacao',
  'carimbo a fogo': 'carimbo',
  'quais carimbos': 'carimbo_desc',
  'onde será aplicado': 'carimbo_onde',
  'onde sera aplicado': 'carimbo_onde',
  'valor do adicional': 'adicional_valor',
  'valor do adicional (r$)': 'adicional_valor',
  'descrição do adicional': 'adicional_desc',
  'descricao do adicional': 'adicional_desc',
  'observação': 'observacao',
};

const MAPS: Record<string, Record<string, string>> = {
  bota: BOTA_MAP,
  cinto: CINTO_MAP,
};

/** Normaliza label: lowercase, remove "(...)", remove sufixos comuns e trim. */
function normalize(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s*\(\+?r\$[^)]*\)/gi, '')  // remove "(+R$XX)"
    .replace(/\s*\(opcional[^)]*\)/gi, '')
    .replace(/\s*\(google drive\)/gi, '')
    .replace(/\s*\+?r\$[\d,.]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Retorna o slug para um label de acordo com a ficha; null se desconhecido. */
export function lookupSlug(fichaSlug: string, label: string): string | null {
  const map = MAPS[fichaSlug];
  if (!map) return null;
  const key = normalize(label);
  return map[key] || null;
}
