/**
 * Preço unitário dinâmico para campos checkbox (tem/não tem) da ficha.
 *
 * Cascata:
 *   1. valor salvo em `ficha_campos.opcoes[0].preco_adicional` (editado no popover)
 *   2. fallback = constante hardcoded original (mantém pedidos antigos idênticos)
 *
 * Módulo mantém um Map em memória sincronizado por `useSyncDynamicUnitPrices`
 * (montado no App). Consumo síncrono via `getDynamicUnitPrice(slug, fallback)`.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const priceMap = new Map<string, number>();

/** Slugs cobertos hoje pela cascata dinâmica. */
export const DYNAMIC_UNIT_SLUGS = [
  // Metais quantificáveis (soma = unitário × qtd)
  'strass', 'bola_grande', 'cruz_metal', 'bridao_metal', 'cavalo_metal',
  // Extras tem/não tem (soma = preço × 1)
  'trice', 'tiras', 'franja', 'corrente', 'costura_atras',
  'pintura', 'estampa',
] as const;

/** Slugs em que o rótulo do popover deve mostrar "unitário". */
export const QUANTIFIABLE_METAL_SLUGS = new Set<string>([
  'strass', 'bola_grande', 'cruz_metal', 'bridao_metal', 'cavalo_metal',
]);

export function getDynamicUnitPrice(slug: string, fallback: number): number {
  const v = priceMap.get(slug);
  if (v === undefined || v === null || Number.isNaN(v)) return fallback;
  // Só considera override quando > 0. Zero em `opcoes` normalmente é campo não seedado.
  return v > 0 ? v : fallback;
}

export function setDynamicUnitPrice(slug: string, value: number) {
  priceMap.set(slug, value);
}

/**
 * Hook a montar UMA vez no shell (App). Popula o Map a partir de
 * `ficha_campos.opcoes` para todos os slugs cobertos.
 */
export function useSyncDynamicUnitPrices() {
  const { data } = useQuery({
    queryKey: ['dynamic_unit_prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_campos')
        .select('slug, opcoes')
        .in('slug', DYNAMIC_UNIT_SLUGS as unknown as string[]);
      if (error) { console.warn('dynamic_unit_prices load failed', error); return []; }
      return data || [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!data) return;
    for (const row of data as any[]) {
      const opt = Array.isArray(row.opcoes) && row.opcoes.length > 0 ? row.opcoes[0] : null;
      const p = opt ? Number(opt.preco_adicional) : 0;
      if (Number.isFinite(p) && p > 0) priceMap.set(row.slug, p);
    }
  }, [data]);
}
