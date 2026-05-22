UPDATE public.orders
SET preco_migrado_v2 = false
WHERE bordado_cano ILIKE '%Florência%'
  AND desconto = 5
  AND status <> 'Cancelado';