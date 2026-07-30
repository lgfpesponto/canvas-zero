UPDATE public.bagy_stock_sync_queue q
SET ultimo_erro = NULL
FROM public.estoque_produtos p
WHERE p.id = q.estoque_produto_id
  AND q.ultimo_erro IS NOT NULL
  AND q.processado_em IS NOT NULL
  AND p.bagy_sync_status = 'ok'
  AND p.bagy_sync_at IS NOT NULL
  AND p.bagy_sync_at >= q.processado_em;