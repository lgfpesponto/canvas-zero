ALTER TABLE public.bagy_pedidos ADD COLUMN IF NOT EXISTS metodo_envio text;
ALTER TABLE public.bagy_pedido_itens ADD COLUMN IF NOT EXISTS ncm text;