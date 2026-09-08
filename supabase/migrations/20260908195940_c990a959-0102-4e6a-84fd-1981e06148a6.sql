CREATE OR REPLACE FUNCTION public.decrement_stock_qty(stock_id uuid, qtd integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  atual integer;
BEGIN
  IF qtd IS NULL OR qtd <= 0 THEN
    RETURN 0;
  END IF;
  SELECT quantidade INTO atual FROM gravata_stock WHERE id = stock_id FOR UPDATE;
  IF atual IS NULL THEN
    RAISE EXCEPTION 'Variação de gravata não encontrada';
  END IF;
  IF atual < qtd THEN
    RAISE EXCEPTION 'Estoque insuficiente: disponível %, solicitado %', atual, qtd;
  END IF;
  UPDATE gravata_stock SET quantidade = quantidade - qtd WHERE id = stock_id;
  RETURN atual - qtd;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_stock_qty(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock_qty(uuid, integer) TO service_role;