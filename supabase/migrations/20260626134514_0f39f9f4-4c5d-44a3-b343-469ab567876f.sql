
CREATE OR REPLACE FUNCTION public.bagy_link_orders_after_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_pendentes int;
  v_target text;
BEGIN
  IF NEW.bagy_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_pedido_id
    FROM public.bagy_pedidos
   WHERE bagy_order_id = NEW.bagy_order_id
   LIMIT 1;

  IF v_pedido_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.bagy_pedido_itens
     SET status = 'ficha_gerada',
         order_id_portal = NEW.id,
         updated_at = now()
   WHERE pedido_id = v_pedido_id
     AND status = 'aguardando_ficha'
     AND order_id_portal IS NULL;

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

  -- Pronta entrega (estoque) → separated; ficha → production
  IF NEW.tipo_extra = 'bota_pronta_entrega'
     AND COALESCE(NEW.extra_detalhes->>'origem_estoque','false') = 'true' THEN
    v_target := 'separated';
  ELSE
    v_target := 'production';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bagy_status_sync_queue
     WHERE bagy_order_id = NEW.bagy_order_id
       AND target_status = v_target
       AND processado_em IS NULL
  ) THEN
    INSERT INTO public.bagy_status_sync_queue (bagy_order_id, target_status)
    VALUES (NEW.bagy_order_id, v_target);
  END IF;

  RETURN NEW;
END;
$$;
