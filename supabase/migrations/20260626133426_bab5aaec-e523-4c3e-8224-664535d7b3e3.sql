
-- 1) Policies faltantes na fila de sync de status Bagy
CREATE POLICY bagy_status_sync_insert_authorized
  ON public.bagy_status_sync_queue FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'admin_master'::app_role)
    OR has_role(auth.uid(),'admin_producao'::app_role)
    OR has_role(auth.uid(),'vendedor_comissao'::app_role)
  );

CREATE POLICY bagy_status_sync_update_authorized
  ON public.bagy_status_sync_queue FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin_master'::app_role)
    OR has_role(auth.uid(),'admin_producao'::app_role)
    OR has_role(auth.uid(),'vendedor_comissao'::app_role)
  );

-- 2) Ampliar UPDATE em bagy_pedidos / bagy_pedido_itens para admin_producao
DROP POLICY IF EXISTS bagy_pedidos_update_admin ON public.bagy_pedidos;
CREATE POLICY bagy_pedidos_update_authorized
  ON public.bagy_pedidos FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin_master'::app_role)
    OR has_role(auth.uid(),'admin_producao'::app_role)
    OR has_role(auth.uid(),'vendedor_comissao'::app_role)
  );

DROP POLICY IF EXISTS bagy_pedido_itens_update_admin ON public.bagy_pedido_itens;
CREATE POLICY bagy_pedido_itens_update_authorized
  ON public.bagy_pedido_itens FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin_master'::app_role)
    OR has_role(auth.uid(),'admin_producao'::app_role)
    OR has_role(auth.uid(),'vendedor_comissao'::app_role)
  );

-- 3) Trigger de segurança: ao setar bagy_order_id no pedido portal,
--    liga itens Bagy, atualiza flag e enfileira production.
CREATE OR REPLACE FUNCTION public.bagy_link_orders_after_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_pendentes int;
BEGIN
  IF NEW.bagy_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pega o bagy_pedidos.id correspondente
  SELECT id INTO v_pedido_id
    FROM public.bagy_pedidos
   WHERE bagy_order_id = NEW.bagy_order_id
   LIMIT 1;

  IF v_pedido_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Marca itens aguardando_ficha desse pedido como ficha_gerada
  UPDATE public.bagy_pedido_itens
     SET status = 'ficha_gerada',
         order_id_portal = NEW.id,
         updated_at = now()
   WHERE pedido_id = v_pedido_id
     AND status = 'aguardando_ficha'
     AND order_id_portal IS NULL;

  -- Se não há mais itens aguardando ficha/mapeamento, marca pedido como pedido_criado
  SELECT count(*) INTO v_pendentes
    FROM public.bagy_pedido_itens
   WHERE pedido_id = v_pedido_id
     AND status IN ('aguardando_ficha','sem_mapeamento');

  IF v_pendentes = 0 THEN
    UPDATE public.bagy_pedidos
       SET flag = 'pedido_criado',
           order_id_portal = NEW.id,
           updated_at = now()
     WHERE id = v_pedido_id
       AND flag <> 'pedido_criado';
  END IF;

  -- Enfileira sync para production na Bagy se ainda não pendente
  IF NOT EXISTS (
    SELECT 1 FROM public.bagy_status_sync_queue
     WHERE bagy_order_id = NEW.bagy_order_id
       AND target_status = 'production'
       AND processado_em IS NULL
  ) THEN
    INSERT INTO public.bagy_status_sync_queue (bagy_order_id, target_status)
    VALUES (NEW.bagy_order_id, 'production');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bagy_link_orders_after_save ON public.orders;
CREATE TRIGGER trg_bagy_link_orders_after_save
AFTER INSERT OR UPDATE OF bagy_order_id ON public.orders
FOR EACH ROW
WHEN (NEW.bagy_order_id IS NOT NULL)
EXECUTE FUNCTION public.bagy_link_orders_after_save();
