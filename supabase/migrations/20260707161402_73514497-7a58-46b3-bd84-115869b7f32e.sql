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
  valor numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN
    RAISE EXCEPTION 'Apenas admin_master pode aprovar solicitações';
  END IF;

  SELECT * INTO s FROM public.order_ajuste_solicitacoes WHERE id = _solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  SELECT * INTO ped FROM public.orders WHERE id = s.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  valor := COALESCE(s.desconto_solicitado, s.valor_solicitado, 0);
  novo_desconto := COALESCE(ped.desconto, 0) + valor;
  novo_preco := GREATEST(COALESCE(ped.preco, 0) - valor, 0);

  SELECT COALESCE(nome_completo, nome_usuario) INTO admin_nome FROM public.profiles WHERE id = auth.uid();

  UPDATE public.orders
     SET desconto = novo_desconto,
         desconto_justificativa = s.motivo,
         preco = novo_preco,
         historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
           'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
           'local', 'Ajuste de Valor',
           'descricao', 'Ajuste aprovado por ' || COALESCE(admin_nome,'admin') || ': desconto de R$ ' || to_char(valor, 'FM999999990.00') || ' aplicado. Motivo do vendedor: ' || s.motivo,
           'usuario', COALESCE(admin_nome, 'admin')
         ))
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
      'Ajuste de preço APROVADO: desconto de R$ ' || to_char(valor, 'FM999999990.00') || ' aplicado. Motivo: ' || s.motivo,
      auth.uid()
    );
  END IF;
END;
$$;