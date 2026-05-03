
-- ============================================================
-- 1) CORREÇÃO RETROATIVA: pedidos com baixa registrada mas status != 'Pago'
-- ============================================================
UPDATE public.orders o
SET status = 'Pago',
    historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
        'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
        'local', 'Pago',
        'descricao', 'Pedido movido para Pago',
        'usuario', 'Baixa automática (correção retroativa)'
      )
    )
WHERE o.status = 'Cobrado'
  AND EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id);

-- ============================================================
-- 2) FUNÇÃO TRIGGER: estorno automático quando valor/vendedor muda
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_orders_estorno_baixa_on_value_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  baixa record;
  saldo_ant numeric;
  novo_valor numeric;
  valor_baixado numeric;
  vendedor_mudou boolean;
  valor_mudou boolean;
BEGIN
  -- Só age se já existe baixa para esse pedido
  SELECT * INTO baixa FROM public.revendedor_baixas_pedido WHERE order_id = NEW.id LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  novo_valor := COALESCE(NEW.preco, 0) * COALESCE(NEW.quantidade, 1) - COALESCE(NEW.desconto, 0);
  valor_baixado := baixa.valor_pedido;
  vendedor_mudou := (NEW.vendedor IS DISTINCT FROM baixa.vendedor);
  valor_mudou := (novo_valor <> valor_baixado);

  IF NOT vendedor_mudou AND NOT valor_mudou THEN
    RETURN NEW;
  END IF;

  -- Estorno: devolve o valor original ao vendedor que tinha sido baixado
  saldo_ant := COALESCE(public.saldo_atual_revendedor(baixa.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (baixa.vendedor, 'estorno', valor_baixado,
     'Estorno automático: valor/vendedor do pedido alterado',
     NEW.id, saldo_ant, saldo_ant + valor_baixado, auth.uid());

  -- Remove a baixa antiga
  DELETE FROM public.revendedor_baixas_pedido WHERE id = baixa.id;

  -- Volta o pedido para Cobrado e registra no histórico
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
$$;

-- AFTER trigger: tenta nova baixa para o vendedor (atual e antigo, se mudou)
CREATE OR REPLACE FUNCTION public.trg_orders_retentar_baixa_apos_estorno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só roda se acabamos de cair em Cobrado (vindo do BEFORE trigger ou manualmente)
  IF NEW.status = 'Cobrado' AND NEW.vendedor IS NOT NULL AND length(trim(NEW.vendedor)) > 0 THEN
    PERFORM public.tentar_baixa_automatica(NEW.vendedor, auth.uid());
    -- Se mudou o vendedor, tenta também no antigo
    IF OLD.vendedor IS DISTINCT FROM NEW.vendedor AND OLD.vendedor IS NOT NULL THEN
      PERFORM public.tentar_baixa_automatica(OLD.vendedor, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_value_change_estorno ON public.orders;
CREATE TRIGGER trg_orders_value_change_estorno
  BEFORE UPDATE OF preco, quantidade, desconto, vendedor ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_estorno_baixa_on_value_change();

DROP TRIGGER IF EXISTS trg_orders_retentar_baixa ON public.orders;
CREATE TRIGGER trg_orders_retentar_baixa
  AFTER UPDATE OF status, preco, quantidade, desconto, vendedor ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'Cobrado')
  EXECUTE FUNCTION public.trg_orders_retentar_baixa_apos_estorno();

-- ============================================================
-- 3) REPROCESSAMENTO GLOBAL: aproveita saldo atual de todos vendedores
-- ============================================================
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT DISTINCT vendedor
    FROM public.vw_revendedor_saldo
    WHERE COALESCE(saldo_disponivel, 0) > 0
  LOOP
    PERFORM public.tentar_baixa_automatica(v.vendedor, NULL);
  END LOOP;
END $$;
