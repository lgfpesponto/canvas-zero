-- Reescreve a view de saldo para que "Utilizado" seja LÍQUIDO (baixas - estornos).
-- Saldo continua = entradas + ajustes - baixas + estornos.
-- Assim a relação Recebido / Utilizado / Saldo sempre fecha visualmente:
--   Saldo = Recebido + Ajustes - Utilizado (líquido)
CREATE OR REPLACE VIEW public.vw_revendedor_saldo
WITH (security_invoker=on) AS
SELECT
  vendedor,
  COALESCE(SUM(CASE WHEN tipo IN ('entrada_comprovante','ajuste_admin') THEN valor ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN tipo = 'baixa_pedido' THEN valor ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN tipo = 'estorno' THEN valor ELSE 0 END), 0)
    AS saldo_disponivel,
  COALESCE(SUM(CASE WHEN tipo = 'entrada_comprovante' THEN valor ELSE 0 END), 0) AS total_recebido,
  -- Utilizado LÍQUIDO: baixas menos estornos (o que de fato saiu do bolso do vendedor)
  GREATEST(
    COALESCE(SUM(CASE WHEN tipo = 'baixa_pedido' THEN valor ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN tipo = 'estorno' THEN valor ELSE 0 END), 0),
    0
  ) AS total_utilizado,
  COALESCE(SUM(CASE WHEN tipo = 'ajuste_admin' THEN valor ELSE 0 END), 0) AS total_ajustes,
  COALESCE(SUM(CASE WHEN tipo = 'estorno' THEN valor ELSE 0 END), 0) AS total_estornos,
  COALESCE(SUM(CASE WHEN tipo = 'baixa_pedido' THEN valor ELSE 0 END), 0) AS total_utilizado_bruto
FROM public.revendedor_saldo_movimentos
GROUP BY vendedor;