
-- ============= Integração Bagy: tabelas, colunas e RPCs =============

-- 1) Colunas novas em order_templates
ALTER TABLE public.order_templates
  ADD COLUMN IF NOT EXISTS sku TEXT NULL,
  ADD COLUMN IF NOT EXISTS genero TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_order_templates_sku
  ON public.order_templates ((LOWER(sku))) WHERE sku IS NOT NULL;

-- 2) Coluna em orders pra ligar com pedido Bagy
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bagy_order_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_bagy_order_id
  ON public.orders (bagy_order_id) WHERE bagy_order_id IS NOT NULL;

-- 3) Tabela bagy_pedidos
CREATE TABLE IF NOT EXISTS public.bagy_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bagy_order_id TEXT NOT NULL UNIQUE,
  numero_bagy TEXT NOT NULL,
  status_bagy TEXT NOT NULL,
  status_bagy_anterior TEXT NULL,
  cliente_nome TEXT NULL,
  cliente_doc TEXT NULL,
  cliente_email TEXT NULL,
  cliente_whats TEXT NULL,
  endereco JSONB NULL,
  total NUMERIC(12,2) NULL,
  frete NUMERIC(12,2) NULL,
  desconto NUMERIC(12,2) NULL,
  pagamento TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_id_portal UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  flag TEXT NULL,
  erro TEXT NULL,
  processado_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bagy_pedidos TO authenticated;
GRANT ALL ON public.bagy_pedidos TO service_role;

ALTER TABLE public.bagy_pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bagy_pedidos_select_authorized" ON public.bagy_pedidos
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR has_role(auth.uid(), 'admin_producao'::app_role)
    OR has_role(auth.uid(), 'vendedor_comissao'::app_role)
  );

CREATE POLICY "bagy_pedidos_update_admin" ON public.bagy_pedidos
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- 4) Tabela bagy_pedido_itens
CREATE TABLE IF NOT EXISTS public.bagy_pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.bagy_pedidos(id) ON DELETE CASCADE,
  sku TEXT NULL,
  nome_produto TEXT NULL,
  variacao_nome TEXT NULL,
  tamanho TEXT NULL,
  cor TEXT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unit NUMERIC(12,2) NULL,
  foto_url TEXT NULL,
  estoque_produto_id UUID NULL,
  template_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  -- pendente | pedido_criado | aguardando_ficha | sem_mapeamento | sem_estoque | ficha_gerada
  order_id_portal UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bagy_pedido_itens_pedido ON public.bagy_pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_bagy_pedido_itens_sku ON public.bagy_pedido_itens ((LOWER(sku))) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bagy_pedido_itens_status ON public.bagy_pedido_itens (status);

GRANT SELECT ON public.bagy_pedido_itens TO authenticated;
GRANT ALL ON public.bagy_pedido_itens TO service_role;

ALTER TABLE public.bagy_pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bagy_pedido_itens_select_authorized" ON public.bagy_pedido_itens
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin_master'::app_role)
    OR has_role(auth.uid(), 'admin_producao'::app_role)
    OR has_role(auth.uid(), 'vendedor_comissao'::app_role)
  );

CREATE POLICY "bagy_pedido_itens_update_admin" ON public.bagy_pedido_itens
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- 5) Webhook log (idempotência)
CREATE TABLE IF NOT EXISTS public.bagy_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NULL,
  bagy_order_id TEXT NULL,
  signature TEXT NULL,
  payload_hash TEXT NULL,
  payload JSONB NOT NULL,
  processed_em TIMESTAMPTZ NULL,
  erro TEXT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bagy_webhook_log_order ON public.bagy_webhook_log (bagy_order_id);
CREATE INDEX IF NOT EXISTS idx_bagy_webhook_log_hash ON public.bagy_webhook_log (payload_hash);

GRANT SELECT ON public.bagy_webhook_log TO authenticated;
GRANT ALL ON public.bagy_webhook_log TO service_role;

ALTER TABLE public.bagy_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bagy_webhook_log_select_admin" ON public.bagy_webhook_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- 6) Fila de sync Portal -> Bagy
CREATE TABLE IF NOT EXISTS public.bagy_status_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bagy_order_id TEXT NOT NULL,
  target_status TEXT NOT NULL,
  tracking_code TEXT NULL,
  tracking_url TEXT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT NULL,
  processado_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bagy_status_sync_pending
  ON public.bagy_status_sync_queue (created_at)
  WHERE processado_em IS NULL;

GRANT SELECT ON public.bagy_status_sync_queue TO authenticated;
GRANT ALL ON public.bagy_status_sync_queue TO service_role;

ALTER TABLE public.bagy_status_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bagy_status_sync_select_admin" ON public.bagy_status_sync_queue
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- 7) Trigger updated_at
CREATE OR REPLACE FUNCTION public.bagy_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_bagy_pedidos_updated ON public.bagy_pedidos;
CREATE TRIGGER trg_bagy_pedidos_updated BEFORE UPDATE ON public.bagy_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.bagy_touch_updated_at();

DROP TRIGGER IF EXISTS trg_bagy_pedido_itens_updated ON public.bagy_pedido_itens;
CREATE TRIGGER trg_bagy_pedido_itens_updated BEFORE UPDATE ON public.bagy_pedido_itens
  FOR EACH ROW EXECUTE FUNCTION public.bagy_touch_updated_at();

-- 8) RPC variante service-role do comprar_estoque (executado pelo edge function)
CREATE OR REPLACE FUNCTION public.comprar_estoque_bagy(
  _items jsonb,
  _vendedor text,
  _cliente text,
  _whatsapp text,
  _numero_pedido text,
  _bagy_order_id text,
  _user_id uuid
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
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'ITENS_VAZIOS';
  END IF;

  -- Idempotência: se já existe pedido com esse numero ou bagy_order_id, retorna ele
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

  INSERT INTO public.orders (
    user_id, numero, vendedor, cliente, cliente_whatsapp,
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
    to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
    to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
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

REVOKE ALL ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.comprar_estoque_bagy(jsonb, text, text, text, text, text, uuid) TO service_role;

-- 9) RPC para enfileirar mudança de status (chamado por trigger ou edge)
CREATE OR REPLACE FUNCTION public.bagy_enqueue_status(
  _bagy_order_id text, _target_status text, _tracking_code text DEFAULT NULL, _tracking_url text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid;
BEGIN
  IF _bagy_order_id IS NULL OR length(trim(_bagy_order_id)) = 0 THEN RETURN NULL; END IF;
  INSERT INTO public.bagy_status_sync_queue (bagy_order_id, target_status, tracking_code, tracking_url)
  VALUES (_bagy_order_id, _target_status, _tracking_code, _tracking_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.bagy_enqueue_status(text, text, text, text) TO authenticated, service_role;
