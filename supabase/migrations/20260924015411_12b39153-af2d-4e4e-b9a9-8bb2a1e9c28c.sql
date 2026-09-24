-- 1) Vincular comprovante ao lote de cobrança (pdf_snapshots)
ALTER TABLE public.revendedor_comprovantes
  ADD COLUMN IF NOT EXISTS cobranca_snapshot_id uuid REFERENCES public.pdf_snapshots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rev_comprovantes_snapshot
  ON public.revendedor_comprovantes (cobranca_snapshot_id);

-- 2) Listar cobranças (lotes) em aberto de um vendedor
CREATE OR REPLACE FUNCTION public.listar_cobrancas_abertas_vendedor(_vendedor text)
RETURNS TABLE (
  snapshot_id uuid,
  gerado_em timestamptz,
  nome_arquivo text,
  valor_total numeric,
  qtd_pedidos_total integer,
  valor_aberto numeric,
  qtd_pedidos_aberto integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (is_any_admin(auth.uid()) OR current_user_nome_completo() = _vendedor) THEN
    RAISE EXCEPTION 'Sem permissão para consultar cobranças de outro vendedor';
  END IF;

  RETURN QUERY
  SELECT s.id,
         s.gerado_em,
         s.nome_arquivo,
         COALESCE((s.totais->>'valor_total')::numeric, 0),
         COALESCE((s.totais->>'qtd_pedidos')::int, array_length(s.order_ids, 1), 0),
         COALESCE(ab.valor_aberto, 0),
         COALESCE(ab.qtd_aberto, 0)
  FROM public.pdf_snapshots s
  CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(COALESCE(o.preco, 0)), 0) AS valor_aberto,
           COUNT(*)::int AS qtd_aberto
    FROM public.orders o
    WHERE o.id = ANY (s.order_ids)
      AND o.status = 'Cobrado'
      AND o.vendedor = _vendedor
  ) ab
  WHERE s.tipo = 'cobranca'
    AND COALESCE(s.filtros->>'vendedor', '') = _vendedor
    AND ab.qtd_aberto > 0
  ORDER BY s.gerado_em ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.listar_cobrancas_abertas_vendedor(text) TO authenticated;

-- 3) Baixa automática priorizando o lote de cobrança
CREATE OR REPLACE FUNCTION public.tentar_baixa_automatica(
  _vendedor text,
  _admin_id uuid DEFAULT NULL::uuid,
  _snapshot_id uuid DEFAULT NULL::uuid
)
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

  -- 2) Pedidos com valor, na ordem:
  --    a) lote de cobrança escolhido no comprovante
  --    b) demais lotes de cobrança, do mais antigo para o mais novo (transbordo)
  --    c) pedidos avulsos (fora de qualquer relatório), do mais antigo para o mais novo
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

  RETURN baixadas;
END;
$function$;

-- 4) Aprovação do comprovante passa o lote escolhido para a baixa automática
CREATE OR REPLACE FUNCTION public.aprovar_comprovante_revendedor(_comprovante_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  comp record;
  saldo_ant numeric;
  baixadas integer;
  v_tipo text;
  v_destinatario text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode aprovar comprovantes';
  END IF;

  SELECT * INTO comp FROM public.revendedor_comprovantes WHERE id = _comprovante_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comprovante não encontrado'; END IF;
  IF comp.status <> 'pendente' THEN
    RAISE EXCEPTION 'Comprovante já foi % anteriormente', comp.status;
  END IF;

  UPDATE public.revendedor_comprovantes
  SET status = 'aprovado', aprovado_por = auth.uid(), aprovado_em = now()
  WHERE id = _comprovante_id;

  IF COALESCE(comp.tipo_detectado, '') = 'empresa'
     OR COALESCE(comp.pagador_documento, '') = '02139487000113' THEN
    v_tipo := 'empresa';
    v_destinatario := 'Empresa';
  ELSE
    v_tipo := 'fornecedor';
    v_destinatario := COALESCE(NULLIF(trim(comp.pagador_nome), ''), 'Pagador não identificado');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.financeiro_a_receber
    WHERE comprovante_hash IS NOT NULL
      AND comprovante_hash = comp.comprovante_hash
      AND vendedor = comp.vendedor
  ) THEN
    INSERT INTO public.financeiro_a_receber
      (vendedor, data_pagamento, valor, destinatario, tipo, descricao,
       comprovante_url, comprovante_hash, created_by)
    VALUES
      (comp.vendedor, comp.data_pagamento, comp.valor, v_destinatario, v_tipo,
       COALESCE(comp.observacao, 'Comprovante aprovado no portal do revendedor'),
       comp.comprovante_url, comp.comprovante_hash, auth.uid());
  END IF;

  saldo_ant := COALESCE(saldo_atual_revendedor(comp.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, comprovante_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (comp.vendedor, 'entrada_comprovante', comp.valor,
     'Comprovante aprovado', comp.id, saldo_ant, saldo_ant + comp.valor, auth.uid());

  baixadas := public.tentar_baixa_automatica(comp.vendedor, auth.uid(), comp.cobranca_snapshot_id);

  RETURN jsonb_build_object(
    'saldo', COALESCE(saldo_atual_revendedor(comp.vendedor), 0),
    'pedidos_baixados', baixadas
  );
END;
$function$;