
-- Função: espelha um lançamento de financeiro_a_receber em revendedor_comprovantes (aprovado)
-- + cria movimento de saldo (entrada_comprovante) + tenta baixa automática.
CREATE OR REPLACE FUNCTION public.espelhar_a_receber_em_saldo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_comp_id uuid;
  saldo_ant numeric;
  ja_existe boolean;
BEGIN
  -- Pula se vendedor inválido
  IF NEW.vendedor IS NULL OR length(trim(NEW.vendedor)) = 0 THEN
    RETURN NEW;
  END IF;

  -- Deduplicação: se já existe espelho para mesmo hash+vendedor, pula
  IF NEW.comprovante_hash IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.revendedor_comprovantes
      WHERE vendedor = NEW.vendedor
        AND comprovante_hash = NEW.comprovante_hash
    ) INTO ja_existe;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.revendedor_comprovantes
      WHERE vendedor = NEW.vendedor
        AND data_pagamento = NEW.data_pagamento
        AND valor = NEW.valor
        AND COALESCE(comprovante_url,'') = COALESCE(NEW.comprovante_url,'')
    ) INTO ja_existe;
  END IF;

  IF ja_existe THEN
    RETURN NEW;
  END IF;

  -- Cria comprovante já aprovado
  INSERT INTO public.revendedor_comprovantes
    (vendedor, comprovante_url, data_pagamento, valor,
     observacao, status, comprovante_hash,
     enviado_por, aprovado_por, aprovado_em,
     pagador_nome, tipo_detectado)
  VALUES
    (NEW.vendedor,
     COALESCE(NEW.comprovante_url, ''),
     NEW.data_pagamento,
     NEW.valor,
     '[Lançado em A Receber]' ||
       CASE WHEN NEW.descricao IS NOT NULL AND length(trim(NEW.descricao)) > 0
            THEN ' ' || NEW.descricao ELSE '' END,
     'aprovado',
     NEW.comprovante_hash,
     COALESCE(NEW.created_by, auth.uid()),
     COALESCE(NEW.created_by, auth.uid()),
     COALESCE(NEW.created_at, now()),
     NEW.destinatario,
     NEW.tipo)
  RETURNING id INTO novo_comp_id;

  -- Movimento de saldo
  saldo_ant := COALESCE(saldo_atual_revendedor(NEW.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, comprovante_id,
     saldo_anterior, saldo_posterior, created_by)
  VALUES
    (NEW.vendedor, 'entrada_comprovante', NEW.valor,
     'Recebimento lançado em A Receber por admin' ||
       CASE WHEN NEW.descricao IS NOT NULL AND length(trim(NEW.descricao)) > 0
            THEN ' — ' || NEW.descricao ELSE '' END,
     novo_comp_id, saldo_ant, saldo_ant + NEW.valor,
     COALESCE(NEW.created_by, auth.uid()));

  -- Baixa automática
  PERFORM tentar_baixa_automatica(NEW.vendedor, COALESCE(NEW.created_by, auth.uid()));

  RETURN NEW;
END;
$$;

-- Trigger AFTER INSERT
DROP TRIGGER IF EXISTS trg_espelhar_a_receber_insert ON public.financeiro_a_receber;
CREATE TRIGGER trg_espelhar_a_receber_insert
AFTER INSERT ON public.financeiro_a_receber
FOR EACH ROW
EXECUTE FUNCTION public.espelhar_a_receber_em_saldo();

-- Função e trigger para reverter quando admin apagar uma linha do A Receber
CREATE OR REPLACE FUNCTION public.reverter_espelho_a_receber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comp_id uuid;
  saldo_ant numeric;
  tem_baixa boolean;
BEGIN
  -- Acha o espelho correspondente
  IF OLD.comprovante_hash IS NOT NULL THEN
    SELECT id INTO comp_id FROM public.revendedor_comprovantes
    WHERE vendedor = OLD.vendedor
      AND comprovante_hash = OLD.comprovante_hash
    LIMIT 1;
  ELSE
    SELECT id INTO comp_id FROM public.revendedor_comprovantes
    WHERE vendedor = OLD.vendedor
      AND data_pagamento = OLD.data_pagamento
      AND valor = OLD.valor
      AND COALESCE(comprovante_url,'') = COALESCE(OLD.comprovante_url,'')
    LIMIT 1;
  END IF;

  IF comp_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Verifica se há baixas geradas a partir desse comprovante (via movimentos)
  SELECT EXISTS(
    SELECT 1 FROM public.revendedor_baixas_pedido b
    JOIN public.revendedor_saldo_movimentos m ON m.id = b.movimento_id
    WHERE m.comprovante_id = comp_id
  ) INTO tem_baixa;

  saldo_ant := COALESCE(saldo_atual_revendedor(OLD.vendedor), 0);

  IF tem_baixa THEN
    -- Não apaga o histórico; cria movimento de estorno negativo (registrado como baixa_pedido)
    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, comprovante_id,
       saldo_anterior, saldo_posterior, created_by)
    VALUES
      (OLD.vendedor, 'baixa_pedido', OLD.valor,
       '[REVERSÃO A RECEBER] Lançamento removido pelo admin',
       comp_id, saldo_ant, saldo_ant - OLD.valor, auth.uid());

    UPDATE public.revendedor_comprovantes
       SET status = 'reprovado',
           motivo_reprovacao = '[REMOVIDO DO A RECEBER]',
           aprovado_por = auth.uid(),
           aprovado_em = now()
     WHERE id = comp_id;
  ELSE
    -- Sem baixas: apaga movimento de entrada e o comprovante
    DELETE FROM public.revendedor_saldo_movimentos
     WHERE comprovante_id = comp_id AND tipo = 'entrada_comprovante';
    DELETE FROM public.revendedor_comprovantes WHERE id = comp_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverter_espelho_a_receber ON public.financeiro_a_receber;
