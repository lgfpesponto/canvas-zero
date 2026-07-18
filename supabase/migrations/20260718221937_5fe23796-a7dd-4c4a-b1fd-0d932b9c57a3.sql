
CREATE OR REPLACE FUNCTION public.editar_produto_estoque(
  _produto_id uuid,
  _nome text DEFAULT NULL::text,
  _foto_url text DEFAULT NULL::text,
  _preco numeric DEFAULT NULL::numeric,
  _sku_base text DEFAULT NULL::text,
  _preco_desconto numeric DEFAULT NULL::numeric,
  _limpar_desconto boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admins podem editar produtos do estoque';
  END IF;

  UPDATE public.estoque_produtos
     SET nome = COALESCE(NULLIF(trim(_nome),''), nome),
         foto_url = COALESCE(NULLIF(trim(_foto_url),''), foto_url),
         preco = COALESCE(_preco, preco),
         sku_base = COALESCE(NULLIF(trim(_sku_base),''), sku_base),
         preco_desconto = CASE
           WHEN _limpar_desconto THEN NULL
           WHEN _preco_desconto IS NOT NULL THEN _preco_desconto
           ELSE preco_desconto
         END,
         updated_at = now()
   WHERE id = _produto_id;
END; $function$;
