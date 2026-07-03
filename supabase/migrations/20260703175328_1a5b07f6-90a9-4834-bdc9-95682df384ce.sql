CREATE OR REPLACE FUNCTION public.get_pending_value(vendor text DEFAULT NULL::text)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(COALESCE(preco, 0)), 0)
  FROM orders
  WHERE status = 'Cobrado'
    AND (vendor IS NULL OR vendedor = vendor);
$$;