-- 1) Realtime para movimentos de saldo
ALTER TABLE public.revendedor_saldo_movimentos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'revendedor_saldo_movimentos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.revendedor_saldo_movimentos';
  END IF;
END $$;

-- 2) RPC: quitar pedidos cobrados como histórico (sem alterar saldo)
CREATE OR REPLACE FUNCTION public.quitar_pedidos_historico(_order_ids uuid[], _motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- já tem baixa? pula
    IF EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = ped.id) THEN
      pulados := pulados + 1;
      CONTINUE;
    END IF;

    valor_p := COALESCE(ped.preco, 0) * COALESCE(ped.quantidade, 1);
    IF valor_p <= 0 THEN
      pulados := pulados + 1;
      CONTINUE;
    END IF;

    saldo_ant := COALESCE(saldo_atual_revendedor(ped.vendedor), 0);

    -- movimento histórico SEM alterar saldo (saldo_anterior = saldo_posterior)
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
$$;

-- 3) RPC: descartar comprovantes pendentes como histórico
CREATE OR REPLACE FUNCTION public.descartar_comprovantes_historico(_ids uuid[], _motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  descartados integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode descartar comprovantes como histórico';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um comprovante';
  END IF;

  WITH upd AS (
    UPDATE public.revendedor_comprovantes
    SET status = 'reprovado',
        motivo_reprovacao = '[DESCARTE HISTÓRICO] ' || _motivo,
        aprovado_por = auth.uid(),
        aprovado_em = now()
    WHERE id = ANY(_ids) AND status = 'pendente'
    RETURNING 1
  )
  SELECT count(*) INTO descartados FROM upd;

  RETURN jsonb_build_object('descartados', descartados);
END;
$$;