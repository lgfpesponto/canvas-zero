-- Extensão para busca por trigrama (numero/cliente ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices para ordenação e filtros mais usados em orders
CREATE INDEX IF NOT EXISTS idx_orders_data_hora_desc
  ON public.orders (data_criacao DESC, hora_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tipo_extra
  ON public.orders (tipo_extra);

CREATE INDEX IF NOT EXISTS idx_orders_numero_trgm
  ON public.orders USING gin (numero gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_orders_cliente_trgm
  ON public.orders USING gin (cliente gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_orders_vendedor
  ON public.orders (vendedor);

-- RPC: lista distinta de vendedores (+ clientes da Juliana como pseudo-vendedores)
CREATE OR REPLACE FUNCTION public.get_vendedores_distinct()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(nome ORDER BY nome), ARRAY[]::text[])
  FROM (
    SELECT DISTINCT vendedor AS nome
    FROM public.orders
    WHERE vendedor IS NOT NULL AND vendedor <> ''
    UNION
    SELECT DISTINCT cliente AS nome
    FROM public.orders
    WHERE vendedor = 'Juliana Cristina Ribeiro'
      AND cliente IS NOT NULL AND btrim(cliente) <> ''
  ) t
$$;

GRANT EXECUTE ON FUNCTION public.get_vendedores_distinct() TO authenticated, anon, service_role;