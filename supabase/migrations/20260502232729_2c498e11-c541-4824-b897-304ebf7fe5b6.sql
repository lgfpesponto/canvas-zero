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
BEGIN
  saldo := COALESCE(saldo_atual_revendedor(_vendedor), 0);

  FOR ped IN
    SELECT o.id, o.preco, o.quantidade, o.data_criacao, o.created_at
    FROM public.orders o
    WHERE o.vendedor = _vendedor
      AND o.status = 'Cobrado'
      AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
    ORDER BY o.data_criacao ASC, o.created_at ASC
  LOOP
    valor_p := COALESCE(ped.preco, 0) * COALESCE(ped.quantidade, 1);
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

      -- Move o pedido para Pago e registra no histórico como "Baixa automática"
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
      EXIT; -- preserva FIFO
    END IF;
  END LOOP;

  RETURN baixadas;
END;
$function$;