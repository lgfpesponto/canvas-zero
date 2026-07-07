
ALTER TABLE public.order_ajuste_solicitacoes
  ADD COLUMN IF NOT EXISTS desconto_solicitado numeric NOT NULL DEFAULT 0;

ALTER TABLE public.order_ajuste_solicitacoes
  ALTER COLUMN valor_solicitado SET DEFAULT 0,
  ALTER COLUMN valor_solicitado DROP NOT NULL;

-- Atualiza check de status (se existir)
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
   WHERE conrelid = 'public.order_ajuste_solicitacoes'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.order_ajuste_solicitacoes DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.order_ajuste_solicitacoes
  ADD CONSTRAINT order_ajuste_solicitacoes_status_check
  CHECK (status IN ('pendente','aprovado','negado','visto'));

-- Função marcar como visto
CREATE OR REPLACE FUNCTION public.marcar_ajuste_visto(_solicitacao_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sol record;
  ped record;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin master pode marcar como visto';
  END IF;

  SELECT * INTO sol FROM public.order_ajuste_solicitacoes WHERE id = _solicitacao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;

  UPDATE public.order_ajuste_solicitacoes
     SET status = 'visto',
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _solicitacao_id;

  SELECT id, numero, vendedor, status INTO ped FROM public.orders WHERE id = sol.order_id;

  IF ped.vendedor IS NOT NULL AND length(btrim(ped.vendedor)) > 0 AND ped.vendedor <> 'Estoque' THEN
    INSERT INTO public.order_notificacoes
      (order_id, vendedor, numero, descricao, status_no_momento, created_by)
    VALUES
      (ped.id, ped.vendedor, ped.numero,
       'Sua solicitação de ajuste de preço (R$ ' || to_char(sol.desconto_solicitado, 'FM999999990.00') || ') foi visualizada pelo admin master.',
       ped.status, auth.uid());
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_ajuste_visto(uuid) TO authenticated;
