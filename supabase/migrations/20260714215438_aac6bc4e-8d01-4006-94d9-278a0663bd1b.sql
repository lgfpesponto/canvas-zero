
-- Helper: gera sufixo em letras (0->A, 25->Z, 26->AA, 27->AB, ...)
CREATE OR REPLACE FUNCTION public.bagy_letter_suffix(_index integer)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_n integer := _index;
  v_out text := '';
BEGIN
  IF _index < 0 THEN RETURN ''; END IF;
  LOOP
    v_out := chr(65 + (v_n % 26)) || v_out;
    v_n := (v_n / 26) - 1;
    EXIT WHEN v_n < 0;
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.bagy_letter_suffix(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bagy_letter_suffix(integer) TO service_role;

-- RPC: cria 1 pedido por par. Assinatura preservada.
CREATE OR REPLACE FUNCTION public.comprar_estoque_bagy(
  _items jsonb, _vendedor text, _cliente text, _whatsapp text, _numero_pedido text,
  _bagy_order_id text, _user_id uuid,
  _cpf_cnpj text DEFAULT NULL, _forma_pagamento text DEFAULT NULL, _bagy_created_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_row public.estoque_produtos%ROWTYPE;
  v_qtd integer;
  v_preco_unit numeric;
  v_desc text;
  v_total_units integer := 0;
  v_existing_ids uuid[];
  v_existing_nums text[];
  v_data_criacao text;
  v_hora_criacao text;
  v_idx integer := 0;
  v_numero text;
  v_new_id uuid;
  v_new_ids uuid[] := ARRAY[]::uuid[];
  v_new_nums text[] := ARRAY[]::text[];
  v_bota jsonb;
  v_total_preco numeric := 0;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'ITENS_VAZIOS';
  END IF;

  -- Idempotência: se já existem pedidos para este bagy_order_id ou este número base,
  -- retorna os já existentes.
  SELECT array_agg(id ORDER BY numero), array_agg(numero ORDER BY numero)
    INTO v_existing_ids, v_existing_nums
    FROM public.orders
   WHERE (bagy_order_id IS NOT NULL AND bagy_order_id = _bagy_order_id)
      OR numero = _numero_pedido
      OR numero LIKE (_numero_pedido || '_')
      OR numero LIKE (_numero_pedido || '__');
  IF v_existing_ids IS NOT NULL AND array_length(v_existing_ids, 1) > 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_existed', true,
      'order_id', v_existing_ids[1],
      'order_ids', to_jsonb(v_existing_ids),
      'numero', v_existing_nums[1],
      'numeros', to_jsonb(v_existing_nums)
    );
  END IF;

  -- Total de pares a criar
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qtd := COALESCE((v_item->>'quantidade')::integer, 1);
    IF v_qtd > 0 THEN
      v_total_units := v_total_units + v_qtd;
    END IF;
  END LOOP;
  IF v_total_units = 0 THEN RAISE EXCEPTION 'NENHUM_ITEM_VALIDO'; END IF;

  IF _bagy_created_at IS NOT NULL THEN
    v_data_criacao := to_char((_bagy_created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD');
    v_hora_criacao := to_char(_bagy_created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  ELSE
    v_data_criacao := to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD');
    v_hora_criacao := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  END IF;

  PERFORM set_config('app.skip_bagy_push', 'on', true);

  -- Loop principal: 1 pedido por par
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_id := (v_item->>'produto_id')::uuid;
    v_qtd := COALESCE((v_item->>'quantidade')::integer, 1);
    v_preco_unit := COALESCE((v_item->>'preco_unit')::numeric, 0);
    v_desc := COALESCE(v_item->>'descricao', '');
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_row FROM public.estoque_produtos WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUTO_NAO_ENCONTRADO: %', v_id; END IF;
    IF v_row.quantidade < v_qtd THEN
      RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE:%:%:%', v_row.sku_base, v_row.tamanho, v_row.quantidade;
    END IF;

    UPDATE public.estoque_produtos
       SET quantidade = quantidade - v_qtd, updated_at = now()
     WHERE id = v_id AND quantidade >= v_qtd;

    FOR i IN 1..v_qtd LOOP
      -- Sufixo por par: sem letra quando só 1 par; letras A..Z, AA,... quando >1
      IF v_total_units = 1 THEN
        v_numero := _numero_pedido;
      ELSE
        v_numero := _numero_pedido || public.bagy_letter_suffix(v_idx);
      END IF;

      v_bota := jsonb_build_array(jsonb_build_object(
        'descricaoProduto', COALESCE(NULLIF(v_desc, ''), v_row.nome) || ' — Tam ' || v_row.tamanho,
        'valorManual', v_preco_unit::text,
        'quantidade', '1',
        'extras', '[]'::jsonb,
        'sku', v_row.sku_base,
        'tamanho', v_row.tamanho,
        'estoque_produto_id', v_row.id
      ));

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
        numero_pedido_bota, status, data_criacao, hora_criacao, historico, bagy_order_id,
        lead_time_snapshot
      ) VALUES (
        _user_id, v_numero, _vendedor, COALESCE(NULLIF(trim(_cliente), ''), ''), NULLIF(trim(_whatsapp), ''),
        NULLIF(trim(COALESCE(_cpf_cnpj,'')), ''), NULLIF(trim(COALESCE(_forma_pagamento,'')), ''),
        '-', 'Extra — Bota Pronta Entrega (Estoque)', '-', '-', '-',
        '-', '-', '-', '-', '-', '-', '-', '-',
        '-', '-', '-', '-', '-', '-', '-',
        false, 'Pedido importado da loja Bagy', 1, v_preco_unit, true,
        false, '[]'::jsonb, 'bota_pronta_entrega',
        jsonb_build_object(
          'botas', v_bota,
          'origem_estoque', true,
          'origem_bagy', true,
          'bagy_grupo_numero_base', _numero_pedido,
          'bagy_par_index', v_idx,
          'bagy_par_total', v_total_units,
          'estoque_origem_ids', jsonb_build_array(v_row.id::text),
          'foto_url', v_row.foto_url,
          'ficha_snapshot', v_row.ficha_snapshot,
          'nome_produto_estoque', v_row.nome
        ),
        _numero_pedido, 'Em aberto', v_data_criacao, v_hora_criacao,
        jsonb_build_array(jsonb_build_object(
          'data', v_data_criacao, 'hora', v_hora_criacao,
          'local', 'Em aberto',
          'descricao', CASE WHEN v_total_units = 1
                          THEN 'Pedido importado da Bagy'
                          ELSE 'Pedido importado da Bagy (par ' || (v_idx+1) || ' de ' || v_total_units || ')'
                        END,
          'usuario', 'webhook-bagy'
        )),
        _bagy_order_id,
        1
      ) RETURNING id INTO v_new_id;

      v_new_ids := v_new_ids || v_new_id;
      v_new_nums := v_new_nums || v_numero;
      v_total_preco := v_total_preco + v_preco_unit;
      v_idx := v_idx + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_new_ids[1],
    'order_ids', to_jsonb(v_new_ids),
    'numero', v_new_nums[1],
    'numeros', to_jsonb(v_new_nums),
    'total_qtd', v_total_units,
    'total_preco', v_total_preco
  );
END;
$$;

REVOKE ALL ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid, text, text, timestamptz) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid, text, text, timestamptz) TO service_role;
