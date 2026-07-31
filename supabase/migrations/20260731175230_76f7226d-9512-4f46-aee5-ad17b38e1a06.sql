-- 1. Correção pontual: preço do produto de estoque = valor da ficha do pedido de origem
WITH origem AS (
  SELECT DISTINCT ON (o.estoque_produto_id)
         o.estoque_produto_id AS prod_id, o.preco
    FROM public.orders o
   WHERE o.estoque_produto_id IS NOT NULL
   ORDER BY o.estoque_produto_id, o.created_at DESC
)
UPDATE public.estoque_produtos ep
   SET preco = origem.preco,
       updated_at = now()
  FROM origem
 WHERE ep.id = origem.prod_id
   AND ep.id IN (
     '1724ee4b-003b-4282-ade1-28bde3e1a79a',
     '8bf31553-e4fd-4879-851f-80c7bc6e81fb',
     '09b734d5-8540-4bc3-b2f1-f3579a16a150'
   );

-- 2. Daqui pra frente: produto de estoque acompanha o valor da ficha do pedido de origem.
--    Só vale para produtos de estoque criados a partir de agora.
CREATE OR REPLACE FUNCTION public.sync_estoque_preco_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estoque_produto_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.preco, 0) = COALESCE(OLD.preco, 0) THEN RETURN NEW; END IF;

  UPDATE public.estoque_produtos ep
     SET preco = NEW.preco,
         updated_at = now()
   WHERE ep.id = NEW.estoque_produto_id
     AND ep.created_at >= timestamptz '2026-07-31 17:00:00+00'
     AND ep.preco IS DISTINCT FROM NEW.preco;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_estoque_preco_from_order ON public.orders;
CREATE TRIGGER trg_sync_estoque_preco_from_order
AFTER UPDATE OF preco ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_estoque_preco_from_order();