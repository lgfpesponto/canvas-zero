CREATE OR REPLACE FUNCTION public.processar_baixas_automaticas_geral()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  flag_ativa boolean;
  v text;
  baixadas integer;
  total_pedidos integer := 0;
  total_vendedores integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode processar baixas automáticas em massa';
  END IF;

  SELECT value INTO flag_ativa FROM public.system_flags WHERE key = 'baixa_automatica_ativa';
  IF NOT COALESCE(flag_ativa, true) THEN
    RETURN jsonb_build_object('vendedores_processados', 0, 'pedidos_baixados', 0, 'flag_ativa', false);
  END IF;

  FOR v IN
    SELECT DISTINCT o.vendedor
    FROM public.orders o
    WHERE o.status = 'Cobrado'
      AND o.vendedor IS NOT NULL
      AND length(trim(o.vendedor)) > 0
      AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
  LOOP
    baixadas := public.tentar_baixa_automatica(v, auth.uid());
    IF baixadas > 0 THEN
      total_vendedores := total_vendedores + 1;
      total_pedidos := total_pedidos + baixadas;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'vendedores_processados', total_vendedores,
    'pedidos_baixados', total_pedidos,
    'flag_ativa', true
  );
END;
$function$;