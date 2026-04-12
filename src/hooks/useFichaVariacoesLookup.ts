import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FichaVariacaoItem {
  nome: string;
  preco_adicional: number;
  categoria_slug: string;
  relacionamento: Record<string, string[]> | null;
}

/**
 * Mapping from custom_options category keys to ficha_categorias slugs.
 * Laser uses a single shared category in ficha but 3 separate in custom_options.
 */
const CATEGORY_MAP: Record<string, string> = {
  'bordado_cano': 'bordados-cano',
  'bordado_gaspea': 'bordados-gaspea',
  'bordado_taloneira': 'bordados-taloneira',
  'laser_cano': 'laser',
  'laser_gaspea': 'laser',
  'laser_taloneira': 'laser',
};

export function useFichaVariacoesLookup() {
  const [items, setItems] = useState<FichaVariacaoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('nome, preco_adicional, categoria_id, ficha_categorias!inner(slug)')
        .eq('ativo', true);
      if (error) {
        console.error('Error fetching ficha_variacoes:', error);
        setLoading(false);
        return;
      }
      const mapped = (data || []).map((d: any) => ({
        nome: d.nome,
        preco_adicional: Number(d.preco_adicional) || 0,
        categoria_slug: d.ficha_categorias?.slug || '',
      }));
      setItems(mapped);
      setLoading(false);
    })();
  }, []);

  /**
   * Get items for a given custom_options category key (e.g. 'bordado_cano').
   * Returns ficha_variacoes items mapped to the corresponding ficha_categorias slug.
   */
  const getByCustomCategory = useCallback((customCat: string): { label: string; preco: number }[] => {
    const fichaSlug = CATEGORY_MAP[customCat];
    if (!fichaSlug) return [];
    return items
      .filter(i => i.categoria_slug === fichaSlug)
      .map(i => ({ label: i.nome, preco: i.preco_adicional }));
  }, [items]);

  /**
   * Find the price for a specific item by name + custom category.
   * Returns undefined if not found in ficha_variacoes.
   */
  const findFichaPrice = useCallback((itemName: string, customCat: string): number | undefined => {
    const fichaSlug = CATEGORY_MAP[customCat];
    if (!fichaSlug) return undefined;
    const found = items.find(i => i.categoria_slug === fichaSlug && i.nome === itemName);
    return found ? found.preco_adicional : undefined;
  }, [items]);

  return { items, loading, getByCustomCategory, findFichaPrice };
}
