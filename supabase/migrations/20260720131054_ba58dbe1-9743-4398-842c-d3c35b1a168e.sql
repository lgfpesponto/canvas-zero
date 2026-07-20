-- Marca ~1184 pedidos com Marrom+Borracha como desatualizados para o reconciliador recalcular
UPDATE public.orders
SET preco_regra_versao = 0
WHERE tipo_extra IS NULL
  AND cor_sola ILIKE 'Marrom'
  AND solado ILIKE 'Borracha%'
  AND (status IS NULL OR status NOT IN ('Cancelado','Conferido','Cobrado','Pago'));