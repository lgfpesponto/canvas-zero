/**
 * Cache compartilhado de preços (lido do banco) para uso nos relatórios.
 *
 * Os relatórios precisam imprimir o breakdown com o preço REAL cadastrado
 * no admin (ficha_variacoes / custom_options). Como existem dezenas de pontos
 * de consulta espalhados por SpecializedReports.tsx e pdfGenerators.ts, usar
 * um singleton em memória é mais seguro do que propagar um parâmetro adicional.
 */

import { loadPriceLookup, type PriceMap, getPrice as getPriceFromMap } from './priceLookup';

let cache: PriceMap | null = null;
let pending: Promise<PriceMap> | null = null;

export async function ensurePriceCache(): Promise<PriceMap> {
  if (cache) return cache;
  if (pending) return pending;
  pending = loadPriceLookup().then(m => {
    cache = m;
    pending = null;
    return m;
  }).catch(err => {
    pending = null;
    console.error('Failed to load price cache:', err);
    return {};
  });
  return pending;
}

export function invalidatePriceCache() {
  cache = null;
  pending = null;
}

/**
 * Busca preço no cache. Retorna `undefined` se não houver dados ou se
 * a categoria/nome não estiverem cadastrados — chame `ensurePriceCache()`
 * antes de usar para garantir dados atualizados.
 */
export function getCachedPrice(
  categorias: string | string[],
  nome: string | null | undefined,
): number | undefined {
  if (!cache) return undefined;
  return getPriceFromMap(cache, categorias, nome);
}

/**
 * Busca preço com fallback. Primeiro tenta o banco; se não achar, usa o valor
 * fornecido (geralmente vindo das constantes hardcoded em orderFieldsConfig).
 */
export function priceWithFallback(
  categorias: string | string[],
  nome: string | null | undefined,
  fallback: number | undefined,
): number {
  const fromDb = getCachedPrice(categorias, nome);
  if (fromDb !== undefined) return fromDb;
  return fallback ?? 0;
}
