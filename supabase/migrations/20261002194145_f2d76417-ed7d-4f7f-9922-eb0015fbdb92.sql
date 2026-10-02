CREATE OR REPLACE FUNCTION public.has_calc_access(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid, 'admin_master')
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND nome_usuario = 'site');
$$;

CREATE TABLE public.calc_preco_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'real',
  valor numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calc_preco_itens TO authenticated;
GRANT ALL ON public.calc_preco_itens TO service_role;
ALTER TABLE public.calc_preco_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calc itens all" ON public.calc_preco_itens FOR ALL TO authenticated
  USING (public.has_calc_access(auth.uid())) WITH CHECK (public.has_calc_access(auth.uid()));
CREATE TRIGGER calc_preco_itens_upd BEFORE UPDATE ON public.calc_preco_itens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.calc_preco_itens (nome, tipo, valor, ordem) VALUES
 ('Frete','real',0,1),('Brinde','real',0,2),('Etiqueta e panfleto','real',0,3),('Envelope','real',0,4),
 ('Impressão','real',0,5),('Comissão Mari','percentual',0,6),('Lucro','percentual',0,7),
 ('Taxa Bagy','percentual',0,8),('Taxa cartão','percentual',0,9);

CREATE TABLE public.calc_orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text,
  tipo text NOT NULL DEFAULT 'bota',
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  discriminacao text,
  preco_custo numeric NOT NULL DEFAULT 0,
  preco_cartao numeric NOT NULL DEFAULT 0,
  preco_pix numeric NOT NULL DEFAULT 0,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calc_orcamentos TO authenticated;
GRANT ALL ON public.calc_orcamentos TO service_role;
ALTER TABLE public.calc_orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calc orc all" ON public.calc_orcamentos FOR ALL TO authenticated
  USING (public.has_calc_access(auth.uid())) WITH CHECK (public.has_calc_access(auth.uid()));