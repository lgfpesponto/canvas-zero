import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  'bordado_cano': 'bordado_cano',
  'bordado_gaspea': 'bordado_gaspea',
  'bordado_taloneira': 'bordado_taloneira',
  'laser_cano': 'laser_cano',
  'laser_gaspea': 'laser_gaspea',
  'laser_taloneira': 'laser_taloneira',
  'couro_cano': 'couro_cano',
  'couro_gaspea': 'couro_gaspea',
  'couro_taloneira': 'couro_taloneira',
};

export function useFichaVariacoesLookup() {
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['ficha_variacoes_lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('nome, preco_adicional, campo_id, relacionamento, ficha_campos!inner(slug)')
        .eq('ativo', true);
      if (error) {
        console.error('Error fetching ficha_variacoes:', error);
        return [] as FichaVariacaoItem[];
      }
      return (data || []).map((d: any) => ({
        nome: d.nome,
        preco_adicional: Number(d.preco_adicional) || 0,
        categoria_slug: d.ficha_campos?.slug || '',
        relacionamento: d.relacionamento || null,
      }));
    },
    staleTime: 30_000,
  });

  const getByCustomCategory = useCallback((customCat: string): { label: string; preco: number }[] => {
    const fichaSlug = CATEGORY_MAP[customCat];
    if (!fichaSlug) return [];
    return items
      .filter(i => i.categoria_slug === fichaSlug)
      .map(i => ({ label: i.nome, preco: i.preco_adicional }));
  }, [items]);

  const findFichaPrice = useCallback((itemName: string, customCat: string): number | undefined => {
    const fichaSlug = CATEGORY_MAP[customCat];
    if (!fichaSlug) return undefined;
    const found = items.find(i => i.categoria_slug === fichaSlug && i.nome === itemName);
    return found ? found.preco_adicional : undefined;
  }, [items]);

  return { items, loading, getByCustomCategory, findFichaPrice };
}
