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
  IF NOT COALESCE(flag_ativa, true) THEN RETURN 0; END IF;

  -- 1) Pedidos sem valor (erro/devolução) vão direto para Pago, sem consumir saldo
  FOR ped IN
    SELECT o.id
    FROM public.orders o
    WHERE o.vendedor = _vendedor AND o.status = 'Cobrado'
      AND COALESCE(o.preco, 0) <= 0
  LOOP
    hist_entry := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Pago',
      'descricao', 'Pedido sem valor (erro/devolução) movido para Pago automaticamente',
      'usuario', 'Baixa automática'
    );
    PERFORM set_config('app.allow_status_pago','1', true);
    UPDATE public.orders
       SET status = 'Pago',
           historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
     WHERE id = ped.id AND status = 'Cobrado';
    PERFORM set_config('app.allow_status_pago','0', true);
    baixadas := baixadas + 1;
  END LOOP;

  saldo := COALESCE(saldo_atual_revendedor(_vendedor), 0);

  -- 2) Pedidos com valor: baixa pelo saldo disponível (FIFO)
  FOR ped IN
    SELECT o.id, o.preco, o.quantidade, o.data_criacao, o.created_at
    FROM public.orders o
    WHERE o.vendedor = _vendedor AND o.status = 'Cobrado'
      AND COALESCE(o.preco, 0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
    ORDER BY o.data_criacao ASC, o.created_at ASC
  LOOP
    valor_p := COALESCE(ped.preco, 0);

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

      PERFORM set_config('app.allow_status_pago','1', true);
      UPDATE public.orders
         SET status = 'Pago',
             historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
       WHERE id = ped.id AND status = 'Cobrado';
      PERFORM set_config('app.allow_status_pago','0', true);

      saldo := saldo - valor_p;
      baixadas := baixadas + 1;
    ELSE EXIT;
    END IF;
  END LOOP;

  RETURN baixadas;
END;
$function$;