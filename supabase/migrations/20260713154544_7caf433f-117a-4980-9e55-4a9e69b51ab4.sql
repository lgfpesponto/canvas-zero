
-- 1) comprar_estoque: status inicial 'Em aberto'
CREATE OR REPLACE FUNCTION public.comprar_estoque(_items jsonb, _vendedor text, _cliente text, _whatsapp text, _numero_pedido text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_extra jsonb;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id  uuid;
  v_row public.estoque_produtos%ROWTYPE;
  v_qtd integer;
  v_preco_unit numeric;
  v_extras_for_this_unit jsonb;
  v_extras_sum numeric;
  v_total_preco numeric := 0;
  v_total_qtd integer := 0;
  v_botas jsonb := '[]'::jsonb;
  v_origem_ids jsonb := '[]'::jsonb;
  v_foto text := NULL;
  v_ficha jsonb := NULL;
  v_nome text := NULL;
  v_order_id uuid;
  v_existing_numero uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NAO_AUTENTICADO'; END IF;

  IF has_role(v_uid, 'admin_producao'::app_role)
     AND NOT has_role(v_uid, 'admin_master'::app_role)
     AND NOT has_role(v_uid, 'vendedor'::app_role)
     AND NOT has_role(v_uid, 'vendedor_comissao'::app_role) THEN
    RAISE EXCEPTION 'PERMISSAO_NEGADA: admin_producao nao pode vender estoque';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'ITENS_VAZIOS';
  END IF;
  IF _vendedor IS NULL OR length(trim(_vendedor)) = 0 THEN RAISE EXCEPTION 'VENDEDOR_OBRIGATORIO'; END IF;
  IF _numero_pedido IS NULL OR length(trim(_numero_pedido)) = 0 THEN RAISE EXCEPTION 'NUMERO_OBRIGATORIO'; END IF;

  SELECT id INTO v_existing_numero FROM public.orders WHERE numero = _numero_pedido LIMIT 1;
  IF v_existing_numero IS NOT NULL THEN RAISE EXCEPTION 'NUMERO_DUPLICADO: %', _numero_pedido; END IF;

  SELECT array_agg(DISTINCT (item->>'produto_id')::uuid ORDER BY (item->>'produto_id')::uuid)
    INTO v_ids FROM jsonb_array_elements(_items) item;

  PERFORM 1 FROM public.estoque_produtos WHERE id = ANY(v_ids) ORDER BY id FOR UPDATE;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_id := (v_item->>'produto_id')::uuid;
    v_qtd := COALESCE((v_item->>'quantidade')::integer, 1);
    v_preco_unit := COALESCE((v_item->>'preco_unit')::numeric, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_row FROM public.estoque_produtos WHERE id = v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUTO_NAO_ENCONTRADO: %', v_id; END IF;
    IF v_row.quantidade < v_qtd THEN
      RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:%:%:%', v_row.sku_base, v_row.tamanho, v_row.quantidade;
    END IF;

    UPDATE public.estoque_produtos
       SET quantidade = quantidade - v_qtd, updated_at = now()
     WHERE id = v_id AND quantidade >= v_qtd;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:%:%:0', v_row.sku_base, v_row.tamanho;
    END IF;

    IF v_foto IS NULL THEN v_foto := v_row.foto_url; END IF;
    IF v_ficha IS NULL THEN v_ficha := v_row.ficha_snapshot; END IF;
    IF v_nome IS NULL THEN v_nome := v_row.nome; END IF;

    FOR i IN 1..v_qtd LOOP
      v_extras_for_this_unit := '[]'::jsonb;
      IF v_item ? 'extras_por_unidade'
         AND jsonb_typeof(v_item->'extras_por_unidade') = 'array'
         AND jsonb_array_length(v_item->'extras_por_unidade') >= i THEN
        v_extras_for_this_unit := COALESCE((v_item->'extras_por_unidade')->(i-1), '[]'::jsonb);
        IF jsonb_typeof(v_extras_for_this_unit) <> 'array' THEN
          v_extras_for_this_unit := '[]'::jsonb;
        END IF;
      END IF;

      v_extras_sum := 0;
      FOR v_extra IN SELECT * FROM jsonb_array_elements(v_extras_for_this_unit) LOOP
        v_extras_sum := v_extras_sum + COALESCE((v_extra->>'preco')::numeric, 0);
      END LOOP;

      v_botas := v_botas || jsonb_build_array(jsonb_build_object(
        'descricaoProduto', COALESCE(v_item->>'descricao', v_row.nome) || ' — Tam ' || v_row.tamanho,
        'valorManual', v_preco_unit::text,
        'quantidade', '1',
        'extras', v_extras_for_this_unit,
        'sku', v_row.sku_base,
        'tamanho', v_row.tamanho,
        'estoque_produto_id', v_row.id
      ));

      v_total_preco := v_total_preco + v_preco_unit + v_extras_sum;
      v_total_qtd := v_total_qtd + 1;
    END LOOP;

    v_origem_ids := v_origem_ids || jsonb_build_array(v_row.id::text);
  END LOOP;

  IF v_total_qtd = 0 THEN RAISE EXCEPTION 'NENHUM_ITEM_VALIDO'; END IF;

  INSERT INTO public.orders (
    user_id, numero, vendedor, cliente, cliente_whatsapp,
    tamanho, modelo, solado, formato_bico, cor_vira,
    couro_gaspea, couro_cano, couro_taloneira,
    bordado_cano, bordado_gaspea, bordado_taloneira,
    personalizacao_nome, personalizacao_bordado,
    cor_linha, cor_borrachinha, trisce, tiras, metais, acessorios, desenvolvimento,
    sob_medida, observacao, quantidade, preco, preco_migrado_v2,
    tem_laser, fotos, tipo_extra, extra_detalhes,
    numero_pedido_bota, status, data_criacao, hora_criacao, historico
  ) VALUES (
    v_uid,
    _numero_pedido, _vendedor, COALESCE(NULLIF(trim(_cliente), ''), ''),
    NULLIF(trim(_whatsapp), ''),
    '-', 'Extra — Bota Pronta Entrega (Estoque)', '-', '-', '-',
    '-', '-', '-', '-', '-', '-', '-', '-',
    '-', '-', '-', '-', '-', '-', '-',
    false, '', v_total_qtd, v_total_preco, true,
    false, '[]'::jsonb, 'bota_pronta_entrega',
    jsonb_build_object(
      'botas', v_botas, 'origem_estoque', true, 'estoque_origem_ids', v_origem_ids,
      'foto_url', v_foto, 'ficha_snapshot', v_ficha, 'nome_produto_estoque', v_nome
    ),
    _numero_pedido,
    'Em aberto',
    to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
    to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Em aberto',
      'descricao', 'Pedido criado a partir do Estoque (' || v_total_qtd || ' par(es))',
      'usuario', COALESCE(public.current_user_nome_completo(), _vendedor)
    ))
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'ok', true, 'order_id', v_order_id, 'numero', _numero_pedido,
    'total_qtd', v_total_qtd, 'total_preco', v_total_preco
  );
