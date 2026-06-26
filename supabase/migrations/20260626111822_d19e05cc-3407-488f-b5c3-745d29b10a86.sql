
-- 1) bagy_pedidos: data/hora real da Bagy
ALTER TABLE public.bagy_pedidos
  ADD COLUMN IF NOT EXISTS bagy_created_at timestamptz;

-- Backfill: usa created_at quando o pedido for aprovado
UPDATE public.bagy_pedidos
   SET bagy_created_at = created_at
 WHERE bagy_created_at IS NULL;

-- Limpa pedidos antigos não aprovados (open/new/pending/canceled/archived/refunded etc)
DELETE FROM public.bagy_pedidos
 WHERE status_bagy NOT IN ('paid','approved','production','separated','shipped','delivered','completed');

-- 2) order_templates: foto e grade de tamanhos+SKU
ALTER TABLE public.order_templates
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS tamanhos_skus jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index pra busca por SKU dentro do array de tamanhos
CREATE INDEX IF NOT EXISTS idx_order_templates_tamanhos_skus
  ON public.order_templates USING gin (tamanhos_skus jsonb_path_ops);

-- 3) orders: CPF/CNPJ e forma de pagamento (preenchidos automaticamente p/ pedidos Bagy)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cliente_cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text;

-- 4) Atualiza RPC comprar_estoque_bagy aceitando dados extras
CREATE OR REPLACE FUNCTION public.comprar_estoque_bagy(
  _items jsonb,
  _vendedor text,
  _cliente text,
  _whatsapp text,
  _numero_pedido text,
  _bagy_order_id text,
  _user_id uuid,
  _cpf_cnpj text DEFAULT NULL,
  _forma_pagamento text DEFAULT NULL,
  _bagy_created_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_id uuid;
  v_row public.estoque_produtos%ROWTYPE;
  v_qtd integer;
  v_preco_unit numeric;
  v_total_preco numeric := 0;
  v_total_qtd integer := 0;
  v_botas jsonb := '[]'::jsonb;
  v_origem_ids jsonb := '[]'::jsonb;
  v_foto text := NULL;
  v_ficha jsonb := NULL;
  v_nome text := NULL;
  v_order_id uuid;
  v_existing uuid;
  v_data_criacao text;
  v_hora_criacao text;
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
        'valorManual', v_preco_unit::text,
        'quantidade', '1',
        'extras', '[]'::jsonb,
        'sku', v_row.sku_base,
        'tamanho', v_row.tamanho,
        'estoque_produto_id', v_row.id
      ));
      v_total_preco := v_total_preco + v_preco_unit;
      v_total_qtd := v_total_qtd + 1;
    END LOOP;
    v_origem_ids := v_origem_ids || jsonb_build_array(v_row.id::text);
  END LOOP;

  IF v_total_qtd = 0 THEN RAISE EXCEPTION 'NENHUM_ITEM_VALIDO'; END IF;

  -- Usa data/hora da Bagy quando disponível; senão, agora em SP
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
    _user_id,
    _numero_pedido, _vendedor, COALESCE(NULLIF(trim(_cliente), ''), ''), NULLIF(trim(_whatsapp), ''),
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
    _numero_pedido, 'Pendente',
    v_data_criacao,
    v_hora_criacao,
    jsonb_build_array(jsonb_build_object(
      'data', v_data_criacao,
      'hora', v_hora_criacao,
      'local', 'Pendente',
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
