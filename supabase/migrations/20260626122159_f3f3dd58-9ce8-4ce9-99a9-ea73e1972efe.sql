ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS template_nome text,
  ADD COLUMN IF NOT EXISTS template_sku text;