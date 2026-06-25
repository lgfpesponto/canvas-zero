
-- 1) Novas colunas em orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sku_estoque text,
  ADD COLUMN IF NOT EXISTS nome_produto_estoque text,
  ADD COLUMN IF NOT EXISTS estoque_produto_id uuid,
  ADD COLUMN IF NOT EXISTS estoque_baixado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_sku_estoque ON public.orders(sku_estoque) WHERE sku_estoque IS NOT NULL;

-- 2) Tabela estoque_produtos
CREATE TABLE IF NOT EXISTS public.estoque_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sku_base text NOT NULL,
  tamanho text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  preco numeric NOT NULL DEFAULT 0,
  foto_url text,
  ficha_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT estoque_produtos_qtd_nonneg CHECK (quantidade >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_estoque_produtos_sku_tam
  ON public.estoque_produtos(sku_base, tamanho);

CREATE INDEX IF NOT EXISTS idx_estoque_produtos_nome ON public.estoque_produtos USING gin (to_tsvector('portuguese', nome));

-- 3) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_produtos TO authenticated;
GRANT ALL ON public.estoque_produtos TO service_role;

-- 4) RLS
ALTER TABLE public.estoque_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque_produtos read all auth" ON public.estoque_produtos;
CREATE POLICY "estoque_produtos read all auth" ON public.estoque_produtos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "estoque_produtos admin write" ON public.estoque_produtos;
CREATE POLICY "estoque_produtos admin write" ON public.estoque_produtos
  FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- 5) Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_estoque_produtos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_estoque_produtos_touch ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_produtos_touch
  BEFORE UPDATE ON public.estoque_produtos
  FOR EACH ROW EXECUTE FUNCTION public.touch_estoque_produtos();

-- 6) Função para criar/abastecer estoque a partir de um pedido
CREATE OR REPLACE FUNCTION public.criar_estoque_produto(
  _order_id uuid,
  _override_nome text DEFAULT NULL,
  _override_preco numeric DEFAULT NULL,
  _override_foto text DEFAULT NULL,
  _ficha_snapshot jsonb DEFAULT NULL,
  _tamanho_override text DEFAULT NULL,
  _qtd_override integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ped record;
  v_nome text;
  v_preco numeric;
  v_foto text;
  v_snapshot jsonb;
  v_tamanho text;
  v_qtd integer;
  v_prod_id uuid;
BEGIN
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admins podem criar estoque';
  END IF;

  SELECT * INTO ped FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  IF COALESCE(ped.sku_estoque,'') = '' THEN
    RAISE EXCEPTION 'Pedido sem SKU — preencha o SKU antes de criar estoque';
  END IF;
  IF ped.estoque_baixado THEN
    RAISE EXCEPTION 'Pedido já teve estoque criado';
  END IF;

  v_nome   := COALESCE(NULLIF(trim(_override_nome),''), ped.nome_produto_estoque, ped.modelo, 'Produto');
  v_preco  := COALESCE(_override_preco, ped.preco, 0);
  v_foto   := COALESCE(NULLIF(trim(_override_foto),''),
                       NULLIF(trim((ped.fotos)::text), '[]'),
                       NULL);
  -- pega a primeira foto do array, se houver
  IF ped.fotos IS NOT NULL AND jsonb_typeof(to_jsonb(ped.fotos)) = 'array' AND jsonb_array_length(to_jsonb(ped.fotos)) > 0 THEN
    v_foto := COALESCE(NULLIF(trim(_override_foto),''), (to_jsonb(ped.fotos)->>0));
  END IF;
  v_snapshot := COALESCE(_ficha_snapshot, jsonb_build_object(
    'modelo', ped.modelo,
    'tipo_couro_cano', ped.couro_cano,
    'tipo_couro_gaspea', ped.couro_gaspea,
    'tipo_couro_taloneira', ped.couro_taloneira,
    'cor_couro_cano', ped.cor_couro_cano,
    'cor_couro_gaspea', ped.cor_couro_gaspea,
    'cor_couro_taloneira', ped.cor_couro_taloneira,
    'solado', ped.solado,
    'formato_bico', ped.formato_bico,
    'cor_sola', ped.cor_sola,
    'cor_vira', ped.cor_vira,
    'genero', ped.genero
  ));
  v_tamanho := COALESCE(NULLIF(trim(_tamanho_override),''), ped.tamanho);
  v_qtd     := COALESCE(_qtd_override, ped.quantidade, 1);

  IF v_tamanho IS NULL OR v_tamanho = '' THEN
    RAISE EXCEPTION 'Pedido sem tamanho definido';
  END IF;

  -- Upsert por (sku_base, tamanho) somando quantidade
  INSERT INTO public.estoque_produtos
    (nome, sku_base, tamanho, quantidade, preco, foto_url, ficha_snapshot, criado_por)
  VALUES
    (v_nome, ped.sku_estoque, v_tamanho, v_qtd, v_preco, v_foto, v_snapshot, auth.uid())
  ON CONFLICT (sku_base, tamanho) DO UPDATE
    SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
        ativo = true,
        -- preserva nome/foto/preço já existentes; admin pode editar depois
        updated_at = now()
  RETURNING id INTO v_prod_id;

  UPDATE public.orders
     SET estoque_baixado = true,
         estoque_produto_id = v_prod_id,
         historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
           'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
           'local', ped.status,
           'descricao', format('Estoque criado: %s tam %s (+%s un.) SKU %s', v_nome, v_tamanho, v_qtd, ped.sku_estoque),
           'usuario', COALESCE(public.current_user_nome_completo(),'Admin')
         ))
   WHERE id = _order_id;

  RETURN v_prod_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.criar_estoque_produto(uuid, text, numeric, text, jsonb, text, integer) TO authenticated;

-- 7) Função para decrementar estoque (consumida pelo fluxo de compra)
CREATE OR REPLACE FUNCTION public.comprar_estoque(_items jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb;
  v_prod_id uuid;
  v_qtd integer;
  v_atual integer;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'Itens inválidos';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_prod_id := (it->>'produto_id')::uuid;
    v_qtd := COALESCE((it->>'quantidade')::int, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT quantidade INTO v_atual FROM public.estoque_produtos WHERE id = v_prod_id FOR UPDATE;
    IF v_atual IS NULL THEN RAISE EXCEPTION 'Produto % não encontrado', v_prod_id; END IF;
    IF v_atual < v_qtd THEN
      RAISE EXCEPTION 'Estoque insuficiente para produto % (disponível %, pedido %)', v_prod_id, v_atual, v_qtd;
    END IF;

    UPDATE public.estoque_produtos
       SET quantidade = quantidade - v_qtd,
           updated_at = now()
     WHERE id = v_prod_id;
  END LOOP;
END; $$;

GRANT EXECUTE ON FUNCTION public.comprar_estoque(jsonb) TO authenticated;
