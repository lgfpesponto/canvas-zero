ALTER TABLE public.revendedor_comprovantes
  ADD COLUMN IF NOT EXISTS id_transacao text,
  ADD COLUMN IF NOT EXISTS instituicao_origem text;

DROP INDEX IF EXISTS public.uq_revcomp_vendedor_triple;

CREATE UNIQUE INDEX IF NOT EXISTS uq_revcomp_vendedor_idtransacao
  ON public.revendedor_comprovantes (vendedor, upper(id_transacao))
  WHERE id_transacao IS NOT NULL AND dup_legado = false;

CREATE OR REPLACE FUNCTION public.bloquear_comprovante_duplicado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existente record;
BEGIN
  IF NEW.comprovante_hash IS NOT NULL THEN
    SELECT id, data_pagamento, valor INTO v_existente FROM public.revendedor_comprovantes
    WHERE vendedor = NEW.vendedor AND comprovante_hash = NEW.comprovante_hash AND id IS DISTINCT FROM NEW.id LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Comprovante duplicado: este mesmo arquivo já foi enviado para % (valor R$ %, data %).',
        NEW.vendedor, v_existente.valor, to_char(v_existente.data_pagamento, 'DD/MM/YYYY') USING ERRCODE = '23505';
    END IF;
  END IF;

  IF NULLIF(trim(NEW.id_transacao), '') IS NOT NULL THEN
    SELECT id, data_pagamento, valor INTO v_existente FROM public.revendedor_comprovantes
    WHERE vendedor = NEW.vendedor AND upper(id_transacao) = upper(trim(NEW.id_transacao)) AND id IS DISTINCT FROM NEW.id LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Comprovante duplicado: o ID de transação % já foi enviado para % (valor R$ %, data %).',
        NEW.id_transacao, NEW.vendedor, v_existente.valor, to_char(v_existente.data_pagamento, 'DD/MM/YYYY') USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Mesmo valor + data + pagador só é duplicado quando não há ID de transação/instituição diferentes
  SELECT id, data_pagamento, valor, pagador_nome INTO v_existente FROM public.revendedor_comprovantes
  WHERE vendedor = NEW.vendedor AND valor = NEW.valor AND data_pagamento = NEW.data_pagamento
    AND public.norm_pagador_key(pagador_documento, pagador_nome) = public.norm_pagador_key(NEW.pagador_documento, NEW.pagador_nome)
    AND id IS DISTINCT FROM NEW.id
    AND NOT (NULLIF(trim(id_transacao), '') IS NOT NULL AND NULLIF(trim(NEW.id_transacao), '') IS NOT NULL
             AND upper(trim(id_transacao)) <> upper(trim(NEW.id_transacao)))
    AND NOT (NULLIF(trim(instituicao_origem), '') IS NOT NULL AND NULLIF(trim(NEW.instituicao_origem), '') IS NOT NULL
             AND upper(trim(instituicao_origem)) <> upper(trim(NEW.instituicao_origem)))
    AND NULLIF(trim(NEW.id_transacao), '') IS NULL
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Comprovante duplicado: já existe um comprovante de % com valor R$ %, data % e o mesmo pagador (%).',
      NEW.vendedor, NEW.valor, to_char(v_existente.data_pagamento, 'DD/MM/YYYY'), COALESCE(v_existente.pagador_nome, 'não identificado') USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END; $$;