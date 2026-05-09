-- Solta a referência das baixas para os movimentos de quitação histórica
UPDATE public.revendedor_baixas_pedido b
SET movimento_id = NULL
WHERE movimento_id IN (
  SELECT id FROM public.revendedor_saldo_movimentos
  WHERE tipo = 'ajuste_admin'
    AND descricao LIKE '%QUITAÇÃO HISTÓRICA%RESET FINANCEIRO 09/05/2026%'
     OR descricao LIKE '%QUITAÇÃO HISTÓRICA — INVESTIGAR%'
);

-- Apaga os movimentos de quitação histórica (não devem inflar saldo)
DELETE FROM public.revendedor_saldo_movimentos
WHERE tipo = 'ajuste_admin'
  AND (
    descricao LIKE '%QUITAÇÃO HISTÓRICA%RESET FINANCEIRO 09/05/2026%'
    OR descricao LIKE '%QUITAÇÃO HISTÓRICA — INVESTIGAR%'
  );