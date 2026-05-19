-- 1. Coluna de congelamento
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preco_congelado boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orders_preco_congelado ON orders(preco_congelado) WHERE preco_congelado = true;

-- 2. Correção retroativa: Florência no cano em pedidos criados antes de 18/05/2026 (BRT)
-- Rebaixa R$ 5 por unidade por ocorrência de Florência e congela.
WITH alvo AS (
  SELECT
    id,
    quantidade,
    preco,
    (CHAR_LENGTH(bordado_cano) - CHAR_LENGTH(REPLACE(bordado_cano, 'Florência', ''))) / CHAR_LENGTH('Florência') AS ocorrencias
  FROM orders
  WHERE created_at < '2026-05-18 03:00:00+00'
    AND bordado_cano ILIKE '%Florência%'
    AND preco_congelado = false
)
UPDATE orders o
SET
  preco = GREATEST(0, o.preco - (5 * GREATEST(1, COALESCE(o.quantidade,1)) * alvo.ocorrencias)),
  preco_congelado = true,
  preco_regra_versao = 6,
  preco_migrado_v2 = true
FROM alvo
WHERE o.id = alvo.id
  AND alvo.ocorrencias > 0;