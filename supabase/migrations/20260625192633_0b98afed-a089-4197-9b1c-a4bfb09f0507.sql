CREATE OR REPLACE FUNCTION public.excluir_estoque_produto(_produto_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prod record;
  v_pedidos_liberados int := 0;
BEGIN
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admins podem excluir produtos do estoque';
  END IF;

  SELECT * INTO v_prod FROM public.estoque_produtos WHERE id = _produto_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto nao encontrado'; END IF;

  UPDATE public.orders
     SET estoque_baixado = false,
         estoque_produto_id = NULL,
         historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
           'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
           'local', status,
           'descricao', format('Produto de estoque excluido (%s tam %s) - pedido liberado para recriar estoque', v_prod.nome, v_prod.tamanho),
           'usuario', COALESCE(public.current_user_nome_completo(),'Admin')
         ))
   WHERE estoque_produto_id = _produto_id;
  GET DIAGNOSTICS v_pedidos_liberados = ROW_COUNT;

  DELETE FROM public.estoque_produtos WHERE id = _produto_id;

  RETURN jsonb_build_object(
    'ok', true,
    'produto_id', _produto_id,
    'pedidos_liberados', v_pedidos_liberados
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.excluir_estoque_produto(uuid) TO authenticated;