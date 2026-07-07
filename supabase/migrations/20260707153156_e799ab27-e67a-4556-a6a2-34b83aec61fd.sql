
DROP FUNCTION IF EXISTS public.criar_ajuste_solicitacao(uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.criar_ajuste_solicitacao(
  _order_id uuid, _desconto numeric, _motivo text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ped record;
  meu_nome text;
  novo_id uuid;
BEGIN
  meu_nome := current_user_nome_completo();
  IF meu_nome IS NULL THEN RAISE EXCEPTION 'Usuário não identificado'; END IF;
  IF _motivo IS NULL OR length(btrim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;
  IF _desconto IS NULL OR _desconto <= 0 THEN
    RAISE EXCEPTION 'Valor de desconto inválido';
  END IF;

  SELECT id, numero, vendedor, status, preco, erro_de_pedido_id INTO ped
    FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF ped.erro_de_pedido_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pedidos de erro não permitem solicitação de ajuste';
  END IF;
  IF ped.vendedor <> meu_nome AND NOT has_role(auth.uid(),'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Pedido não pertence ao vendedor';
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_ajuste_solicitacoes
              WHERE order_id = _order_id AND status = 'pendente') THEN
    RAISE EXCEPTION 'Já existe uma solicitação pendente para este pedido';
  END IF;

  INSERT INTO public.order_ajuste_solicitacoes
    (order_id, vendedor, numero, valor_atual, valor_solicitado, desconto_solicitado, motivo, created_by)
  VALUES
    (ped.id, ped.vendedor, ped.numero, COALESCE(ped.preco,0), 0, _desconto, _motivo, auth.uid())
  RETURNING id INTO novo_id;

  RETURN novo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_ajuste_solicitacao(uuid, numeric, text) TO authenticated;
