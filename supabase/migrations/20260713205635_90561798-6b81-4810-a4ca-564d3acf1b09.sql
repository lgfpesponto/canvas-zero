
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.extra_produtos_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao integer NOT NULL,
  snapshot jsonb NOT NULL,
  descricao_mudanca text,
  criado_por uuid,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.extra_produtos_versoes TO authenticated;
GRANT ALL ON public.extra_produtos_versoes TO service_role;

ALTER TABLE public.extra_produtos_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem histórico de extras"
  ON public.extra_produtos_versoes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin master gerencia histórico de extras"
  ON public.extra_produtos_versoes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE OR REPLACE FUNCTION public.log_extra_produtos_versao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
  v_desc text;
  v_uid uuid;
  v_last_id uuid;
  v_last_created timestamptz;
  v_last_uid uuid;
  v_next_versao integer;
  v_old_vars_keys text;
  v_new_vars_keys text;
BEGIN
  v_uid := auth.uid();
  IF TG_OP = 'INSERT' THEN
    v_desc := format('Criou "%s" (R$ %s)', NEW.nome, coalesce(NEW.preco_base::text,'0'));
  ELSIF TG_OP = 'DELETE' THEN
    v_desc := format('Removeu "%s"', OLD.nome);
  ELSE
    v_desc := format('Editou "%s"', COALESCE(NEW.nome, OLD.nome));
    IF NEW.nome IS DISTINCT FROM OLD.nome THEN
      v_desc := v_desc || format(': nome "%s"→"%s"', OLD.nome, NEW.nome);
    END IF;
    IF NEW.preco_base IS DISTINCT FROM OLD.preco_base THEN
      v_desc := v_desc || format(', preço %s→%s', coalesce(OLD.preco_base::text,'0'), coalesce(NEW.preco_base::text,'0'));
    END IF;
    IF NEW.preco_label IS DISTINCT FROM OLD.preco_label THEN
      v_desc := v_desc || ', label alterado';
    END IF;
    IF NEW.variacoes IS DISTINCT FROM OLD.variacoes THEN
      v_old_vars_keys := (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(coalesce(OLD.variacoes,'{}'::jsonb)) k);
      v_new_vars_keys := (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(coalesce(NEW.variacoes,'{}'::jsonb)) k);
      IF v_old_vars_keys IS DISTINCT FROM v_new_vars_keys THEN
        v_desc := v_desc || format(', grupos: [%s]→[%s]', coalesce(v_old_vars_keys,''), coalesce(v_new_vars_keys,''));
      ELSE
        v_desc := v_desc || ', variações alteradas';
      END IF;
    END IF;
  END IF;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY p.nome) INTO v_snapshot FROM public.extra_produtos p;

  SELECT id, created_at, criado_por INTO v_last_id, v_last_created, v_last_uid
    FROM public.extra_produtos_versoes ORDER BY versao DESC LIMIT 1;

  IF v_last_id IS NOT NULL
     AND v_last_uid IS NOT DISTINCT FROM v_uid
     AND now() - v_last_created < interval '30 seconds' THEN
    UPDATE public.extra_produtos_versoes
      SET snapshot = v_snapshot,
          descricao_mudanca = COALESCE(descricao_mudanca,'') || ' | ' || v_desc,
          updated_at = now()
      WHERE id = v_last_id;
  ELSE
    UPDATE public.extra_produtos_versoes SET ativa = false WHERE ativa = true;
    SELECT COALESCE(MAX(versao),0)+1 INTO v_next_versao FROM public.extra_produtos_versoes;
    INSERT INTO public.extra_produtos_versoes (versao, snapshot, descricao_mudanca, criado_por, ativa)
      VALUES (v_next_versao, v_snapshot, v_desc, v_uid, true);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_extra_produtos_versao ON public.extra_produtos;
CREATE TRIGGER trg_log_extra_produtos_versao
  AFTER INSERT OR UPDATE OR DELETE ON public.extra_produtos
  FOR EACH ROW EXECUTE FUNCTION public.log_extra_produtos_versao();

INSERT INTO public.extra_produtos_versoes (versao, snapshot, descricao_mudanca, ativa)
SELECT 1, jsonb_agg(to_jsonb(p) ORDER BY p.nome), 'Snapshot inicial', true
FROM public.extra_produtos p
WHERE NOT EXISTS (SELECT 1 FROM public.extra_produtos_versoes);

-- Cleanup categorias duplicadas na bota
UPDATE public.ficha_variacoes SET categoria_id = '5ae50814-d834-46bd-9d48-543b514ab485' WHERE categoria_id = 'b12ac68e-86e3-4282-93b6-7394a6d50bd9';
DELETE FROM public.ficha_categorias WHERE id = 'b12ac68e-86e3-4282-93b6-7394a6d50bd9';
UPDATE public.ficha_variacoes SET categoria_id = 'cfd6a4a8-f27f-4db5-8307-f6ef96153eba' WHERE categoria_id = '0e7adf1e-aab4-4245-89fd-f2ca126f7d4d';
DELETE FROM public.ficha_categorias WHERE id = '0e7adf1e-aab4-4245-89fd-f2ca126f7d4d';
UPDATE public.ficha_variacoes SET categoria_id = 'fde0ca51-224c-4b0b-9ebc-e6f74644411b' WHERE categoria_id = 'a172fe10-f417-41f4-8899-cec46a926cb5';
DELETE FROM public.ficha_categorias WHERE id = 'a172fe10-f417-41f4-8899-cec46a926cb5';
UPDATE public.ficha_variacoes SET categoria_id = 'c4c9d0af-96de-4e13-b9f3-3442f18fd9a4' WHERE categoria_id = '8ac18d0d-a4a5-4600-87e1-4eb57282f315';
DELETE FROM public.ficha_categorias WHERE id = '8ac18d0d-a4a5-4600-87e1-4eb57282f315';

DELETE FROM public.ficha_categorias WHERE id = '4f6ca1f5-5a4f-4fc7-83b1-0ae82cfeb659'
  AND NOT EXISTS (SELECT 1 FROM public.ficha_campos WHERE categoria_id = '4f6ca1f5-5a4f-4fc7-83b1-0ae82cfeb659')
  AND NOT EXISTS (SELECT 1 FROM public.ficha_variacoes WHERE categoria_id = '4f6ca1f5-5a4f-4fc7-83b1-0ae82cfeb659');

CREATE TRIGGER trg_extra_versoes_updated_at
  BEFORE UPDATE ON public.extra_produtos_versoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
