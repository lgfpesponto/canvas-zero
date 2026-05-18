DELETE FROM public.revendedor_saldo_movimentos
WHERE id = (
  SELECT id FROM public.revendedor_saldo_movimentos
  WHERE tipo = 'ajuste_admin'
    AND valor = 36848.15
    AND descricao ILIKE '%Ajuste histórico re-inserido%'
    AND vendedor ILIKE 'Maria Gabriela%'
  ORDER BY created_at DESC
  LIMIT 1
);