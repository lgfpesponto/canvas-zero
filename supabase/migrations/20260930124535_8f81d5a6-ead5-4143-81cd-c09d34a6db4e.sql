ALTER TABLE public.nfe_notas ADD COLUMN IF NOT EXISTS bagy_pedido_id uuid REFERENCES public.bagy_pedidos(id);
CREATE INDEX IF NOT EXISTS idx_nfe_notas_bagy_pedido ON public.nfe_notas(bagy_pedido_id);