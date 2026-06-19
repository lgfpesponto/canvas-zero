ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_loja text, ADD COLUMN IF NOT EXISTS telefone_loja text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cliente_whatsapp text;