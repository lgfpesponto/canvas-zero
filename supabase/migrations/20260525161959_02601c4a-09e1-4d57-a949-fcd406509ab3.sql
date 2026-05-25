CREATE OR REPLACE FUNCTION public.find_orders_by_status_change(
  _status text[], _de date, _ate date
) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.orders o
  WHERE EXISTS (
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
$$;