
-- Bagy: campos para sync manual (botão), NF e tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bagy_last_sync_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS bagy_last_sync_error TEXT NULL,
  ADD COLUMN IF NOT EXISTS bagy_last_sync_status TEXT NULL;

ALTER TABLE public.bagy_pedidos
  ADD COLUMN IF NOT EXISTS tracking_code TEXT NULL,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT NULL;

ALTER TABLE public.bagy_status_sync_queue
  ADD COLUMN IF NOT EXISTS nf_numero TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_bagy_last_sync_at
  ON public.orders(bagy_last_sync_at)
  WHERE bagy_order_id IS NOT NULL;
