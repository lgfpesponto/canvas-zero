
CREATE OR REPLACE FUNCTION public.has_nfe_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id AND p.nome_completo IN ('Igor', 'Stefany ADM')
    );
$$;

CREATE TABLE public.nfe_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL, razao_social text NOT NULL, nome_fantasia text,
  inscricao_estadual text NOT NULL, inscricao_municipal text,
  regime_tributario smallint NOT NULL DEFAULT 1, crt smallint NOT NULL DEFAULT 1,
  cnae text, logradouro text NOT NULL, numero text NOT NULL, complemento text,
  bairro text NOT NULL, cep text NOT NULL, cod_municipio text NOT NULL,
  municipio text NOT NULL, uf text NOT NULL, telefone text,
  ambiente smallint NOT NULL DEFAULT 2, serie integer NOT NULL DEFAULT 1,
  proximo_numero integer NOT NULL DEFAULT 1, csc text, csc_id text,
  certificado_path text, certificado_validade timestamptz, certificado_nome text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfe_config TO authenticated;
GRANT ALL ON public.nfe_config TO service_role;
ALTER TABLE public.nfe_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_config sel" ON public.nfe_config FOR SELECT TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_config ins" ON public.nfe_config FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_config upd" ON public.nfe_config FOR UPDATE TO authenticated USING (public.has_nfe_access(auth.uid())) WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_config del" ON public.nfe_config FOR DELETE TO authenticated USING (public.has_nfe_access(auth.uid()));

CREATE TABLE public.nfe_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  numero integer NOT NULL, serie integer NOT NULL, modelo smallint NOT NULL DEFAULT 55,
  chave_acesso text UNIQUE, ambiente smallint NOT NULL,
  status text NOT NULL DEFAULT 'rascunho', natureza_operacao text NOT NULL DEFAULT 'Venda',
  data_emissao timestamptz NOT NULL DEFAULT now(), data_autorizacao timestamptz,
  protocolo text, motivo_rejeicao text, xml_assinado text, xml_autorizado text,
  danfe_pdf_url text,
  valor_produtos numeric(15,2) NOT NULL DEFAULT 0, valor_total numeric(15,2) NOT NULL DEFAULT 0,
  destinatario_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nfe_notas_status_idx ON public.nfe_notas(status);
CREATE INDEX nfe_notas_pedido_idx ON public.nfe_notas(pedido_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfe_notas TO authenticated;
GRANT ALL ON public.nfe_notas TO service_role;
ALTER TABLE public.nfe_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_notas sel" ON public.nfe_notas FOR SELECT TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_notas ins" ON public.nfe_notas FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_notas upd" ON public.nfe_notas FOR UPDATE TO authenticated USING (public.has_nfe_access(auth.uid())) WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_notas del" ON public.nfe_notas FOR DELETE TO authenticated USING (public.has_nfe_access(auth.uid()));

CREATE TABLE public.nfe_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.nfe_notas(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 1, codigo text, descricao text NOT NULL,
  ncm text, cest text, cfop text, unidade text,
  quantidade numeric(15,4) NOT NULL DEFAULT 1, valor_unitario numeric(15,4) NOT NULL DEFAULT 0,
  valor_total numeric(15,2) NOT NULL DEFAULT 0,
  origem_mercadoria smallint, cst_icms text, cst_pis text, cst_cofins text,
  aliq_icms numeric(7,4), aliq_pis numeric(7,4), aliq_cofins numeric(7,4),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nfe_itens_nota_idx ON public.nfe_itens(nota_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfe_itens TO authenticated;
GRANT ALL ON public.nfe_itens TO service_role;
ALTER TABLE public.nfe_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_itens sel" ON public.nfe_itens FOR SELECT TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_itens ins" ON public.nfe_itens FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_itens upd" ON public.nfe_itens FOR UPDATE TO authenticated USING (public.has_nfe_access(auth.uid())) WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_itens del" ON public.nfe_itens FOR DELETE TO authenticated USING (public.has_nfe_access(auth.uid()));

CREATE TABLE public.nfe_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.nfe_notas(id) ON DELETE CASCADE,
  tipo text NOT NULL, status text, protocolo text, justificativa text, xml text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nfe_eventos_nota_idx ON public.nfe_eventos(nota_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfe_eventos TO authenticated;
GRANT ALL ON public.nfe_eventos TO service_role;
ALTER TABLE public.nfe_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_eventos sel" ON public.nfe_eventos FOR SELECT TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_eventos ins" ON public.nfe_eventos FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_eventos upd" ON public.nfe_eventos FOR UPDATE TO authenticated USING (public.has_nfe_access(auth.uid())) WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_eventos del" ON public.nfe_eventos FOR DELETE TO authenticated USING (public.has_nfe_access(auth.uid()));

CREATE TABLE public.nfe_tributacao_referencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia text NOT NULL UNIQUE, descricao text,
  ncm text, cest text, cfop_padrao text, unidade_comercial text,
  origem_mercadoria smallint, cst_icms text, cst_pis text, cst_cofins text,
  aliq_icms numeric(7,4), aliq_pis numeric(7,4), aliq_cofins numeric(7,4),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfe_tributacao_referencias TO authenticated;
GRANT ALL ON public.nfe_tributacao_referencias TO service_role;
ALTER TABLE public.nfe_tributacao_referencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_trib sel" ON public.nfe_tributacao_referencias FOR SELECT TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_trib ins" ON public.nfe_tributacao_referencias FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_trib upd" ON public.nfe_tributacao_referencias FOR UPDATE TO authenticated USING (public.has_nfe_access(auth.uid())) WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_trib del" ON public.nfe_tributacao_referencias FOR DELETE TO authenticated USING (public.has_nfe_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_nfe_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER touch_nfe_config_upd BEFORE UPDATE ON public.nfe_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_nfe_updated_at();
CREATE TRIGGER touch_nfe_notas_upd BEFORE UPDATE ON public.nfe_notas
  FOR EACH ROW EXECUTE FUNCTION public.touch_nfe_updated_at();
CREATE TRIGGER touch_nfe_trib_upd BEFORE UPDATE ON public.nfe_tributacao_referencias
  FOR EACH ROW EXECUTE FUNCTION public.touch_nfe_updated_at();

CREATE POLICY "nfe-cert sel" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'nfe-certificados' AND public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe-cert ins" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nfe-certificados' AND public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe-cert upd" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'nfe-certificados' AND public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe-cert del" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'nfe-certificados' AND public.has_nfe_access(auth.uid()));
