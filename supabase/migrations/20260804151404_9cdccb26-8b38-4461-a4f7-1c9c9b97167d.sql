-- Normalização imutável do pagador (documento tem prioridade; senão nome sem acento/pontuação)
CREATE OR REPLACE FUNCTION public.norm_pagador_key(_doc text, _nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(regexp_replace(COALESCE(_doc, ''), '[^0-9]', '', 'g'), ''),
    NULLIF(
      regexp_replace(
        upper(
          translate(
            COALESCE(_nome, ''),
            'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
            'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
          )
        ),
        '[^A-Z0-9]', '', 'g'
      ),
      ''
    ),
    ''
  )
$$;

-- Marca as linhas duplicadas já existentes para que os índices possam ser criados sem quebrar o histórico
ALTER TABLE public.revendedor_comprovantes
  ADD COLUMN IF NOT EXISTS dup_legado boolean NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY vendedor, valor, data_pagamento,
                        public.norm_pagador_key(pagador_documento, pagador_nome)
           ORDER BY created_at
         ) AS rn
  FROM public.revendedor_comprovantes
)
UPDATE public.revendedor_comprovantes c
SET dup_legado = true
FROM ranked r
WHERE r.id = c.id AND r.rn > 1;

WITH ranked_hash AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY vendedor, comprovante_hash ORDER BY created_at
         ) AS rn
  FROM public.revendedor_comprovantes
  WHERE comprovante_hash IS NOT NULL
)
UPDATE public.revendedor_comprovantes c
SET dup_legado = true
FROM ranked_hash r
WHERE r.id = c.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_revcomp_vendedor_hash
  ON public.revendedor_comprovantes (vendedor, comprovante_hash)
  WHERE comprovante_hash IS NOT NULL AND dup_legado = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_revcomp_vendedor_triple
  ON public.revendedor_comprovantes (
    vendedor, valor, data_pagamento,
    public.norm_pagador_key(pagador_documento, pagador_nome)
  )
  WHERE dup_legado = false;

-- Trigger com mensagem amigável (roda antes dos índices únicos)
CREATE OR REPLACE FUNCTION public.bloquear_comprovante_duplicado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existente record;
BEGIN
  IF NEW.comprovante_hash IS NOT NULL THEN
    SELECT id, data_pagamento, valor INTO v_existente
    FROM public.revendedor_comprovantes
    WHERE vendedor = NEW.vendedor
      AND comprovante_hash = NEW.comprovante_hash
      AND id IS DISTINCT FROM NEW.id
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Comprovante duplicado: este mesmo arquivo já foi enviado para % (valor R$ %, data %).',
        NEW.vendedor, v_existente.valor, to_char(v_existente.data_pagamento, 'DD/MM/YYYY')
        USING ERRCODE = '23505';
    END IF;
  END IF;

  SELECT id, data_pagamento, valor, pagador_nome INTO v_existente
  FROM public.revendedor_comprovantes
  WHERE vendedor = NEW.vendedor
    AND valor = NEW.valor
    AND data_pagamento = NEW.data_pagamento
    AND public.norm_pagador_key(pagador_documento, pagador_nome)
        = public.norm_pagador_key(NEW.pagador_documento, NEW.pagador_nome)
    AND id IS DISTINCT FROM NEW.id
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Comprovante duplicado: já existe um comprovante de % com valor R$ %, data % e o mesmo pagador (%).',
      NEW.vendedor, NEW.valor, to_char(v_existente.data_pagamento, 'DD/MM/YYYY'),
      COALESCE(v_existente.pagador_nome, 'não identificado')
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_comprovante_duplicado ON public.revendedor_comprovantes;
CREATE TRIGGER trg_bloquear_comprovante_duplicado
  BEFORE INSERT ON public.revendedor_comprovantes
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_comprovante_duplicado();