CREATE OR REPLACE FUNCTION public.comprar_estoque_bagy(
  _items jsonb,
  _vendedor text,
  _cliente text,
  _whatsapp text,
  _numero_pedido text,
  _bagy_order_id text,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.comprar_estoque_bagy(
    _items,
    _vendedor,
    _cliente,
    _whatsapp,
    _numero_pedido,
    _bagy_order_id,
    _user_id,
    NULL::text,
    NULL::text,
    NULL::timestamptz
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid) TO service_role;