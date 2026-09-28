CREATE TABLE public.nfe_destinatarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'cliente',
  vendedor_nome text,
  nome text NOT NULL,
  cpf_cnpj text NOT NULL,
  inscricao_estadual text,
  ind_ie_dest smallint NOT NULL DEFAULT 9,
  email text,
  telefone text,
  logradouro text NOT NULL,
  numero text NOT NULL,
  complemento text,
  bairro text NOT NULL,
  cep text NOT NULL,
  cod_municipio text NOT NULL,
  municipio text NOT NULL,
  uf text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfe_destinatarios TO authenticated;
GRANT ALL ON public.nfe_destinatarios TO service_role;
ALTER TABLE public.nfe_destinatarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_dest sel" ON public.nfe_destinatarios FOR SELECT TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_dest ins" ON public.nfe_destinatarios FOR INSERT TO authenticated WITH CHECK (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_dest upd" ON public.nfe_destinatarios FOR UPDATE TO authenticated USING (public.has_nfe_access(auth.uid()));
CREATE POLICY "nfe_dest del" ON public.nfe_destinatarios FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin_master'));
CREATE TRIGGER nfe_dest_updated BEFORE UPDATE ON public.nfe_destinatarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nfe_destinatario_id uuid REFERENCES public.nfe_destinatarios(id) ON DELETE SET NULL;
ALTER TABLE public.nfe_tributacao_referencias ADD COLUMN IF NOT EXISTS csosn text;
ALTER TABLE public.nfe_notas ADD COLUMN IF NOT EXISTS destinatario_id uuid REFERENCES public.nfe_destinatarios(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.reservar_numero_nfe()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  IF NOT public.has_nfe_access(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão NF-e'; END IF;
  SELECT * INTO c FROM nfe_config ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Emitente NF-e não configurado'; END IF;
  UPDATE nfe_config SET proximo_numero = proximo_numero + 1 WHERE id = c.id;
  RETURN jsonb_build_object('numero', c.proximo_numero, 'serie', c.serie, 'ambiente', c.ambiente);
END $$;
REVOKE EXECUTE ON FUNCTION public.reservar_numero_nfe() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reservar_numero_nfe() TO authenticated;