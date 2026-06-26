CREATE OR REPLACE FUNCTION public.find_template_by_sku(_sku text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.order_templates
  WHERE (sku IS NOT NULL AND lower(sku) = lower(_sku))
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements(COALESCE(tamanhos_skus,'[]'::jsonb)) e
       WHERE lower(e->>'sku') = lower(_sku)
     )
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_template_by_sku(text) TO service_role, authenticated, anon;