-- Default: novos pedidos já nascem congelados
ALTER TABLE public.orders ALTER COLUMN preco_congelado SET DEFAULT true;

-- Congela TODOS os pedidos existentes
UPDATE public.orders
SET preco_congelado = true,
    preco_migrado_v2 = true
WHERE preco_congelado = false;