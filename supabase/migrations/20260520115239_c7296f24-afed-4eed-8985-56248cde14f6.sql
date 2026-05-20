UPDATE public.orders
SET preco = 30,
    preco_migrado_v2 = true,
    preco_congelado = true,
    historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      'usuario', 'Sistema',
      'acao', 'Ajuste retroativo: Gravata Pronta Entrega padronizada em R$ 30'
    ))
WHERE tipo_extra = 'gravata_pronta_entrega'
  AND (preco IS NULL OR preco = 0);