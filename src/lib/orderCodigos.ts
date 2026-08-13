/**
 * Códigos que vão no FINAL do número do pedido, por tipo de pedido.
 * Ex.: 2-346EST (compra de estoque), 2-347PALMI (palmilha).
 * Bota por ficha não tem código.
 */

/** Código para compra de produto de estoque. */
export const CODIGO_ESTOQUE = 'EST';

/** Mapa: id do produto extra (extra_produtos.id) → código. */
export const CODIGOS_EXTRAS: Record<string, string> = {
  tiras_laterais: 'TIRAS',
  desmanchar: 'DESMAN',
  kit_canivete: 'CANIVETE',
  kit_faca: 'FACA',
  carimbo_fogo: 'CARIMBO',
  revitalizador: 'REVIT',
  kit_revitalizador: 'REVITKIT',
  gravata_country: 'GRAVATA',
  adicionar_metais: 'METAIS',
  chaveiro_carimbo: 'CHAVCF',
  bainha_cartao: 'BCARTAO',
  bainha_celular: 'BCELULAR',
  regata: 'REGATA',
  regata_pronta_entrega: 'REGATAEST',
  bota_pronta_entrega: 'ESTMAN',
  gravata_pronta_entrega: 'GRAVATAETS',
  palmilha: 'PALMI',
};

/** Retorna o código do produto extra (ou string vazia se não houver). */
export function codigoExtra(productId?: string | null): string {
  if (!productId) return '';
  return CODIGOS_EXTRAS[productId] || '';
}
