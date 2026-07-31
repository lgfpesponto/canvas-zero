-- 1. Helper: monta o snapshot completo da ficha a partir de um pedido
CREATE OR REPLACE FUNCTION public.build_ficha_snapshot_from_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  v jsonb;
BEGIN
  SELECT * INTO p FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v := jsonb_strip_nulls(jsonb_build_object(
    'genero', NULLIF(NULLIF(trim(COALESCE(p.genero,'')), ''), '-'),
    'modelo', NULLIF(NULLIF(trim(COALESCE(p.modelo,'')), ''), '-'),
    'solado', NULLIF(NULLIF(trim(COALESCE(p.solado,'')), ''), '-'),
    'formato_bico', NULLIF(NULLIF(trim(COALESCE(p.formato_bico,'')), ''), '-'),
    'cor_sola', NULLIF(NULLIF(trim(COALESCE(p.cor_sola,'')), ''), '-'),
    'cor_vira', NULLIF(NULLIF(trim(COALESCE(p.cor_vira,'')), ''), '-'),
    'cor_vivo', NULLIF(NULLIF(trim(COALESCE(p.cor_vivo,'')), ''), '-'),
    'cor_linha', NULLIF(NULLIF(trim(COALESCE(p.cor_linha,'')), ''), '-'),
    'cor_borrachinha', NULLIF(NULLIF(trim(COALESCE(p.cor_borrachinha,'')), ''), '-'),
    'tipo_couro_cano', NULLIF(NULLIF(trim(COALESCE(p.couro_cano,'')), ''), '-'),
    'tipo_couro_gaspea', NULLIF(NULLIF(trim(COALESCE(p.couro_gaspea,'')), ''), '-'),
    'tipo_couro_taloneira', NULLIF(NULLIF(trim(COALESCE(p.couro_taloneira,'')), ''), '-'),
    'cor_couro_cano', NULLIF(NULLIF(trim(COALESCE(p.cor_couro_cano,'')), ''), '-'),
    'cor_couro_gaspea', NULLIF(NULLIF(trim(COALESCE(p.cor_couro_gaspea,'')), ''), '-'),
    'cor_couro_taloneira', NULLIF(NULLIF(trim(COALESCE(p.cor_couro_taloneira,'')), ''), '-'),
    'observacao', NULLIF(NULLIF(trim(COALESCE(p.observacao,'')), ''), '-'),
    'forma', NULLIF(NULLIF(trim(COALESCE(p.forma,'')), ''), '-')
  ) || jsonb_build_object(
    'bordado_cano', NULLIF(NULLIF(trim(COALESCE(p.bordado_cano,'')), ''), '-'),
    'bordado_gaspea', NULLIF(NULLIF(trim(COALESCE(p.bordado_gaspea,'')), ''), '-'),
    'bordado_taloneira', NULLIF(NULLIF(trim(COALESCE(p.bordado_taloneira,'')), ''), '-'),
    'cor_bordado_cano', NULLIF(NULLIF(trim(COALESCE(p.cor_bordado_cano,'')), ''), '-'),
    'cor_bordado_gaspea', NULLIF(NULLIF(trim(COALESCE(p.cor_bordado_gaspea,'')), ''), '-'),
    'cor_bordado_taloneira', NULLIF(NULLIF(trim(COALESCE(p.cor_bordado_taloneira,'')), ''), '-'),
    'bordado_variado_desc_cano', NULLIF(NULLIF(trim(COALESCE(p.bordado_variado_desc_cano,'')), ''), '-'),
    'bordado_variado_desc_gaspea', NULLIF(NULLIF(trim(COALESCE(p.bordado_variado_desc_gaspea,'')), ''), '-'),
    'bordado_variado_desc_taloneira', NULLIF(NULLIF(trim(COALESCE(p.bordado_variado_desc_taloneira,'')), ''), '-'),
    'recorte_cano', NULLIF(NULLIF(trim(COALESCE(p.recorte_cano,'')), ''), '-'),
    'recorte_gaspea', NULLIF(NULLIF(trim(COALESCE(p.recorte_gaspea,'')), ''), '-'),
    'recorte_taloneira', NULLIF(NULLIF(trim(COALESCE(p.recorte_taloneira,'')), ''), '-'),
    'cor_recorte_cano', NULLIF(NULLIF(trim(COALESCE(p.cor_recorte_cano,'')), ''), '-'),
    'cor_recorte_gaspea', NULLIF(NULLIF(trim(COALESCE(p.cor_recorte_gaspea,'')), ''), '-'),
    'cor_recorte_taloneira', NULLIF(NULLIF(trim(COALESCE(p.cor_recorte_taloneira,'')), ''), '-'),
    'sob_medida', CASE WHEN p.sob_medida THEN true ELSE NULL END,
    'sob_medida_desc', NULLIF(NULLIF(trim(COALESCE(p.sob_medida_desc,'')), ''), '-')
  ) || jsonb_build_object(
    'laser_cano', NULLIF(NULLIF(trim(COALESCE(p.laser_cano,'')), ''), '-'),
    'laser_gaspea', NULLIF(NULLIF(trim(COALESCE(p.laser_gaspea,'')), ''), '-'),
    'laser_taloneira', NULLIF(NULLIF(trim(COALESCE(p.laser_taloneira,'')), ''), '-'),
    'cor_glitter_cano', NULLIF(NULLIF(trim(COALESCE(p.cor_glitter_cano,'')), ''), '-'),
    'cor_glitter_gaspea', NULLIF(NULLIF(trim(COALESCE(p.cor_glitter_gaspea,'')), ''), '-'),
    'cor_glitter_taloneira', NULLIF(NULLIF(trim(COALESCE(p.cor_glitter_taloneira,'')), ''), '-'),
    'metais', NULLIF(NULLIF(trim(COALESCE(p.metais,'')), ''), '-'),
    'tipo_metal', NULLIF(NULLIF(trim(COALESCE(p.tipo_metal,'')), ''), '-'),
    'cor_metal', NULLIF(NULLIF(trim(COALESCE(p.cor_metal,'')), ''), '-'),
    'strass_qtd', NULLIF(COALESCE(p.strass_qtd,0), 0),
    'cruz_metal_qtd', NULLIF(COALESCE(p.cruz_metal_qtd,0), 0),
    'bridao_metal_qtd', NULLIF(COALESCE(p.bridao_metal_qtd,0), 0),
    'acessorios', NULLIF(NULLIF(trim(COALESCE(p.acessorios,'')), ''), '-'),
    'carimbo', NULLIF(NULLIF(trim(COALESCE(p.carimbo,'')), ''), '-'),
    'carimbo_desc', NULLIF(NULLIF(trim(COALESCE(p.carimbo_desc,'')), ''), '-'),
    'estampa', NULLIF(NULLIF(trim(COALESCE(p.estampa,'')), ''), '-'),
    'estampa_desc', NULLIF(NULLIF(trim(COALESCE(p.estampa_desc,'')), ''), '-'),
    'pintura', NULLIF(NULLIF(trim(COALESCE(p.pintura,'')), ''), '-'),
    'pintura_desc', NULLIF(NULLIF(trim(COALESCE(p.pintura_desc,'')), ''), '-'),
    'trisce', NULLIF(NULLIF(trim(COALESCE(p.trisce,'')), ''), '-'),
    'trice_desc', NULLIF(NULLIF(trim(COALESCE(p.trice_desc,'')), ''), '-'),
    'tiras', NULLIF(NULLIF(trim(COALESCE(p.tiras,'')), ''), '-'),
    'tiras_desc', NULLIF(NULLIF(trim(COALESCE(p.tiras_desc,'')), ''), '-'),
    'costura_atras', NULLIF(NULLIF(trim(COALESCE(p.costura_atras,'')), ''), '-'),
    'adicional_valor', NULLIF(COALESCE(p.adicional_valor, 0), 0),
    'adicional_desc', NULLIF(NULLIF(trim(COALESCE(p.adicional_desc,'')), ''), '-')
  ) || jsonb_build_object(
    'personalizacao_nome', NULLIF(NULLIF(trim(COALESCE(p.personalizacao_nome,'')), ''), '-'),
    'personalizacao_bordado', NULLIF(NULLIF(trim(COALESCE(p.personalizacao_bordado,'')), ''), '-'),
    'nome_bordado_desc', NULLIF(NULLIF(trim(COALESCE(p.nome_bordado_desc,'')), ''), '-'),
    'desenvolvimento', NULLIF(NULLIF(trim(COALESCE(p.desenvolvimento,'')), ''), '-'),
    'extra_detalhes', CASE
      WHEN p.extra_detalhes IS NULL THEN NULL
      ELSE NULLIF(jsonb_strip_nulls(p.extra_detalhes - 'botas' - 'fotos'), '{}'::jsonb)
    END
  ));

  RETURN v;
