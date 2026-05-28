UPDATE public.orders
SET preco_congelado = false,
    preco_regra_versao = NULL
WHERE preco_congelado = true OR preco_regra_versao IS NOT NULL;

ALTER TABLE public.orders ALTER COLUMN preco_congelado SET DEFAULT false;