DROP FUNCTION IF EXISTS public.find_orders_by_status_change(text, date, date);

CREATE OR REPLACE FUNCTION public.find_orders_by_status_change(
  _status text[],
  _de date,
  _ate date
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
      AND (h->>'data')::date BETWEEN _de AND _ate
  );
$$;