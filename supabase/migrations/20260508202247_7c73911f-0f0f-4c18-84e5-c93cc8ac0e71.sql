
-- 1. Coluna de controle do backfill (default false: pedidos antigos precisam ser migrados)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preco_migrado_v2 boolean NOT NULL DEFAULT false;

-- 2. RPCs que faziam preco × quantidade - desconto agora leem preco direto

-- get_orders_totals (versão sem _conferido) — DROP e recria
DROP FUNCTION IF EXISTS public.get_orders_totals(text, text, text, text[], text[], text[], uuid[]);

-- get_orders_totals (versão com _conferido) — substitui a fórmula
CREATE OR REPLACE FUNCTION public.get_orders_totals(
  _search text DEFAULT NULL::text,
  _date_from text DEFAULT NULL::text,
  _date_to text DEFAULT NULL::text,
  _status text[] DEFAULT NULL::text[],
  _produtos text[] DEFAULT NULL::text[],
  _vendedores text[] DEFAULT NULL::text[],
  _ids_mudou uuid[] DEFAULT NULL::uuid[],
  _conferido text DEFAULT NULL::text
)
 RETURNS TABLE(total_pedidos bigint, total_produtos bigint, valor_total numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT o.preco, o.quantidade, o.tipo_extra, o.extra_detalhes
    FROM public.orders o
    WHERE
      (_ids_mudou IS NULL OR o.id = ANY(_ids_mudou))
      AND (
        _search IS NULL OR _search = ''
        OR o.numero ILIKE '%' || _search || '%'
        OR o.cliente ILIKE '%' || _search || '%'
      )
      AND (_date_from IS NULL OR o.data_criacao >= _date_from)
      AND (_date_to   IS NULL OR o.data_criacao <= _date_to)
      AND (
        _status IS NULL OR array_length(_status, 1) IS NULL
        OR o.status = ANY(_status)
      )
      AND (
        _produtos IS NULL OR array_length(_produtos, 1) IS NULL
        OR (
          ('bota' = ANY(_produtos) AND o.tipo_extra IS NULL)
          OR o.tipo_extra = ANY(_produtos)
        )
      )
      AND (
        _vendedores IS NULL OR array_length(_vendedores, 1) IS NULL
        OR o.vendedor = ANY(_vendedores)
        OR (o.vendedor = 'Juliana Cristina Ribeiro' AND o.cliente = ANY(_vendedores))
      )
      AND (
        _conferido IS NULL
        OR (_conferido = 'sim' AND o.conferido = true)
        OR (_conferido = 'nao' AND o.conferido = false)
      )
  )
  SELECT
    COUNT(*)::bigint AS total_pedidos,
    COALESCE(SUM(
      CASE
        WHEN tipo_extra = 'bota_pronta_entrega'
         AND jsonb_typeof(extra_detalhes->'botas') = 'array'
         AND jsonb_array_length(extra_detalhes->'botas') > 0
          THEN jsonb_array_length(extra_detalhes->'botas')
        ELSE COALESCE(quantidade, 1)
      END
    ), 0)::bigint AS total_produtos,
    COALESCE(SUM(COALESCE(preco, 0)), 0)::numeric AS valor_total
  FROM filtered;
$function$;

-- get_pending_value
CREATE OR REPLACE FUNCTION public.get_pending_value(vendor text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(COALESCE(preco, 0)), 0)
  FROM orders
  WHERE status IN ('Conferido', 'Cobrado')
    AND (vendor IS NULL OR vendedor = vendor);
$function$;

