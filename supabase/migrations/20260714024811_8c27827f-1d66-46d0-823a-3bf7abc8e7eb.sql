
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pedido_prefixo text;

CREATE OR REPLACE FUNCTION public.next_order_numero(_prefixo text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_n int;
BEGIN
  IF _prefixo IS NULL OR length(_prefixo) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(MAX((regexp_replace(numero, '^' || _prefixo, ''))::int), 0)
    INTO max_n
    FROM public.orders
    WHERE numero ~ ('^' || _prefixo || '\d+$');
  RETURN _prefixo || (max_n + 1)::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_order_numero(text) TO authenticated;