END;
$function$;

-- 2) comprar_estoque_bagy: status inicial 'Em aberto'
CREATE OR REPLACE FUNCTION public.comprar_estoque_bagy(
  _items jsonb, _vendedor text, _cliente text, _whatsapp text, _numero_pedido text,
  _bagy_order_id text, _user_id uuid,
  _cpf_cnpj text DEFAULT NULL, _forma_pagamento text DEFAULT NULL, _bagy_created_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb; v_id uuid; v_row public.estoque_produtos%ROWTYPE;
  v_qtd integer; v_preco_unit numeric;
  v_total_preco numeric := 0; v_total_qtd integer := 0;
  v_botas jsonb := '[]'::jsonb; v_origem_ids jsonb := '[]'::jsonb;
  v_foto text := NULL; v_ficha jsonb := NULL; v_nome text := NULL;
  v_order_id uuid; v_existing uuid;
  v_data_criacao text; v_hora_criacao text;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'ITENS_VAZIOS';
  END IF;

  SELECT id INTO v_existing FROM public.orders
   WHERE numero = _numero_pedido OR (bagy_order_id IS NOT NULL AND bagy_order_id = _bagy_order_id)
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'order_id', v_existing, 'numero', _numero_pedido, 'already_existed', true);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_id := (v_item->>'produto_id')::uuid;
    v_qtd := COALESCE((v_item->>'quantidade')::integer, 1);
    v_preco_unit := COALESCE((v_item->>'preco_unit')::numeric, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_row FROM public.estoque_produtos WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUTO_NAO_ENCONTRADO: %', v_id; END IF;
    IF v_row.quantidade < v_qtd THEN
      RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:%:%:%', v_row.sku_base, v_row.tamanho, v_row.quantidade;
    END IF;

    UPDATE public.estoque_produtos SET quantidade = quantidade - v_qtd, updated_at = now()
     WHERE id = v_id AND quantidade >= v_qtd;

    IF v_foto IS NULL THEN v_foto := v_row.foto_url; END IF;
    IF v_ficha IS NULL THEN v_ficha := v_row.ficha_snapshot; END IF;
    IF v_nome IS NULL THEN v_nome := v_row.nome; END IF;

    FOR i IN 1..v_qtd LOOP
      v_botas := v_botas || jsonb_build_array(jsonb_build_object(
        'descricaoProduto', COALESCE(v_item->>'descricao', v_row.nome) || ' — Tam ' || v_row.tamanho,
        'valorManual', v_preco_unit::text, 'quantidade', '1', 'extras', '[]'::jsonb,
        'sku', v_row.sku_base, 'tamanho', v_row.tamanho, 'estoque_produto_id', v_row.id
      ));
      v_total_preco := v_total_preco + v_preco_unit;
      v_total_qtd := v_total_qtd + 1;
    END LOOP;
    v_origem_ids := v_origem_ids || jsonb_build_array(v_row.id::text);
  END LOOP;

  IF v_total_qtd = 0 THEN RAISE EXCEPTION 'NENHUM_ITEM_VALIDO'; END IF;

  IF _bagy_created_at IS NOT NULL THEN
    v_data_criacao := to_char((_bagy_created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD');
    v_hora_criacao := to_char(_bagy_created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  ELSE
    v_data_criacao := to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD');
    v_hora_criacao := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  END IF;

  INSERT INTO public.orders (
    user_id, numero, vendedor, cliente, cliente_whatsapp,
    cliente_cpf_cnpj, forma_pagamento,
    tamanho, modelo, solado, formato_bico, cor_vira,
    couro_gaspea, couro_cano, couro_taloneira,
    bordado_cano, bordado_gaspea, bordado_taloneira,
    personalizacao_nome, personalizacao_bordado,
    cor_linha, cor_borrachinha, trisce, tiras, metais, acessorios, desenvolvimento,
    sob_medida, observacao, quantidade, preco, preco_migrado_v2,
    tem_laser, fotos, tipo_extra, extra_detalhes,
    numero_pedido_bota, status, data_criacao, hora_criacao, historico, bagy_order_id
  ) VALUES (
    _user_id, _numero_pedido, _vendedor, COALESCE(NULLIF(trim(_cliente), ''), ''), NULLIF(trim(_whatsapp), ''),
    NULLIF(trim(COALESCE(_cpf_cnpj,'')), ''), NULLIF(trim(COALESCE(_forma_pagamento,'')), ''),
    '-', 'Extra — Bota Pronta Entrega (Estoque)', '-', '-', '-',
    '-', '-', '-', '-', '-', '-', '-', '-',
    '-', '-', '-', '-', '-', '-', '-',
    false, 'Pedido importado da loja Bagy', v_total_qtd, v_total_preco, true,
    false, '[]'::jsonb, 'bota_pronta_entrega',
    jsonb_build_object(
      'botas', v_botas, 'origem_estoque', true, 'origem_bagy', true,
      'estoque_origem_ids', v_origem_ids,
      'foto_url', v_foto, 'ficha_snapshot', v_ficha, 'nome_produto_estoque', v_nome
    ),
    _numero_pedido, 'Em aberto', v_data_criacao, v_hora_criacao,
    jsonb_build_array(jsonb_build_object(
      'data', v_data_criacao, 'hora', v_hora_criacao,
      'local', 'Em aberto',
      'descricao', 'Pedido importado da Bagy (' || v_total_qtd || ' par(es))',
      'usuario', 'webhook-bagy'
    )),
    _bagy_order_id
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'numero', _numero_pedido,
    'total_qtd', v_total_qtd, 'total_preco', v_total_preco);
END;
$$;

REVOKE ALL ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid, text, text, timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid, text, text, timestamptz) TO service_role;

-- 3) Excluir produto inteiro do Estoque (todos os tamanhos) - admin_master/admin_producao
CREATE OR REPLACE FUNCTION public.excluir_estoque_produto_completo(_sku_base text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pedidos_liberados int := 0;
  v_tamanhos_removidos int := 0;
  v_nome text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NAO_AUTENTICADO'; END IF;
  IF NOT (has_role(v_uid,'admin_master'::app_role) OR has_role(v_uid,'admin_producao'::app_role)) THEN
    RAISE EXCEPTION 'PERMISSAO_NEGADA: apenas admin master ou producao podem excluir produtos do estoque';
  END IF;
  IF _sku_base IS NULL OR length(trim(_sku_base)) = 0 THEN
    RAISE EXCEPTION 'SKU_OBRIGATORIO';
  END IF;

  SELECT nome INTO v_nome FROM public.estoque_produtos
    WHERE sku_base = _sku_base LIMIT 1;

  -- Libera pedidos ligados a qualquer tamanho desse produto
  UPDATE public.orders
     SET estoque_baixado = false,
         estoque_produto_id = NULL,
         historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
           'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
           'local', status,
           'descricao', format('Produto de estoque excluído (%s) - pedido liberado para recriar estoque', COALESCE(v_nome, _sku_base)),
           'usuario', COALESCE(public.current_user_nome_completo(),'Admin')
         ))
   WHERE estoque_produto_id IN (SELECT id FROM public.estoque_produtos WHERE sku_base = _sku_base);
  GET DIAGNOSTICS v_pedidos_liberados = ROW_COUNT;

  -- Log dos ajustes por tamanho antes de remover
  INSERT INTO public.estoque_ajustes_log (produto_id, produto_nome, sku_base, tamanho, delta, quantidade_antes, quantidade_depois, motivo, usuario_id, usuario_nome)
  SELECT id, nome, sku_base, tamanho, -quantidade, quantidade, 0, 'Exclusão total do produto', v_uid, public.current_user_nome_completo()
    FROM public.estoque_produtos WHERE sku_base = _sku_base;

  DELETE FROM public.estoque_produtos WHERE sku_base = _sku_base;
  GET DIAGNOSTICS v_tamanhos_removidos = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'sku_base', _sku_base,
    'tamanhos_removidos', v_tamanhos_removidos,
    'pedidos_liberados', v_pedidos_liberados
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.excluir_estoque_produto_completo(text) TO authenticated;

-- 4) Backfill: re-enfileira produtos ativos que ainda não sincronizaram
INSERT INTO public.bagy_stock_sync_queue (estoque_produto_id, sku, novo_saldo)
SELECT id, sku_base, COALESCE(quantidade, 0)
  FROM public.estoque_produtos
 WHERE ativo = true
   AND sku_base IS NOT NULL
   AND length(trim(sku_base)) > 0
   AND (bagy_sync_status IS DISTINCT FROM 'ok' OR bagy_sync_at IS NULL)
ON CONFLICT (estoque_produto_id) WHERE processado_em IS NULL
DO UPDATE SET novo_saldo = EXCLUDED.novo_saldo, criado_em = now(), tentativas = 0, ultimo_erro = NULL;
