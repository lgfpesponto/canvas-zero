CREATE OR REPLACE FUNCTION public.decidir_ajuste_solicitacao(_id uuid, _aprovar boolean, _resposta text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sol record;
  ord record;
  hist jsonb;
  alter_entry jsonb;
BEGIN
  IF NOT has_role(auth.uid(),'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master';
  END IF;

  SELECT * INTO sol FROM public.order_ajuste_solicitacoes WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF sol.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  SELECT id, numero, status INTO ord FROM public.orders WHERE id = sol.order_id;

  IF _aprovar THEN
    hist := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
      'local', 'Entregue',
      'descricao', format('Ajuste de valor aprovado: R$ %s -> R$ %s (motivo: %s)',
                           to_char(sol.valor_atual,'FM999G990D00'),
                           to_char(sol.valor_solicitado,'FM999G990D00'),
                           sol.motivo),
      'usuario', COALESCE(current_user_nome_completo(),'Admin')
    );
    alter_entry := jsonb_build_object(
      'data', to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI'),
      'tipo', 'ajuste_valor_solicitado',
      'valor_antes', sol.valor_atual,
      'valor_depois', sol.valor_solicitado,
      'motivo', sol.motivo,
      'solicitacao_id', sol.id::text,
      'usuario', COALESCE(current_user_nome_completo(),'Admin')
    );

    UPDATE public.orders
       SET preco = sol.valor_solicitado,
           preco_congelado = true,
           historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(hist),
           alteracoes = COALESCE(alteracoes,'[]'::jsonb) || jsonb_build_array(alter_entry)
     WHERE id = sol.order_id;
  END IF;

  UPDATE public.order_ajuste_solicitacoes
     SET status = CASE WHEN _aprovar THEN 'aprovado' ELSE 'negado' END,
         resposta_admin = _resposta,
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _id;

  -- Notifica o vendedor via order_notificacoes (sem FK p/ comprovante).
  INSERT INTO public.order_notificacoes
    (order_id, vendedor, numero, status_no_momento, descricao, created_by)
  VALUES
    (sol.order_id, sol.vendedor, COALESCE(ord.numero, sol.numero),
     COALESCE(ord.status,'Entregue'),
     CASE WHEN _aprovar
          THEN 'Seu pedido ' || sol.numero || ' teve o ajuste de valor APROVADO para R$ ' || to_char(sol.valor_solicitado,'FM999G990D00') || '.'
          ELSE 'Seu pedido ' || sol.numero || ' teve o ajuste de valor NEGADO.' || COALESCE(' Motivo: '||_resposta,'')
     END,
     auth.uid());

  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _aprovar THEN 'aprovado' ELSE 'negado' END);
END;
$$;