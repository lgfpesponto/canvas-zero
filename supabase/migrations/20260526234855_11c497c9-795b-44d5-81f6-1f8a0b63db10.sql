
-- 1) Permitir novos tipos de notificação de ajuste
ALTER TABLE public.comprovante_notificacoes
  DROP CONSTRAINT IF EXISTS comprovante_notificacoes_tipo_check;
ALTER TABLE public.comprovante_notificacoes
  ADD CONSTRAINT comprovante_notificacoes_tipo_check
  CHECK (tipo IN ('aprovado','reprovado','ajuste_aprovado','ajuste_negado'));

-- 2) Aprovar ajuste passa a CONGELAR o preço (não é mais sobrescrito por recompute)
CREATE OR REPLACE FUNCTION public.decidir_ajuste_solicitacao(_id uuid, _aprovar boolean, _resposta text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sol record;
  hist jsonb;
  alter_entry jsonb;
BEGIN
  IF NOT has_role(auth.uid(),'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master';
  END IF;

  SELECT * INTO sol FROM public.order_ajuste_solicitacoes WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF sol.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  IF _aprovar THEN
    hist := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
      'local', 'Entregue',
      'descricao', format('Ajuste de valor aprovado: R$ %s → R$ %s (motivo: %s)',
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

  INSERT INTO public.comprovante_notificacoes
    (comprovante_id, vendedor, tipo, descricao, valor, motivo)
  VALUES
    (sol.id, sol.vendedor,
     CASE WHEN _aprovar THEN 'ajuste_aprovado' ELSE 'ajuste_negado' END,
     CASE WHEN _aprovar
          THEN 'Seu pedido ' || sol.numero || ' teve o ajuste de valor APROVADO para R$ ' || to_char(sol.valor_solicitado,'FM999G990D00') || '.'
          ELSE 'Seu pedido ' || sol.numero || ' teve o ajuste de valor NEGADO.' || COALESCE(' Motivo: '||_resposta,'')
     END,
     sol.valor_solicitado,
     COALESCE(_resposta, sol.motivo));

  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _aprovar THEN 'aprovado' ELSE 'negado' END);
END;
$$;

-- 3) One-off: corrigir gravatas que ficaram com preco=0 no banco
UPDATE public.orders
   SET preco = 30 * GREATEST(quantidade,1)
 WHERE tipo_extra IN ('gravata_pronta_entrega','gravata_country')
   AND COALESCE(preco,0) = 0;
