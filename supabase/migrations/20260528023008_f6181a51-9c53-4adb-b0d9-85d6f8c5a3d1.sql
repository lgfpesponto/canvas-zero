-- Index GIN para acelerar buscas no JSONB historico
CREATE INDEX IF NOT EXISTS idx_orders_historico_gin ON public.orders USING gin (historico jsonb_path_ops);

-- Reescreve find_orders_by_status_change para pré-filtrar via @> (usa índice)
-- antes de expandir o jsonb_array_elements
CREATE OR REPLACE FUNCTION public.find_orders_by_status_change(_status text[], _de date, _ate date)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.id
  FROM public.orders o
  WHERE
    -- Pré-filtro com índice GIN: pedido tem PELO MENOS UM dos status no histórico
    EXISTS (
      SELECT 1 FROM unnest(_status) s
      WHERE o.historico @> jsonb_build_array(jsonb_build_object('local', s))
    )
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(o.historico, '[]'::jsonb)) h
      WHERE h->>'local' = ANY(_status)
        AND (
          CASE
            WHEN h->>'data' ~ '^\d{4}-\d{2}-\d{2}'
              THEN substring(h->>'data' from 1 for 10)::date
            WHEN h->>'data' ~ '^\d{2}/\d{2}/\d{4}'
              THEN to_date(substring(h->>'data' from 1 for 10), 'DD/MM/YYYY')
            ELSE NULL
          END
        ) BETWEEN _de AND _ate
    );
$function$;