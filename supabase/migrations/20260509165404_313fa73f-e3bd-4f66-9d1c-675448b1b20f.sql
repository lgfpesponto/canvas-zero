DO $$
DECLARE
  v_admin uuid := '4ae76415-8574-4c6f-8251-4dedf63d2d76';
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_rafael_comp uuid;
  v_denise_comp uuid;
  v_mov_id uuid;
  ped record;
  vendedores_reset text[] := ARRAY[
    'Rafael Silva',
    'Denise Garcia Feliciano',
    'Samuel Silva Plácido',
    'Larissa Silva',
    'Fabiana Silva'
  ];
BEGIN
  ALTER TABLE public.financeiro_a_receber DISABLE TRIGGER USER;
  ALTER TABLE public.revendedor_comprovantes DISABLE TRIGGER USER;
  ALTER TABLE public.orders DISABLE TRIGGER USER;

  DELETE FROM public.revendedor_baixas_pedido WHERE vendedor = ANY(vendedores_reset);
  DELETE FROM public.revendedor_saldo_movimentos WHERE vendedor = ANY(vendedores_reset);
  DELETE FROM public.revendedor_comprovantes WHERE vendedor = ANY(vendedores_reset);
  DELETE FROM public.financeiro_a_receber WHERE vendedor = ANY(vendedores_reset);

  INSERT INTO public.revendedor_comprovantes
    (vendedor, comprovante_url, data_pagamento, valor, observacao, status,
     enviado_por, aprovado_por, aprovado_em, tipo_detectado, pagador_nome)
  VALUES
    ('Rafael Silva', '', v_today, 11400.00,
     'Recebimento inicial — reset financeiro 09/05/2026',
     'aprovado', v_admin, v_admin, now(), 'empresa', 'Empresa')
  RETURNING id INTO v_rafael_comp;

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, comprovante_id,
     saldo_anterior, saldo_posterior, created_by)
  VALUES
    ('Rafael Silva', 'entrada_comprovante', 11400.00,
     'Recebimento inicial — reset financeiro',
     v_rafael_comp, 0, 11400.00, v_admin);

  INSERT INTO public.financeiro_a_receber
    (vendedor, data_pagamento, valor, destinatario, tipo, descricao, created_by)
  VALUES
    ('Rafael Silva', v_today, 11400.00, 'Empresa', 'empresa',
     'Recebimento inicial — reset financeiro 09/05/2026', v_admin);

  INSERT INTO public.revendedor_comprovantes
    (vendedor, comprovante_url, data_pagamento, valor, observacao, status,
     enviado_por, aprovado_por, aprovado_em, tipo_detectado, pagador_nome)
  VALUES
    ('Denise Garcia Feliciano', '', v_today, 3415.00,
     'Recebimento inicial — reset financeiro 09/05/2026',
     'aprovado', v_admin, v_admin, now(), 'empresa', 'Empresa')
  RETURNING id INTO v_denise_comp;

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, comprovante_id,
     saldo_anterior, saldo_posterior, created_by)
  VALUES
    ('Denise Garcia Feliciano', 'entrada_comprovante', 3415.00,
     'Recebimento inicial — reset financeiro',
     v_denise_comp, 0, 3415.00, v_admin);

  INSERT INTO public.financeiro_a_receber
    (vendedor, data_pagamento, valor, destinatario, tipo, descricao, created_by)
  VALUES
    ('Denise Garcia Feliciano', v_today, 3415.00, 'Empresa', 'empresa',
     'Recebimento inicial — reset financeiro 09/05/2026', v_admin);

  FOR ped IN
    SELECT o.id, o.vendedor, COALESCE(o.preco, 0) AS valor
      FROM public.orders o
     WHERE o.vendedor = ANY(vendedores_reset)
       AND o.status = 'Cobrado'
       AND COALESCE(o.preco, 0) > 0
       AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
  LOOP
    DECLARE
      v_saldo numeric;
      v_desc text;
    BEGIN
      v_saldo := COALESCE(public.saldo_atual_revendedor(ped.vendedor), 0);
      v_desc := CASE WHEN ped.vendedor = 'Denise Garcia Feliciano'
                     THEN '[QUITAÇÃO HISTÓRICA — INVESTIGAR] Reset financeiro 09/05/2026'
                     ELSE '[QUITAÇÃO HISTÓRICA — RESET FINANCEIRO 09/05/2026]'
                END;

      INSERT INTO public.revendedor_saldo_movimentos
        (vendedor, tipo, valor, descricao, order_id,
         saldo_anterior, saldo_posterior, created_by)
      VALUES
        (ped.vendedor, 'ajuste_admin', ped.valor, v_desc,
         ped.id, v_saldo, v_saldo, v_admin)
      RETURNING id INTO v_mov_id;

      INSERT INTO public.revendedor_baixas_pedido
        (order_id, vendedor, valor_pedido, movimento_id)
      VALUES (ped.id, ped.vendedor, ped.valor, v_mov_id);
    END;
  END LOOP;

  ALTER TABLE public.orders ENABLE TRIGGER USER;
  ALTER TABLE public.revendedor_comprovantes ENABLE TRIGGER USER;
  ALTER TABLE public.financeiro_a_receber ENABLE TRIGGER USER;
END $$;