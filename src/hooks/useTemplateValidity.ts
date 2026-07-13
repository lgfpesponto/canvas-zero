import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { findRemovedVariacoes, type RemovedItem } from '@/lib/templateValidation';

type Tipo = 'bota' | 'cinto';

/**
 * Carrega campos + variações da ficha (bota ou cinto) uma vez e cacheia.
 * A validação depois é local (síncrona) por template.
 */
function useFichaValidation(tipoSlug: Tipo | null) {
  return useQuery({
    queryKey: ['ficha-validation', tipoSlug],
    enabled: !!tipoSlug,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: tipo } = await supabase
        .from('ficha_tipos').select('id').eq('slug', tipoSlug!).maybeSingle();
      if (!tipo) return { campos: [], variacoes: [] };
      const [{ data: campos }, { data: variacoes }] = await Promise.all([
        supabase.from('ficha_campos').select('id, slug, nome').eq('ficha_tipo_id', tipo.id),
        supabase.from('ficha_variacoes').select('id, campo_id, nome'),
      ]);
      // Filtra apenas variações dos campos deste tipo
      const campoIds = new Set((campos || []).map(c => c.id));
      const filteredVars = (variacoes || []).filter(v => campoIds.has(v.campo_id));
      return { campos: campos || [], variacoes: filteredVars };
    },
  });
}

export interface TemplateValidity {
  valid: boolean;
  removed: RemovedItem[];
}

/**
 * Valida um único template/rascunho. `formData` é o dicionário salvo.
 */
export function useTemplateValidity(formData: Record<string, unknown> | null, tipo: Tipo | null): TemplateValidity {
  const { data } = useFichaValidation(tipo);
  return useMemo(() => {
    if (!formData || !data) return { valid: true, removed: [] };
    const removed = findRemovedVariacoes(formData, data.campos as any, data.variacoes as any);
    return { valid: removed.length === 0, removed };
  }, [formData, data]);
}

/**
 * Valida uma lista de templates de mesmo `tipo`. Retorna Map<id, validity>.
 */
export function useTemplatesValidity<T extends { id: string; form_data: Record<string, unknown> }>(
  templates: T[],
  tipo: Tipo | null,
): Map<string, TemplateValidity> {
  const { data } = useFichaValidation(tipo);
  return useMemo(() => {
    const map = new Map<string, TemplateValidity>();
    if (!data) return map;
    for (const t of templates) {
      const removed = findRemovedVariacoes(t.form_data || {}, data.campos as any, data.variacoes as any);
      map.set(t.id, { valid: removed.length === 0, removed });
    }
    return map;
  }, [templates, data]);
}