-- tentar_baixa_automatica — usa preco direto
CREATE OR REPLACE FUNCTION public.tentar_baixa_automatica(_vendedor text, _admin_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  saldo numeric;
  ped record;
  valor_p numeric;
  novo_mov_id uuid;
  baixadas integer := 0;
  hist_entry jsonb;
  flag_ativa boolean;
BEGIN
  SELECT value INTO flag_ativa FROM public.system_flags WHERE key = 'baixa_automatica_ativa';
  IF NOT COALESCE(flag_ativa, true) THEN
    RETURN 0;
  END IF;

  saldo := COALESCE(saldo_atual_revendedor(_vendedor), 0);

  FOR ped IN
    SELECT o.id, o.preco, o.quantidade, o.data_criacao, o.created_at
    FROM public.orders o
    WHERE o.vendedor = _vendedor
      AND o.status = 'Cobrado'
      AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
    ORDER BY o.data_criacao ASC, o.created_at ASC
  LOOP
    valor_p := COALESCE(ped.preco, 0);
    IF valor_p <= 0 THEN CONTINUE; END IF;

    IF saldo >= valor_p THEN
      INSERT INTO public.revendedor_saldo_movimentos
        (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
      VALUES
        (_vendedor, 'baixa_pedido', valor_p, 'Baixa automática de pedido cobrado',
         ped.id, saldo, saldo - valor_p, _admin_id)
      RETURNING id INTO novo_mov_id;

      INSERT INTO public.revendedor_baixas_pedido
        (order_id, vendedor, valor_pedido, movimento_id)
      VALUES (ped.id, _vendedor, valor_p, novo_mov_id);

      hist_entry := jsonb_build_object(
        'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
        'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
        'local', 'Pago',
        'descricao', 'Pedido movido para Pago',
        'usuario', 'Baixa automática'
      );

      UPDATE public.orders
         SET status = 'Pago',
             historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
       WHERE id = ped.id
         AND status = 'Cobrado';

      saldo := saldo - valor_p;
      baixadas := baixadas + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN baixadas;
END;
$function$;

-- quitar_pedidos_historico — usa preco direto
CREATE OR REPLACE FUNCTION public.quitar_pedidos_historico(_order_ids uuid[], _motivo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ped record;
  saldo_ant numeric;
  novo_mov_id uuid;
  valor_p numeric;
  quitados integer := 0;
  pulados integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode quitar pedidos como histórico';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;
  IF _order_ids IS NULL OR array_length(_order_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um pedido';
  END IF;

  FOR ped IN
    SELECT o.id, o.vendedor, o.preco, o.quantidade
    FROM public.orders o
    WHERE o.id = ANY(_order_ids)
      AND o.status = 'Cobrado'
  LOOP
    IF EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = ped.id) THEN
      pulados := pulados + 1;
      CONTINUE;
    END IF;

    valor_p := COALESCE(ped.preco, 0);
    IF valor_p <= 0 THEN
      pulados := pulados + 1;
      CONTINUE;
    END IF;

    saldo_ant := COALESCE(saldo_atual_revendedor(ped.vendedor), 0);

    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
    VALUES
      (ped.vendedor, 'ajuste_admin', valor_p,
       '[QUITAÇÃO HISTÓRICA] ' || _motivo,
       ped.id, saldo_ant, saldo_ant, auth.uid())
    RETURNING id INTO novo_mov_id;

    INSERT INTO public.revendedor_baixas_pedido
      (order_id, vendedor, valor_pedido, movimento_id)
    VALUES (ped.id, ped.vendedor, valor_p, novo_mov_id);

    quitados := quitados + 1;
  END LOOP;

  RETURN jsonb_build_object('quitados', quitados, 'pulados', pulados);
END;
$function$;

-- trg_orders_estorno_baixa_on_value_change — compara preco direto
CREATE OR REPLACE FUNCTION public.trg_orders_estorno_baixa_on_value_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  baixa record;
  saldo_ant numeric;
  novo_valor numeric;
  valor_baixado numeric;
  vendedor_mudou boolean;
  valor_mudou boolean;
BEGIN
  SELECT * INTO baixa FROM public.revendedor_baixas_pedido WHERE order_id = NEW.id LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  novo_valor := COALESCE(NEW.preco, 0);
  valor_baixado := baixa.valor_pedido;
  vendedor_mudou := (NEW.vendedor IS DISTINCT FROM baixa.vendedor);
  valor_mudou := (novo_valor <> valor_baixado);

  IF NOT vendedor_mudou AND NOT valor_mudou THEN
    RETURN NEW;
  END IF;

  saldo_ant := COALESCE(public.saldo_atual_revendedor(baixa.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (baixa.vendedor, 'estorno', valor_baixado,
     'Estorno automático: valor/vendedor do pedido alterado',
     NEW.id, saldo_ant, saldo_ant + valor_baixado, auth.uid());

  DELETE FROM public.revendedor_baixas_pedido WHERE id = baixa.id;

  NEW.status := 'Cobrado';
  NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Cobrado',
      'descricao', 'Estorno automático: valor/vendedor alterado (R$ ' || to_char(valor_baixado, 'FM999G990D00') || ' devolvido ao saldo)',
      'usuario', COALESCE(public.current_user_nome_completo(), 'Sistema')
    )
  );

  RETURN NEW;
END;
$function$;
