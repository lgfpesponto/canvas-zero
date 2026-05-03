CREATE OR REPLACE FUNCTION public.get_production_counts(product_types text[] DEFAULT NULL::text[], vendors text[] DEFAULT NULL::text[])
 RETURNS TABLE(in_production bigint, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(SUM(CASE WHEN status IN (
      'Impresso',
      'Aguardando', 'Aguardando Couro', 'Corte', 'Baixa Corte',
      'Entrada Laser Dinei', 'Baixa Laser Dinei',
      'Estampa',
      'Sem bordado',
      'Bordado Dinei', 'Bordado Sandro', 'Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos',
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