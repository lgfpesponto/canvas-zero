CREATE TABLE public.nfe_ncm_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  palavras text NOT NULL,
  ncm text NOT NULL,
  referencia text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfe_ncm_regras TO authenticated;
GRANT ALL ON public.nfe_ncm_regras TO service_role;
ALTER TABLE public.nfe_ncm_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncm_regras sel" ON public.nfe_ncm_regras FOR SELECT TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "ncm_regras ins" ON public.nfe_ncm_regras FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "ncm_regras upd" ON public.nfe_ncm_regras FOR UPDATE TO authenticated USING (public.has_nfe_access(auth.uid())) WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "ncm_regras del" ON public.nfe_ncm_regras FOR DELETE TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE TRIGGER nfe_ncm_regras_updated BEFORE UPDATE ON public.nfe_ncm_regras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.nfe_ncm_regras (palavras, ncm, referencia, ordem) VALUES
 ('bota, botas, texana, texanas', '64039990', 'BOTA', 1),
 ('cinto, cintos, gravata, gravatas', '42033000', 'CINTO', 2),
 ('regata, regatas', '61061000', 'EXTRAS', 3),
 ('creme, revitalizador', '34051000', 'EXTRAS', 4);

GRANT INSERT ON public.bagy_pedido_itens TO authenticated;
CREATE POLICY "bagy_itens ins nfe" ON public.bagy_pedido_itens FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));