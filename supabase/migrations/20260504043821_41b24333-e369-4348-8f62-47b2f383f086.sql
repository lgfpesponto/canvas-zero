CREATE TABLE public.regata_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cor_tecido text NOT NULL,
  desenho_bordado text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0
);

ALTER TABLE public.regata_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view regata_stock"
ON public.regata_stock FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert regata_stock"
ON public.regata_stock FOR INSERT TO authenticated
WITH CHECK (is_any_admin(auth.uid()));

CREATE POLICY "Admins can update regata_stock"
ON public.regata_stock FOR UPDATE TO authenticated
USING (is_any_admin(auth.uid()));

CREATE POLICY "Only admin_master can delete regata_stock"
ON public.regata_stock FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE OR REPLACE FUNCTION public.decrement_regata_stock(stock_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.regata_stock
  SET quantidade = quantidade - 1
  WHERE id = stock_id AND quantidade > 0;
END;
$$;