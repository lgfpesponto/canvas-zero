ALTER TABLE public.financeiro_a_receber ADD COLUMN IF NOT EXISTS comprovante_hash text;
ALTER TABLE public.financeiro_a_pagar ADD COLUMN IF NOT EXISTS comprovante_hash text;
CREATE INDEX IF NOT EXISTS idx_financeiro_a_receber_hash ON public.financeiro_a_receber(comprovante_hash) WHERE comprovante_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financeiro_a_pagar_hash ON public.financeiro_a_pagar(comprovante_hash) WHERE comprovante_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financeiro_a_receber_triple ON public.financeiro_a_receber(valor, data_pagamento, destinatario);