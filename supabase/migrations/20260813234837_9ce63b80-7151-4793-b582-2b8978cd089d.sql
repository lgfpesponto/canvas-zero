CREATE OR REPLACE FUNCTION public.next_order_numero(_prefixo text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text;
  max_n int;
BEGIN
  IF _prefixo IS NULL OR length(btrim(_prefixo)) = 0 THEN
    RETURN NULL;
  END IF;

  -- normaliza: remove hífen final se o admin cadastrou "2-"
  p := upper(btrim(_prefixo));
  p := regexp_replace(p, '-+$', '');

  SELECT COALESCE(MAX((regexp_replace(upper(numero), '^' || p || '-(\d+).*$', '\1'))::int), 0)
    INTO max_n
    FROM public.orders
   WHERE upper(numero) ~ ('^' || p || '-\d+[A-Z0-9]*$');

  RETURN p || '-' || (max_n + 1)::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_order_numero(text) TO authenticated;