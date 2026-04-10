
CREATE OR REPLACE FUNCTION public.find_order_by_id_suffix(suffix text)
RETURNS SETOF orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM orders
  WHERE id::text ILIKE '%' || suffix
  LIMIT 1;
$$;
