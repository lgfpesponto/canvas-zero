ALTER TABLE public.bagy_stock_sync_queue
  DROP CONSTRAINT IF EXISTS bagy_stock_sync_queue_estoque_produto_id_fkey;

ALTER TABLE public.bagy_stock_sync_queue
  ADD CONSTRAINT bagy_stock_sync_queue_estoque_produto_id_fkey
  FOREIGN KEY (estoque_produto_id)
  REFERENCES public.estoque_produtos(id)
  ON DELETE SET NULL;