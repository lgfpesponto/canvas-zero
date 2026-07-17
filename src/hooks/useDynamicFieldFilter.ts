import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VariacaoRelacionamento {
  id: string;
  nome: string;
  campo_slug: string;
  preco_adicional: number;
  relacionamento: Record<string, string[]>;
}

const norm = (value: string | undefined | null): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/**
 * Hook that reads `ficha_variacoes.relacionamento` from the DB for the "bota" ficha type.
 * - `getFilteredOptions(targetSlug, selections)` returns allowed values for `targetSlug`
 *   based on current form selections, or `null` if no DB relationships constrain it.
 * - `getOptionPrice(targetSlug, optionName, selections)` returns the price of a specific
 *   option honoring `relacionamento` (contextual price like PVC + Marrom = R$0).
 */
export function useDynamicFieldFilter() {
  const { data: variacoes = [] } = useQuery({
    queryKey: ['dynamic_field_filter_bota'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('id, nome, preco_adicional, relacionamento, campo_id, ficha_campos!inner(slug, ficha_tipo_id, ficha_tipos!inner(slug))')
        .eq('ativo', true);

      if (error) {
        console.error('Error fetching dynamic field relationships:', error);
        return [] as VariacaoRelacionamento[];
      }

      return (data || [])
        .filter((d: any) => d.ficha_campos?.ficha_tipos?.slug === 'bota')
        .map((d: any) => ({
          id: d.id as string,
          nome: d.nome as string,
          campo_slug: (d.ficha_campos?.slug || '') as string,
          preco_adicional: Number(d.preco_adicional) || 0,
          relacionamento: (d.relacionamento || {}) as Record<string, string[]>,
        }));
    },
    staleTime: 30_000,
  });

  const getFilteredOptions = useCallback(
    (targetSlug: string, selections: Record<string, string>): string[] | null => {
      if (!variacoes.length) return null;

      const allowedSets: string[][] = [];

      for (const [selSlug, selValue] of Object.entries(selections)) {
        if (!selValue) continue;
        // Uma mesma seleção pode ter várias variações homônimas (ex.: Marrom).
        // Somamos os allowed sets de todas.
        const matches = variacoes.filter(
          v => v.campo_slug === selSlug
            && norm(v.nome) === norm(selValue)
            && Array.isArray(v.relacionamento?.[targetSlug])
            && v.relacionamento[targetSlug].length > 0,
        );
        for (const m of matches) allowedSets.push(m.relacionamento[targetSlug]);
      }

      if (allowedSets.length === 0) return null;
      if (allowedSets.length === 1) return allowedSets[0];

      // União — se qualquer variação selecionada libera o valor, ele aparece.
      const merged = new Set<string>();
      for (const set of allowedSets) for (const v of set) merged.add(v);
      return Array.from(merged);
    },
    [variacoes],
  );

  const getOptionPrice = useCallback(
    (targetSlug: string, optionName: string, selections: Record<string, string>): number | null => {
      if (!variacoes.length || !optionName) return null;

      // 1) tenta encontrar a variação contextual cujo relacionamento bate com as seleções
      const contextual = variacoes.filter(v => {
        if (v.campo_slug !== targetSlug || norm(v.nome) !== norm(optionName)) return false;
        const relEntries = Object.entries(v.relacionamento || {}).filter(
          ([, allowed]) => Array.isArray(allowed) && allowed.length > 0,
        );
        if (relEntries.length === 0) return false;
        // TODOS os campos com relacionamento devem casar com a seleção atual
        return relEntries.every(([sourceSlug, allowed]) => {
          const selected = selections[sourceSlug];
          if (!selected) return false;
          return allowed.some(a => norm(a) === norm(selected));
        });
      });

      if (contextual.length > 0) {
        // preferimos a variação com mais restrições atendidas (mais específica)
        contextual.sort(
          (a, b) => Object.keys(b.relacionamento || {}).length - Object.keys(a.relacionamento || {}).length,
        );
        return contextual[0].preco_adicional;
      }

      // 2) fallback: variação sem relacionamento
      const unscoped = variacoes.find(
        v => v.campo_slug === targetSlug
          && norm(v.nome) === norm(optionName)
          && Object.keys(v.relacionamento || {}).length === 0,
      );
      return unscoped ? unscoped.preco_adicional : null;
    },
    [variacoes],
  );

  return { getFilteredOptions, getOptionPrice };
}
