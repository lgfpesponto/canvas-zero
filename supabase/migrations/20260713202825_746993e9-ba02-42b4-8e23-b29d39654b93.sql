
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.extra_produtos (
  id text PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  preco_base numeric,
  preco_label text NOT NULL,
  variacoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.extra_produtos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.extra_produtos TO authenticated;
GRANT ALL ON public.extra_produtos TO service_role;

ALTER TABLE public.extra_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extra_produtos_read_all"
  ON public.extra_produtos FOR SELECT USING (true);

CREATE POLICY "extra_produtos_admin_master_insert"
  ON public.extra_produtos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "extra_produtos_admin_master_update"
  ON public.extra_produtos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "extra_produtos_admin_master_delete"
  ON public.extra_produtos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE TRIGGER extra_produtos_updated_at
  BEFORE UPDATE ON public.extra_produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.extra_produtos (id, nome, descricao, preco_base, preco_label, variacoes, ordem) VALUES
  ('tiras_laterais','Tiras Laterais','Tiras laterais para botas',15,'R$ 15,00','{}'::jsonb,1),
  ('desmanchar','Desmanchar','Serviço de desmanchar bota',NULL,'A partir de R$ 65,00','{}'::jsonb,2),
  ('kit_canivete','Kit Canivete','Kit canivete em couro',30,'A partir de R$ 30,00','{}'::jsonb,3),
  ('kit_faca','Kit Faca','Kit faca em couro',35,'A partir de R$ 35,00','{}'::jsonb,4),
  ('carimbo_fogo','Carimbo a Fogo','Carimbo a fogo personalizado',20,'A partir de R$ 20,00',
    '{"faixas":[{"nome":"1 a 3 carimbos","preco":20},{"nome":"4 ou mais carimbos","preco":40}]}'::jsonb,5),
  ('revitalizador','Revitalizador (Unidade)','Revitalizador para couro',10,'R$ 10,00/un','{}'::jsonb,6),
  ('kit_revitalizador','Kit 2 Revitalizador','Kit com 2 revitalizadores',26,'R$ 26,00/kit','{}'::jsonb,7),
  ('gravata_country','Gravata Country','Gravata country com metal',30,'R$ 30,00',
    '{"cor_tira":[{"nome":"Preto","preco":0},{"nome":"Marrom","preco":0},{"nome":"Off White","preco":0},{"nome":"Laranja","preco":0}],"tipo_metal":[{"nome":"Bota","preco":0},{"nome":"Chapéu","preco":0},{"nome":"Mula","preco":0},{"nome":"Touro","preco":0},{"nome":"Bridão Estrela","preco":0},{"nome":"Bridão Flor","preco":0},{"nome":"Cruz","preco":0},{"nome":"Nossa Senhora","preco":0}],"cor_brilho":[{"nome":"Preto","preco":0},{"nome":"Azul","preco":0},{"nome":"Rosa","preco":0},{"nome":"Cristal","preco":0}]}'::jsonb,8),
  ('adicionar_metais','Adicionar Metais','Metais adicionais para botas',NULL,'Variável',
    '{"itens":[{"nome":"Bola grande","preco":0.60},{"nome":"Strass","preco":0.60}]}'::jsonb,9),
  ('chaveiro_carimbo','Chaveiro c/ Carimbo a Fogo','Chaveiro em couro com carimbo',50,'R$ 50,00','{}'::jsonb,10),
  ('bainha_cartao','Bainha de Cartão','Bainha de cartão em couro',15,'R$ 15,00','{}'::jsonb,11),
  ('bainha_celular','Bainha de Celular','Bainha de celular em couro',50,'R$ 50,00','{}'::jsonb,12),
  ('regata','Regata','Regata bordada personalizada (encomenda)',50,'R$ 50,00','{}'::jsonb,13),
  ('regata_pronta_entrega','Regata Pronta Entrega','Regata pronta com controle de estoque',50,'R$ 50,00','{}'::jsonb,14),
  ('bota_pronta_entrega','Bota Pronta Entrega','Bota pronta para entrega imediata',NULL,'Valor manual','{}'::jsonb,15),
  ('gravata_pronta_entrega','Gravata Pronta Entrega','Gravata pronta com controle de estoque',30,'R$ 30,00','{}'::jsonb,16),
  ('palmilha','Palmilha','Palmilha pronta entrega',10,'R$ 10,00/un',
    '{"formato_bico":[{"nome":"Quadrado","preco":0},{"nome":"Redondo","preco":0},{"nome":"Fino","preco":0}]}'::jsonb,17)
ON CONFLICT (id) DO NOTHING;
