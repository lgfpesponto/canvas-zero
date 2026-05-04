-- 1. Atualizar get_production_counts: adicionar novas etapas Laser Ferreni, remover Bordado Dinei
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
      'Entrada Laser Ferreni', 'Baixa Laser Ferreni',
      'Estampa',
      'Sem bordado',
      'Bordado Sandro', 'Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos',
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

-- 2. Mover pedido 8050 → Entrada Laser Dinei
UPDATE public.orders
SET status = 'Entrada Laser Dinei',
    historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Entrada Laser Dinei',
      'descricao', 'Migração: pedido movido para Entrada Laser Dinei',
      'usuario', 'Sistema'
    ))
WHERE numero = '8050';

-- 3. Mover pedido 1922 → Entrada Laser Ferreni
UPDATE public.orders
SET status = 'Entrada Laser Ferreni',
    historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Entrada Laser Ferreni',
      'descricao', 'Migração: pedido movido para Entrada Laser Ferreni',
      'usuario', 'Sistema'
    ))
WHERE numero = '1922';

-- 4. Sweep: demais pedidos em Bordado Dinei → Bordado Sandro
UPDATE public.orders
SET status = 'Bordado Sandro',
    historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Bordado Sandro',
      'descricao', 'Migração automática: etapa "Bordado Dinei" descontinuada',
      'usuario', 'Sistema'
    ))
WHERE status = 'Bordado Dinei';