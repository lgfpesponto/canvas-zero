import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VariacaoRelacionamento {
  nome: string;
  campo_slug: string;
  relacionamento: Record<string, string[]>;
}

/**
 * Hook that reads `ficha_variacoes.relacionamento` from the DB for the "bota" ficha type.
 * Provides `getFilteredOptions(targetSlug, selections)` which returns allowed values
 * for `targetSlug` based on current form selections, or `null` if no DB relationships exist
 * (signaling callers to use hardcoded fallback logic).
 */
export function useDynamicFieldFilter() {
  const { data: variacoes = [] } = useQuery({
    queryKey: ['dynamic_field_filter_bota'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('nome, relacionamento, campo_id, ficha_campos!inner(slug, ficha_tipo_id, ficha_tipos!inner(slug))')
        .eq('ativo', true)
        .not('relacionamento', 'is', null);

      if (error) {
        console.error('Error fetching dynamic field relationships:', error);
        return [] as VariacaoRelacionamento[];
      }

      return (data || [])
        .filter((d: any) => d.ficha_campos?.ficha_tipos?.slug === 'bota')
        .map((d: any) => ({
          nome: d.nome as string,
          campo_slug: (d.ficha_campos?.slug || '') as string,
          relacionamento: (d.relacionamento || {}) as Record<string, string[]>,
        }));
    },
    staleTime: 30_000,
  });

  /**
   * Given a target field slug (e.g. "cor_couro_cano") and the current form selections
   * (e.g. { couro_cano: "Nobuck" }), returns:
   * - string[] of allowed values if DB relationships constrain the target field
   * - null if no DB relationships exist for this combination (use hardcoded fallback)
   */
  const getFilteredOptions = useCallback(
    (targetSlug: string, selections: Record<string, string>): string[] | null => {
      if (!variacoes.length) return null;

      // Find all variacoes whose campo_slug matches a selected field AND whose
      // relacionamento contains the targetSlug
      const allowedSets: string[][] = [];

      for (const [selSlug, selValue] of Object.entries(selections)) {
        if (!selValue) continue;
        // Find the variacao matching the selected value in the selected field
        const match = variacoes.find(
          v => v.campo_slug === selSlug && v.nome === selValue && v.relacionamento[targetSlug]
        );
        if (match) {
          allowedSets.push(match.relacionamento[targetSlug]);
        }
      }

      if (allowedSets.length === 0) return null;

      // Intersect all allowed sets
      if (allowedSets.length === 1) return allowedSets[0];
      const intersection = allowedSets[0].filter(v =>
        allowedSets.every(set => set.includes(v))
      );
      return intersection;
    },
    [variacoes]
  );

  return { getFilteredOptions };
}
