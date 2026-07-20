-- Backfill hora_criacao/data_criacao dos pedidos Bagy importados antes do fix de timezone.
-- Antes do fix, bagy_created_at foi salvo como UTC "puro" (naive parsed as UTC),
-- mas na verdade representa horário de São Paulo. Extraímos a wall clock em UTC
-- para recuperar o horário original exibido no painel Bagy.
UPDATE public.orders o
SET
  hora_criacao = to_char(bp.bagy_created_at AT TIME ZONE 'UTC', 'HH24:MI'),
  data_criacao = to_char((bp.bagy_created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD')
FROM public.bagy_pedidos bp
WHERE o.bagy_order_id = bp.bagy_order_id
  AND bp.bagy_created_at IS NOT NULL
  AND o.status NOT IN ('Cancelado','Cobrado','Pago','Conferido');