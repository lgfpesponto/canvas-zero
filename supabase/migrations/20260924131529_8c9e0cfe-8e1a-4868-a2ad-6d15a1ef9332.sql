CREATE OR REPLACE FUNCTION public.tentar_baixa_automatica(_vendedor text, _admin_id uuid DEFAULT NULL::uuid, _snapshot_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  saldo numeric;
  ped record;
  lote record;
  valor_p numeric;
  novo_mov_id uuid;
  baixadas integer := 0;
  hist_entry jsonb;
  flag_ativa boolean;
BEGIN
  SELECT value INTO flag_ativa FROM public.system_flags WHERE key = 'baixa_automatica_ativa';
  IF NOT COALESCE(flag_ativa, true) THEN RETURN 0; END IF;

  saldo := COALESCE(saldo_atual_revendedor(_vendedor), 0);

  -- 1) Pedidos com valor, na ordem:
  --    a) lote de cobranca escolhido no comprovante
  --    b) demais lotes de cobranca, do mais antigo para o mais novo (transbordo)
  --    c) pedidos avulsos (fora de qualquer relatorio), do mais antigo para o mais novo
  FOR ped IN
    WITH lotes AS (
      SELECT s.id, s.gerado_em, s.order_ids
      FROM public.pdf_snapshots s
      WHERE s.tipo = 'cobranca'
        AND COALESCE(s.filtros->>'vendedor', '') = _vendedor
    ),
    pedidos AS (
      SELECT o.id, o.preco, o.data_criacao, o.created_at
      FROM public.orders o
      WHERE o.vendedor = _vendedor AND o.status = 'Cobrado'
        AND COALESCE(o.preco, 0) > 0
        AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
    )
    SELECT p.id, p.preco,
           (SELECT MIN(l.gerado_em) FROM lotes l WHERE p.id = ANY (l.order_ids)) AS lote_em,
           EXISTS (SELECT 1 FROM lotes l WHERE l.id = _snapshot_id AND p.id = ANY (l.order_ids)) AS no_lote_alvo
    FROM pedidos p
    ORDER BY no_lote_alvo DESC,
             lote_em ASC NULLS LAST,
             p.data_criacao ASC, p.created_at ASC
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
    ELSE
      CONTINUE;
    END IF;
  END LOOP;

  -- 2) Pedidos sem valor (erro/devolucao): so vao para Pago quando TODO o lote
  --    de cobranca ao qual pertencem estiver quitado (nenhum pedido com valor
  --    do lote continua em Cobrado).
  FOR lote IN
    SELECT s.id, s.gerado_em, s.order_ids
    FROM public.pdf_snapshots s
    WHERE s.tipo = 'cobranca'
      AND COALESCE(s.filtros->>'vendedor', '') = _vendedor
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = ANY (s.order_ids) AND o.status = 'Cobrado'
          AND COALESCE(o.preco, 0) <= 0
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = ANY (s.order_ids) AND o.status = 'Cobrado'
          AND COALESCE(o.preco, 0) > 0
      )
  LOOP
    hist_entry := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Pago',
      'descricao', 'Lote de cobrança de ' || to_char(lote.gerado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
                   || ' quitado integralmente — pedido de erro liberado para Pago',
      'usuario', 'Baixa automática'
    );
    PERFORM set_config('app.allow_status_pago','1', true);
    UPDATE public.orders o
       SET status = 'Pago',
           historico = COALESCE(o.historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
     WHERE o.id = ANY (lote.order_ids)
       AND o.status = 'Cobrado'
       AND COALESCE(o.preco, 0) <= 0;
    GET DIAGNOSTICS valor_p = ROW_COUNT;
    PERFORM set_config('app.allow_status_pago','0', true);
    baixadas := baixadas + COALESCE(valor_p, 0)::int;
  END LOOP;

  RETURN baixadas;
END;
$function$;