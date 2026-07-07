
-- Approve/reject price adjustment requests
CREATE OR REPLACE FUNCTION public.aprovar_ajuste_solicitacao(_solicitacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  ped RECORD;
  novo_desconto numeric;
  novo_preco numeric;
  admin_nome text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN
    RAISE EXCEPTION 'Apenas admin_master pode aprovar solicitações';
  END IF;

  SELECT * INTO s FROM public.order_ajuste_solicitacoes WHERE id = _solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  SELECT * INTO ped FROM public.orders WHERE id = s.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  novo_desconto := COALESCE(ped.desconto, 0) + COALESCE(s.desconto_solicitado, s.valor_solicitado, 0);
  novo_preco := GREATEST(COALESCE(ped.preco, 0) - COALESCE(s.desconto_solicitado, s.valor_solicitado, 0), 0);

  SELECT COALESCE(nome_completo, nome_usuario) INTO admin_nome FROM public.profiles WHERE id = auth.uid();

  UPDATE public.orders
     SET desconto = novo_desconto,
         desconto_justificativa = COALESCE(NULLIF(desconto_justificativa,'') || E'\n', '')
           || 'Solicitação aprovada por ' || COALESCE(admin_nome,'admin') || ': ' || s.motivo,
         preco = novo_preco,
         updated_at = now()
   WHERE id = s.order_id;

  UPDATE public.order_ajuste_solicitacoes
     SET status = 'aprovado',
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _solicitacao_id;

  IF ped.vendedor IS NOT NULL AND ped.vendedor <> '' AND ped.vendedor <> 'Estoque' THEN
    INSERT INTO public.order_notificacoes (order_id, numero, vendedor, status_no_momento, descricao, created_by)
    VALUES (
      ped.id, ped.numero, ped.vendedor, ped.status,
      'Ajuste de preço APROVADO: desconto de R$ ' || to_char(COALESCE(s.desconto_solicitado, s.valor_solicitado, 0), 'FM999999990.00') || ' aplicado. Motivo: ' || s.motivo,
      auth.uid()
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recusar_ajuste_solicitacao(_solicitacao_id uuid, _resposta text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  ped RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN
    RAISE EXCEPTION 'Apenas admin_master pode recusar solicitações';
  END IF;

  SELECT * INTO s FROM public.order_ajuste_solicitacoes WHERE id = _solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  UPDATE public.order_ajuste_solicitacoes
     SET status = 'negado',
         resposta_admin = _resposta,
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _solicitacao_id;

  SELECT * INTO ped FROM public.orders WHERE id = s.order_id;
  IF ped.vendedor IS NOT NULL AND ped.vendedor <> '' AND ped.vendedor <> 'Estoque' THEN
    INSERT INTO public.order_notificacoes (order_id, numero, vendedor, status_no_momento, descricao, created_by)
    VALUES (
      ped.id, ped.numero, ped.vendedor, ped.status,
      'Ajuste de preço NEGADO. Desconto solicitado: R$ ' || to_char(COALESCE(s.desconto_solicitado, s.valor_solicitado, 0), 'FM999999990.00') ||
        CASE WHEN _resposta IS NOT NULL AND _resposta <> '' THEN '. Resposta do admin: ' || _resposta ELSE '' END,
      auth.uid()
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_ajuste_solicitacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recusar_ajuste_solicitacao(uuid, text) TO authenticated;
