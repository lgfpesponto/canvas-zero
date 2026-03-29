CREATE TABLE public.gravata_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cor_tira text NOT NULL,
  tipo_metal text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  UNIQUE (cor_tira, tipo_metal)
);
ALTER TABLE public.gravata_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view stock" ON public.gravata_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert stock" ON public.gravata_stock FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update stock" ON public.gravata_stock FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete stock" ON public.gravata_stock FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));