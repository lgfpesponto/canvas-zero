ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS preco_anterior numeric,
  ADD COLUMN IF NOT EXISTS quantidade_anterior integer;