END; $function$;

REVOKE ALL ON FUNCTION public.build_ficha_snapshot_from_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.build_ficha_snapshot_from_order(uuid) TO authenticated, service_role;

-- 2. criar_estoque_produto usa o snapshot completo
CREATE OR REPLACE FUNCTION public.criar_estoque_produto(_order_id uuid, _override_nome text DEFAULT NULL::text, _override_preco numeric DEFAULT NULL::numeric, _override_foto text DEFAULT NULL::text, _ficha_snapshot jsonb DEFAULT NULL::jsonb, _tamanho_override text DEFAULT NULL::text, _qtd_override integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF ped.fotos IS NOT NULL AND jsonb_typeof(to_jsonb(ped.fotos)) = 'array' AND jsonb_array_length(to_jsonb(ped.fotos)) > 0 THEN
    v_foto := COALESCE(NULLIF(trim(_override_foto),''), (to_jsonb(ped.fotos)->>0));
  END IF;

  -- snapshot completo da ficha (override recebido é mesclado por cima)
  v_snapshot := COALESCE(public.build_ficha_snapshot_from_order(_order_id), '{}'::jsonb)
                || COALESCE(jsonb_strip_nulls(_ficha_snapshot), '{}'::jsonb);

  v_tamanho := COALESCE(NULLIF(trim(_tamanho_override),''), ped.tamanho);
  v_qtd     := COALESCE(_qtd_override, ped.quantidade, 1);

  IF v_tamanho IS NULL OR v_tamanho = '' THEN
    RAISE EXCEPTION 'Pedido sem tamanho definido';
  END IF;

  INSERT INTO public.estoque_produtos
    (nome, sku_base, tamanho, quantidade, preco, foto_url, ficha_snapshot, criado_por)
  VALUES
    (v_nome, ped.sku_estoque, v_tamanho, v_qtd, v_preco, v_foto, v_snapshot, auth.uid())
  ON CONFLICT (sku_base, tamanho) DO UPDATE
    SET quantidade = public.estoque_produtos.quantidade + EXCLUDED.quantidade,
        ativo = true,
        ficha_snapshot = CASE
          WHEN COALESCE(jsonb_array_length(jsonb_path_query_array(public.estoque_produtos.ficha_snapshot, '$.keyvalue()')), 0)
               < COALESCE(jsonb_array_length(jsonb_path_query_array(EXCLUDED.ficha_snapshot, '$.keyvalue()')), 0)
          THEN EXCLUDED.ficha_snapshot
          ELSE public.estoque_produtos.ficha_snapshot
        END,
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
END; $function$;

-- 3. Backfill: completa a ficha dos produtos de estoque já cadastrados (não altera pedidos)
WITH origem AS (
  SELECT DISTINCT ON (o.estoque_produto_id)
         o.estoque_produto_id AS prod_id,
         public.build_ficha_snapshot_from_order(o.id) AS snap
    FROM public.orders o
   WHERE o.estoque_produto_id IS NOT NULL
   ORDER BY o.estoque_produto_id, o.created_at DESC
)
UPDATE public.estoque_produtos ep
   SET ficha_snapshot = COALESCE(origem.snap, '{}'::jsonb) || COALESCE(ep.ficha_snapshot, '{}'::jsonb),
       updated_at = now()
  FROM origem
 WHERE ep.id = origem.prod_id
   AND origem.snap IS NOT NULL
   AND COALESCE(jsonb_array_length(jsonb_path_query_array(origem.snap, '$.keyvalue()')), 0)
       > COALESCE(jsonb_array_length(jsonb_path_query_array(ep.ficha_snapshot, '$.keyvalue()')), 0);