
ALTER TABLE public.estoque_produtos ADD COLUMN IF NOT EXISTS preco_desconto NUMERIC NULL;

GRANT SELECT ON public.estoque_produtos TO anon;

DROP POLICY IF EXISTS "Vitrine publica le estoque ativo" ON public.estoque_produtos;
CREATE POLICY "Vitrine publica le estoque ativo"
ON public.estoque_produtos
FOR SELECT
TO anon
USING (ativo = true);