CREATE TRIGGER trg_reverter_espelho_a_receber
AFTER DELETE ON public.financeiro_a_receber
FOR EACH ROW
EXECUTE FUNCTION public.reverter_espelho_a_receber();

-- =====================================================================
-- BACKFILL: espelhar os lançamentos existentes do A Receber
-- =====================================================================
DO $$
DECLARE
  ar record;
  novo_comp_id uuid;
  saldo_ant numeric;
  ja_existe boolean;
  vendedores_afetados text[] := ARRAY[]::text[];
BEGIN
  FOR ar IN
    SELECT * FROM public.financeiro_a_receber
    WHERE vendedor IS NOT NULL AND length(trim(vendedor)) > 0
    ORDER BY data_pagamento ASC, created_at ASC
  LOOP
    IF ar.comprovante_hash IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM public.revendedor_comprovantes
        WHERE vendedor = ar.vendedor AND comprovante_hash = ar.comprovante_hash
      ) INTO ja_existe;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM public.revendedor_comprovantes
        WHERE vendedor = ar.vendedor
          AND data_pagamento = ar.data_pagamento
          AND valor = ar.valor
          AND COALESCE(comprovante_url,'') = COALESCE(ar.comprovante_url,'')
      ) INTO ja_existe;
    END IF;

    IF ja_existe THEN CONTINUE; END IF;

    INSERT INTO public.revendedor_comprovantes
      (vendedor, comprovante_url, data_pagamento, valor,
       observacao, status, comprovante_hash,
       enviado_por, aprovado_por, aprovado_em,
       pagador_nome, tipo_detectado)
    VALUES
      (ar.vendedor,
       COALESCE(ar.comprovante_url, ''),
       ar.data_pagamento,
       ar.valor,
       '[Lançado em A Receber]' ||
         CASE WHEN ar.descricao IS NOT NULL AND length(trim(ar.descricao)) > 0
              THEN ' ' || ar.descricao ELSE '' END,
       'aprovado',
       ar.comprovante_hash,
       ar.created_by,
       ar.created_by,
       ar.created_at,
       ar.destinatario,
       ar.tipo)
    RETURNING id INTO novo_comp_id;

    saldo_ant := COALESCE(saldo_atual_revendedor(ar.vendedor), 0);

    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, comprovante_id,
       saldo_anterior, saldo_posterior, created_by, created_at)
    VALUES
      (ar.vendedor, 'entrada_comprovante', ar.valor,
       'Recebimento lançado em A Receber (backfill)' ||
         CASE WHEN ar.descricao IS NOT NULL AND length(trim(ar.descricao)) > 0
              THEN ' — ' || ar.descricao ELSE '' END,
       novo_comp_id, saldo_ant, saldo_ant + ar.valor,
       ar.created_by, ar.created_at);

    IF NOT (ar.vendedor = ANY(vendedores_afetados)) THEN
      vendedores_afetados := array_append(vendedores_afetados, ar.vendedor);
    END IF;
  END LOOP;

  -- Roda baixa automática uma vez por vendedor
  IF array_length(vendedores_afetados, 1) IS NOT NULL THEN
    FOR ar IN SELECT unnest(vendedores_afetados) AS vendedor LOOP
      PERFORM tentar_baixa_automatica(ar.vendedor, NULL);
    END LOOP;
  END IF;
END $$;
