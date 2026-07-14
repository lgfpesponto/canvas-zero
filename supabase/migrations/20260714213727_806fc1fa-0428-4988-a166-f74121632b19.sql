
-- Backfill lead_time_snapshot para pedidos sem snapshot.
-- Bota / Cinto: usa ficha_tipos.lead_time_dias (slug bota/cinto).
UPDATE public.orders o
SET lead_time_snapshot = ft.lead_time_dias
FROM public.ficha_tipos ft
WHERE o.lead_time_snapshot IS NULL
  AND o.tipo_extra IS NULL
  AND ft.slug = 'bota';

UPDATE public.orders o
SET lead_time_snapshot = ft.lead_time_dias
FROM public.ficha_tipos ft
WHERE o.lead_time_snapshot IS NULL
  AND o.tipo_extra = 'cinto'
  AND ft.slug = 'cinto';

-- Extras (exceto bota_pronta_entrega que depende de itens embutidos):
-- usa extra_produtos.lead_time_dias.
UPDATE public.orders o
SET lead_time_snapshot = ep.lead_time_dias
FROM public.extra_produtos ep
WHERE o.lead_time_snapshot IS NULL
  AND o.tipo_extra IS NOT NULL
  AND o.tipo_extra <> 'cinto'
  AND o.tipo_extra <> 'bota_pronta_entrega'
  AND ep.id = o.tipo_extra;
