DO $$
DECLARE
  ped record;
  v text;
  vendedores_afetados text[] := ARRAY[]::text[];
BEGIN
  FOR ped IN
    SELECT o.id, o.vendedor
    FROM public.orders o
    WHERE o.status = 'Pago'
      AND o.vendedor IS NOT NULL
      AND length(trim(o.vendedor)) > 0
      AND o.vendedor <> 'Estoque'
      AND NOT EXISTS (
        SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id
      )
  LOOP
    UPDATE public.orders
       SET status = 'Cobrado',
           historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
               'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
               'local', 'Cobrado',
               'descricao', 'Correção: pedido reaberto para baixa automática (estava Pago sem registro de baixa)',
               'usuario', 'Sistema'
             )
           )
     WHERE id = ped.id;

    IF NOT (ped.vendedor = ANY(vendedores_afetados)) THEN
      vendedores_afetados := array_append(vendedores_afetados, ped.vendedor);
    END IF;
  END LOOP;

  FOREACH v IN ARRAY vendedores_afetados LOOP
    PERFORM public.tentar_baixa_automatica(v, NULL);
  END LOOP;
END $$;