CREATE OR REPLACE FUNCTION public.get_orders_totals(_search text DEFAULT NULL::text, _date_from text DEFAULT NULL::text, _date_to text DEFAULT NULL::text, _status text[] DEFAULT NULL::text[], _produtos text[] DEFAULT NULL::text[], _vendedores text[] DEFAULT NULL::text[], _ids_mudou uuid[] DEFAULT NULL::uuid[], _conferido text DEFAULT NULL::text)
 RETURNS TABLE(total_pedidos bigint, total_produtos bigint, valor_total numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT o.preco, o.quantidade, o.tipo_extra, o.extra_detalhes, o.desconto
    FROM public.orders o
    WHERE
      (_ids_mudou IS NULL OR o.id = ANY(_ids_mudou))
      AND (
        _search IS NULL OR _search = ''
        OR o.numero ILIKE '%' || _search || '%'
        OR o.cliente ILIKE '%' || _search || '%'
      )
      AND (_date_from IS NULL OR o.data_criacao >= _date_from)
      AND (_date_to   IS NULL OR o.data_criacao <= _date_to)
      AND (
        _status IS NULL OR array_length(_status, 1) IS NULL
        OR o.status = ANY(_status)
      )
      AND (
        _produtos IS NULL OR array_length(_produtos, 1) IS NULL
        OR (
          ('bota' = ANY(_produtos) AND o.tipo_extra IS NULL)
          OR o.tipo_extra = ANY(_produtos)
        )
      )
      AND (
        _vendedores IS NULL OR array_length(_vendedores, 1) IS NULL
        OR o.vendedor = ANY(_vendedores)
        OR (o.vendedor = 'Juliana Cristina Ribeiro' AND o.cliente = ANY(_vendedores))
      )
      AND (
        _conferido IS NULL
        OR (_conferido = 'sim' AND o.conferido = true)
        OR (_conferido = 'nao' AND o.conferido = false)
      )
  )
  SELECT
    COUNT(*)::bigint AS total_pedidos,
    COALESCE(SUM(
      CASE
        WHEN tipo_extra = 'bota_pronta_entrega'
         AND jsonb_typeof(extra_detalhes->'botas') = 'array'
         AND jsonb_array_length(extra_detalhes->'botas') > 0
          THEN jsonb_array_length(extra_detalhes->'botas')
        ELSE COALESCE(quantidade, 1)
      END
    ), 0)::bigint AS total_produtos,
    COALESCE(SUM(
      GREATEST(
        COALESCE(preco, 0) * COALESCE(quantidade, 1) - COALESCE(desconto, 0),
        0
      )
    ), 0)::numeric AS valor_total
  FROM filtered;
$function$;