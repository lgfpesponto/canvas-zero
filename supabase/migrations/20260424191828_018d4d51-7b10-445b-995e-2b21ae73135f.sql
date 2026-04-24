CREATE OR REPLACE FUNCTION public.get_sales_chart(period text, product_filter text DEFAULT 'todos'::text, vendor_filter text DEFAULT NULL::text)
 RETURNS TABLE(label text, vendas bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  excluded_prefixes text[] := ARRAY['TROCA', 'REFAZENDO', 'ERRO', 'INFLUENCER'];
  sunday_this_week date := (date_trunc('week', current_date + 1) - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT o.data_criacao, o.quantidade
    FROM orders o
    WHERE NOT EXISTS (
      SELECT 1 FROM unnest(excluded_prefixes) p WHERE upper(o.numero) LIKE p || '%'
    )
    AND o.vendedor <> 'Estoque'
    AND o.status <> 'Cancelado'
    AND (
      product_filter = 'todos'
      OR (product_filter = 'bota' AND o.tipo_extra IS NULL)
      OR (product_filter <> 'todos' AND product_filter <> 'bota' AND o.tipo_extra = product_filter)
    )
    AND (vendor_filter IS NULL OR o.vendedor = vendor_filter)
  )
  SELECT
    CASE period
      WHEN 'dia' THEN to_char(d.dt, 'DD/MM')
      WHEN 'semana' THEN to_char(d.dt, 'DD/MM') || '–' || to_char(d.dt + 6, 'DD/MM')
      WHEN 'mes' THEN to_char(d.dt, 'Mon')
      WHEN 'ano' THEN to_char(d.dt, 'YYYY')
    END AS label,
    COALESCE(SUM(f.quantidade), 0)::bigint AS vendas
  FROM (
    SELECT generate_series(
      CASE period
        WHEN 'dia' THEN current_date - 6
        WHEN 'semana' THEN (sunday_this_week - interval '5 weeks')::date
        WHEN 'mes' THEN (current_date - interval '5 months')::date
        WHEN 'ano' THEN (current_date - interval '2 years')::date
        ELSE current_date - 6
      END,
      CASE period
        WHEN 'semana' THEN sunday_this_week
        ELSE current_date
      END,
      CASE period
        WHEN 'dia' THEN '1 day'::interval
        WHEN 'semana' THEN '7 days'::interval
        WHEN 'mes' THEN '1 month'::interval
        WHEN 'ano' THEN '1 year'::interval
        ELSE '1 day'::interval
      END
    )::date AS dt
  ) d
  LEFT JOIN filtered f ON
    CASE period
      WHEN 'dia' THEN f.data_criacao = d.dt::text
      WHEN 'semana' THEN f.data_criacao::date BETWEEN d.dt AND d.dt + 6
      WHEN 'mes' THEN to_char(f.data_criacao::date, 'YYYY-MM') = to_char(d.dt, 'YYYY-MM')
      WHEN 'ano' THEN to_char(f.data_criacao::date, 'YYYY') = to_char(d.dt, 'YYYY')
    END
  GROUP BY d.dt
  ORDER BY d.dt;
END;
$function$;