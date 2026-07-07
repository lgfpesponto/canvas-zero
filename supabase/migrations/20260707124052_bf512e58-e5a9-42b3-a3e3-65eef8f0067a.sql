ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS erro_de_pedido_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS erro_descricao text;

CREATE INDEX IF NOT EXISTS idx_orders_erro_de_pedido_id
  ON public.orders(erro_de_pedido_id)
  WHERE erro_de_pedido_id IS NOT NULL;