CREATE OR REPLACE FUNCTION public.decrement_stock(stock_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE gravata_stock
  SET quantidade = quantidade - 1
  WHERE id = stock_id AND quantidade > 0;
END;
$$;