-- 1) Pesponto Ailton: insere após Pesponto 05 (ordem 13), na ordem 14
UPDATE public.status_etapas SET ordem = ordem + 1 WHERE ordem >= 14;
INSERT INTO public.status_etapas (nome, slug, ordem) VALUES ('Pesponto Ailton', 'pesponto-ailton', 14);

-- 2) Aguardando Couro: insere após Aguardando (ordem 3), na ordem 4
UPDATE public.status_etapas SET ordem = ordem + 1 WHERE ordem >= 4;
INSERT INTO public.status_etapas (nome, slug, ordem) VALUES ('Aguardando Couro', 'aguardando-couro', 4);

-- 3) Atualiza get_production_counts para incluir os novos status como "em produção"
CREATE OR REPLACE FUNCTION public.get_production_counts(product_types text[] DEFAULT NULL::text[], vendors text[] DEFAULT NULL::text[])
 RETURNS TABLE(in_production bigint, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(SUM(CASE WHEN status IN (
      'Impresso',
      'Aguardando', 'Aguardando Couro', 'Corte', 'Baixa Corte', 'Sem bordado',
      'Bordado Dinei', 'Bordado Sandro', 'Bordado 7Estrivos',
      'Pesponto 01', 'Pesponto 02', 'Pesponto 03', 'Pesponto 04', 'Pesponto 05',
      'Pesponto Ailton',
      'Pespontando', 'Montagem', 'Revisão', 'Expedição'
    ) THEN quantidade ELSE 0 END), 0)::bigint AS in_production,
    COALESCE(SUM(quantidade), 0)::bigint AS total
  FROM orders
  WHERE (product_types IS NULL OR (
    (tipo_extra IS NULL AND 'bota' = ANY(product_types))
    OR (tipo_extra = ANY(product_types))
  ))
  AND (vendors IS NULL OR vendedor = ANY(vendors))
$function$;

-- 4) Atualiza get_orders_totals para aceitar filtro de conferido (admin_master)
CREATE OR REPLACE FUNCTION public.get_orders_totals(
  _search text DEFAULT NULL::text,
  _date_from text DEFAULT NULL::text,
  _date_to text DEFAULT NULL::text,
  _status text[] DEFAULT NULL::text[],
  _produtos text[] DEFAULT NULL::text[],
  _vendedores text[] DEFAULT NULL::text[],
  _ids_mudou uuid[] DEFAULT NULL::uuid[],
  _conferido text DEFAULT NULL::text
)
 RETURNS TABLE(total_pedidos bigint, total_produtos bigint, valor_total numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT o.preco, o.quantidade, o.tipo_extra, o.extra_detalhes
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
    COALESCE(SUM(COALESCE(preco, 0) * COALESCE(quantidade, 1)), 0)::numeric AS valor_total
  FROM filtered;
$function$;