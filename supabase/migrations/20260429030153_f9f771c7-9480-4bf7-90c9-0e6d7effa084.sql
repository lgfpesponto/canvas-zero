ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS conferido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conferido_em timestamptz NULL,
  ADD COLUMN IF NOT EXISTS conferido_por uuid NULL;

CREATE INDEX IF NOT EXISTS idx_orders_conferido ON public.orders(conferido) WHERE conferido = true;