ALTER TABLE public.nfe_notas
ADD COLUMN IF NOT EXISTS tipo_nota text NOT NULL DEFAULT 'normal';

UPDATE public.nfe_notas
SET tipo_nota = CASE
  WHEN natureza_operacao ILIKE '%COMPLEMENT%' THEN 'complementar'
  WHEN natureza_operacao ILIKE '%DEVOLU%' THEN 'devolucao'
  ELSE 'normal'
END
WHERE tipo_nota = 'normal';

CREATE UNIQUE INDEX IF NOT EXISTS nfe_notas_bagy_normal_ativa_unique
ON public.nfe_notas (bagy_pedido_id)
WHERE bagy_pedido_id IS NOT NULL
  AND tipo_nota = 'normal'
  AND status IN ('processando', 'autorizada');