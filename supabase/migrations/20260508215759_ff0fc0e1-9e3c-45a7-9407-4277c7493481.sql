
-- ========================================
-- SISTEMA DE VERSIONAMENTO DE REGRA DE PREÇO
-- ========================================
-- Substitui o boolean preco_migrado_v2 por um número de versão
-- que é bumpado automaticamente quando uma regra global muda.

-- 1. Coluna na tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS preco_regra_versao integer;

-- Inicializa: pedidos já migrados (v2=true) ficam com versão 1, resto NULL.
UPDATE public.orders SET preco_regra_versao = 1 WHERE preco_migrado_v2 = true AND preco_regra_versao IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_preco_regra_versao_pendentes
  ON public.orders(preco_regra_versao) WHERE preco_regra_versao IS NULL;

-- 2. Tabela versão_regra (usa system_flags estendida com coluna numérica opcional)
CREATE TABLE IF NOT EXISTS public.system_counters (
  key text PRIMARY KEY,
  value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem system_counters"
  ON public.system_counters FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_master atualiza system_counters"
  ON public.system_counters FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "admin_master insere system_counters"
  ON public.system_counters FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

INSERT INTO public.system_counters(key, value) VALUES ('preco_regra_versao', 1)
  ON CONFLICT (key) DO NOTHING;

-- 3. Função que bumpa versão e marca pedidos afetados
CREATE OR REPLACE FUNCTION public.bump_preco_regra_versao()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nova_versao bigint;
BEGIN
  UPDATE public.system_counters
    SET value = value + 1, updated_at = now()
    WHERE key = 'preco_regra_versao'
    RETURNING value INTO nova_versao;
  RETURN nova_versao;
END;
$$;

-- 4. Trigger genérico: ao alterar preço em ficha_variacoes ou custom_options,
--    bumpa versão e marca TODOS os pedidos com essa variação como desatualizados.
--    Usar matching amplo (LIKE em campos relevantes) — edge function valida no recálculo.
CREATE OR REPLACE FUNCTION public.trg_ficha_variacoes_preco_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_slug text;
  campo_slug text;
BEGIN
  -- Só age se preço mudou (ou insert/delete)
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.preco_adicional,0) = COALESCE(OLD.preco_adicional,0) THEN
    RETURN NEW;
  END IF;

  PERFORM public.bump_preco_regra_versao();

  -- Identifica categoria/campo afetado
  IF TG_OP = 'DELETE' THEN
    SELECT fc.slug INTO campo_slug FROM public.ficha_campos fc WHERE fc.id = OLD.campo_id;
  ELSE
    SELECT fc.slug INTO campo_slug FROM public.ficha_campos fc WHERE fc.id = NEW.campo_id;
  END IF;

  -- Marca pedidos afetados como pendentes (preco_regra_versao = NULL)
  -- Estratégia simples: invalida TODOS os pedidos. Edge function reconcilia em lote.
  -- (Mais barato que tentar identificar exatamente quais usam aquela variação.)
  UPDATE public.orders SET preco_regra_versao = NULL WHERE preco_regra_versao IS NOT NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ficha_variacoes_preco_change ON public.ficha_variacoes;
CREATE TRIGGER trg_ficha_variacoes_preco_change
  AFTER INSERT OR UPDATE OR DELETE ON public.ficha_variacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_ficha_variacoes_preco_change();

CREATE OR REPLACE FUNCTION public.trg_custom_options_preco_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.preco,0) = COALESCE(OLD.preco,0) THEN
    RETURN NEW;
  END IF;

  PERFORM public.bump_preco_regra_versao();
  UPDATE public.orders SET preco_regra_versao = NULL WHERE preco_regra_versao IS NOT NULL;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_custom_options_preco_change ON public.custom_options;
CREATE TRIGGER trg_custom_options_preco_change
  AFTER INSERT OR UPDATE OR DELETE ON public.custom_options
  FOR EACH ROW EXECUTE FUNCTION public.trg_custom_options_preco_change();

-- 5. Helper RPC pra ler a versão atual (público autenticado)
CREATE OR REPLACE FUNCTION public.get_preco_regra_versao()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(value, 1) FROM public.system_counters WHERE key = 'preco_regra_versao';
$$;
