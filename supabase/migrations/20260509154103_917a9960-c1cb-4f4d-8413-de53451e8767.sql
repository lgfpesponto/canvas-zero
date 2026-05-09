
-- Corrige pedidos bota_pronta_entrega cujo `preco` divergiu do bruto da composição.
-- Bug: o "bruto" estava sendo lido de `order.preco` (já pós-ajuste), inflando o total
-- a cada save/reconciliação. Recalcula a partir de extra_detalhes.botas[].
WITH src AS (
  SELECT
    o.id,
    COALESCE(o.desconto,0) AS desconto,
    COALESCE((
      SELECT SUM(
        COALESCE((b->>'valorManual')::numeric,0)
        + COALESCE((SELECT SUM(COALESCE((ex->>'preco')::numeric,0)) FROM jsonb_array_elements(COALESCE(b->'extras','[]'::jsonb)) ex),0)
      )
      FROM jsonb_array_elements(o.extra_detalhes->'botas') b
    ), 0) AS bruto_calc
  FROM orders o
  WHERE o.tipo_extra = 'bota_pronta_entrega'
    AND jsonb_typeof(o.extra_detalhes->'botas') = 'array'
)
UPDATE orders o
SET preco = GREATEST(0, src.bruto_calc - src.desconto),
    preco_migrado_v2 = TRUE
FROM src
WHERE o.id = src.id
  AND src.bruto_calc > 0
  AND ABS(o.preco - (src.bruto_calc - src.desconto)) > 0.01;
