CREATE OR REPLACE FUNCTION public.get_pending_value(vendor text DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(
    GREATEST(COALESCE(preco, 0) * COALESCE(quantidade, 1) - COALESCE(desconto, 0), 0)
  ), 0)
  FROM orders
  WHERE status IN ('Conferido', 'Cobrado')
    AND (vendor IS NULL OR vendedor = vendor);
$$;