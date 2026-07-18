/**
 * Chave de agrupamento de produto de estoque.
 * Combina o nome + raiz do SKU (tudo menos o último segmento, geralmente o tamanho).
 * Usada tanto para agrupar cards quanto para vincular descontos a produtos específicos.
 */
export function estoqueGroupKey(nome: string, skuBase: string): string {
  const raiz = skuBase.split('-').slice(0, -1).join('-') || skuBase;
  return `${nome}::${raiz}`;
}
