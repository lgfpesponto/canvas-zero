
-- 1) Novas colunas em estoque_produtos
ALTER TABLE public.estoque_produtos
  ADD COLUMN IF NOT EXISTS bagy_variation_id text,
  ADD COLUMN IF NOT EXISTS bagy_sync_status text,
  ADD COLUMN IF NOT EXISTS bagy_sync_erro text,
  ADD COLUMN IF NOT EXISTS bagy_sync_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_estoque_produtos_bagy_sync_status
  ON public.estoque_produtos(bagy_sync_status);

-- 2) Tabela fila
CREATE TABLE IF NOT EXISTS public.bagy_stock_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estoque_produto_id uuid NOT NULL REFERENCES public.estoque_produtos(id) ON DELETE CASCADE,
  sku text NOT NULL,
  novo_saldo integer NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz,
  tentativas integer NOT NULL DEFAULT 0,
  ultimo_erro text
);

GRANT SELECT ON public.bagy_stock_sync_queue TO authenticated;
GRANT ALL ON public.bagy_stock_sync_queue TO service_role;

ALTER TABLE public.bagy_stock_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e vendedor_comissao leem fila bagy stock"
  ON public.bagy_stock_sync_queue
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master')
    OR public.has_role(auth.uid(), 'admin_producao')
    OR public.has_role(auth.uid(), 'vendedor_comissao')
  );

-- Índice único parcial: 1 pendente por produto (dedupe)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bagy_stock_sync_queue_pendente
  ON public.bagy_stock_sync_queue(estoque_produto_id)
  WHERE processado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_bagy_stock_sync_queue_pendente
  ON public.bagy_stock_sync_queue(criado_em)
  WHERE processado_em IS NULL;

-- 3) Trigger function
CREATE OR REPLACE FUNCTION public.enfileirar_bagy_stock_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sku text;
  v_qtd integer;
BEGIN
  v_sku := NEW.sku_base;
  v_qtd := COALESCE(NEW.quantidade, 0);
  IF v_sku IS NULL OR length(trim(v_sku)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.bagy_stock_sync_queue (estoque_produto_id, sku, novo_saldo)
  VALUES (NEW.id, v_sku, v_qtd)
  ON CONFLICT (estoque_produto_id) WHERE processado_em IS NULL
  DO UPDATE SET novo_saldo = EXCLUDED.novo_saldo, criado_em = now(), tentativas = 0, ultimo_erro = NULL;

  -- marca produto como pendente
  IF NEW.bagy_sync_status IS DISTINCT FROM 'pendente' THEN
    UPDATE public.estoque_produtos
       SET bagy_sync_status = 'pendente'
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_push_bagy ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_push_bagy
AFTER INSERT OR UPDATE OF quantidade ON public.estoque_produtos
FOR EACH ROW
EXECUTE FUNCTION public.enfileirar_bagy_stock_sync();

-- 4) Carga inicial: enfileira todos os ativos
INSERT INTO public.bagy_stock_sync_queue (estoque_produto_id, sku, novo_saldo)
SELECT id, sku_base, COALESCE(quantidade, 0)
FROM public.estoque_produtos
WHERE ativo = true
  AND sku_base IS NOT NULL
  AND length(trim(sku_base)) > 0
ON CONFLICT (estoque_produto_id) WHERE processado_em IS NULL
DO UPDATE SET novo_saldo = EXCLUDED.novo_saldo, criado_em = now();

UPDATE public.estoque_produtos
  SET bagy_sync_status = 'pendente'
WHERE ativo = true
  AND sku_base IS NOT NULL;
