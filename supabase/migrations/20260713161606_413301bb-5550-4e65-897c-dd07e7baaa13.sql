-- Corrige a fila real de sincronização de estoque com a Bagy.
-- Toda criação/alteração relevante em estoque_produtos passa a enfileirar o saldo atual
-- na fila processada pela edge function bagy-stock-sync.

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
  -- Não sincroniza produtos inativos, nem SKUs vazios.
  IF COALESCE(NEW.ativo, true) IS NOT true THEN
    RETURN NEW;
  END IF;

  v_sku := NULLIF(trim(NEW.sku_base), '');
  v_qtd := COALESCE(NEW.quantidade, 0);

  IF v_sku IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.bagy_stock_sync_queue (estoque_produto_id, sku, novo_saldo, criado_em, tentativas, ultimo_erro, processado_em)
  VALUES (NEW.id, v_sku, v_qtd, now(), 0, NULL, NULL)
  ON CONFLICT (estoque_produto_id) WHERE processado_em IS NULL
  DO UPDATE SET
    sku = EXCLUDED.sku,
    novo_saldo = EXCLUDED.novo_saldo,
    criado_em = now(),
    tentativas = 0,
    ultimo_erro = NULL,
    processado_em = NULL;

  UPDATE public.estoque_produtos
     SET bagy_sync_status = 'pendente',
         bagy_sync_erro = NULL
   WHERE id = NEW.id
     AND (
       bagy_sync_status IS DISTINCT FROM 'pendente'
       OR bagy_sync_erro IS NOT NULL
     );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_push_bagy ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_push_bagy
AFTER INSERT OR UPDATE OF quantidade, sku_base, ativo ON public.estoque_produtos
FOR EACH ROW
EXECUTE FUNCTION public.enfileirar_bagy_stock_sync();

-- Mantém a fila auxiliar usada pela UI, mas agora ela acompanha também baixas,
-- aumentos, criação e troca de SKU, não apenas aumentos de quantidade.
CREATE OR REPLACE FUNCTION public.trg_estoque_marca_pendente_bagy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.ativo, true) IS NOT true THEN
    RETURN NEW;
  END IF;

  IF NULLIF(trim(NEW.sku_base), '') IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.estoque_bagy_sync_pendente (produto_id, sku_base, tamanho, quantidade_atual)
  VALUES (NEW.id, NEW.sku_base, NEW.tamanho, COALESCE(NEW.quantidade, 0))
  ON CONFLICT (produto_id) DO UPDATE
    SET sku_base = EXCLUDED.sku_base,
        tamanho = EXCLUDED.tamanho,
        quantidade_atual = EXCLUDED.quantidade_atual,
        criado_em = now(),
        sincronizado_em = NULL,
        sincronizado_por = NULL,
        sincronizado_por_nome = NULL,
        erro = NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estoque_marca_pendente ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_marca_pendente
AFTER INSERT OR UPDATE OF quantidade, sku_base, ativo ON public.estoque_produtos
FOR EACH ROW
EXECUTE FUNCTION public.trg_estoque_marca_pendente_bagy();

-- Backfill seguro: garante que ativos ainda não sincronizados ou com erro fiquem na fila real.
INSERT INTO public.bagy_stock_sync_queue (estoque_produto_id, sku, novo_saldo, criado_em, tentativas, ultimo_erro, processado_em)
SELECT id, sku_base, COALESCE(quantidade, 0), now(), 0, NULL, NULL
  FROM public.estoque_produtos
 WHERE ativo = true
   AND sku_base IS NOT NULL
   AND length(trim(sku_base)) > 0
   AND (
     bagy_sync_status IS NULL
     OR bagy_sync_status IN ('pendente', 'erro', 'nao_encontrado_na_bagy')
     OR bagy_sync_at IS NULL
   )
ON CONFLICT (estoque_produto_id) WHERE processado_em IS NULL
DO UPDATE SET
  sku = EXCLUDED.sku,
  novo_saldo = EXCLUDED.novo_saldo,
  criado_em = now(),
  tentativas = 0,
  ultimo_erro = NULL,
  processado_em = NULL;

UPDATE public.estoque_produtos
   SET bagy_sync_status = 'pendente',
       bagy_sync_erro = NULL
 WHERE ativo = true
   AND sku_base IS NOT NULL
   AND length(trim(sku_base)) > 0
   AND (
     bagy_sync_status IS NULL
     OR bagy_sync_status IN ('erro', 'nao_encontrado_na_bagy')
     OR bagy_sync_at IS NULL
   );