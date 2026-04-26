/**
 * Mapa unificado de preços lido do banco (ficha_variacoes + custom_options).
 *
 * Usado pelos relatórios para imprimir o breakdown com o preço REAL cadastrado,
 * sem depender das constantes hardcoded em orderFieldsConfig.
 */

import { supabase } from '@/integrations/supabase/client';

export type PriceMap = Record<string, Record<string, number>>;

const norm = (s: string) => s.toLowerCase().trim();

export async function loadPriceLookup(): Promise<PriceMap> {
  const map: PriceMap = {};

  const put = (categoria: string, nome: string, preco: number) => {
    const cat = norm(categoria);
    const key = norm(nome);
    if (!map[cat]) map[cat] = {};
    // Não sobrescrever um valor > 0 já existente com 0
    if (map[cat][key] && map[cat][key] > 0 && preco === 0) return;
    map[cat][key] = preco;
  };

  // 1. ficha_variacoes JOIN ficha_categorias
  const { data: varData } = await supabase
    .from('ficha_variacoes')
    .select('nome, preco_adicional, ficha_categorias!inner(slug)')
    .eq('ativo', true);

  if (varData) {
    for (const v of varData as any[]) {
      const slug = v.ficha_categorias?.slug;
      if (!slug) continue;
      put(slug, v.nome, Number(v.preco_adicional) || 0);
    }
  }

  // 2. custom_options
  const { data: optData } = await supabase
    .from('custom_options')
    .select('categoria, label, preco');

  if (optData) {
    for (const o of optData as any[]) {
      put(o.categoria, o.label, Number(o.preco) || 0);
    }
  }

  return map;
}

/**
 * Busca preço cadastrado. `categorias` aceita lista de aliases (ex: bordado pode estar
 * em 'bordados-cano' como variação ou 'bordado_cano' como custom_option).
 */
export function getPrice(
  map: PriceMap,
  categorias: string | string[],
  nome: string | null | undefined,
): number | undefined {
  if (!nome) return undefined;
  const key = norm(nome);
  const cats = Array.isArray(categorias) ? categorias : [categorias];
  for (const c of cats) {
    const v = map[norm(c)]?.[key];
    if (v !== undefined && v > 0) return v;
  }
  // segunda passada: aceitar 0 se for o único disponível
  for (const c of cats) {
    const v = map[norm(c)]?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
}
