
CREATE OR REPLACE FUNCTION public.excluir_estoque_produto(_produto_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  DELETE FROM public.bagy_stock_sync_queue WHERE estoque_produto_id = _produto_id;

  DELETE FROM public.estoque_produtos WHERE id = _produto_id;

  RETURN jsonb_build_object(
    'ok', true,
    'produto_id', _produto_id,
    'pedidos_liberados', v_pedidos_liberados
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.excluir_estoque_produto_completo(_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_pedidos_liberados int := 0;
  v_tamanhos_removidos int := 0;
  v_nome text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NAO_AUTENTICADO'; END IF;
  IF NOT (has_role(v_uid,'admin_master'::app_role) OR has_role(v_uid,'admin_producao'::app_role)) THEN
    RAISE EXCEPTION 'PERMISSAO_NEGADA: apenas admin master ou producao podem excluir produtos do estoque';
  END IF;
  IF _ids IS NULL OR array_length(_ids,1) IS NULL THEN
    RAISE EXCEPTION 'IDS_OBRIGATORIOS';
  END IF;

  SELECT nome INTO v_nome FROM public.estoque_produtos
    WHERE id = ANY(_ids) LIMIT 1;

  UPDATE public.orders
     SET estoque_baixado = false,
         estoque_produto_id = NULL,
         historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
           'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
           'local', status,
           'descricao', format('Produto de estoque excluído (%s) - pedido liberado para recriar estoque', COALESCE(v_nome, 'produto')),
           'usuario', COALESCE(public.current_user_nome_completo(),'Admin')
         ))
   WHERE estoque_produto_id = ANY(_ids);
  GET DIAGNOSTICS v_pedidos_liberados = ROW_COUNT;

  INSERT INTO public.estoque_ajustes_log (produto_id, produto_nome, sku_base, tamanho, delta, quantidade_antes, quantidade_depois, motivo, usuario_id, usuario_nome)
  SELECT id, nome, sku_base, tamanho, -quantidade, quantidade, 0, 'Exclusão total do produto', v_uid, public.current_user_nome_completo()
    FROM public.estoque_produtos WHERE id = ANY(_ids);

  DELETE FROM public.bagy_stock_sync_queue WHERE estoque_produto_id = ANY(_ids);

  DELETE FROM public.estoque_produtos WHERE id = ANY(_ids);
  GET DIAGNOSTICS v_tamanhos_removidos = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'tamanhos_removidos', v_tamanhos_removidos,
    'pedidos_liberados', v_pedidos_liberados
  );
END; $function$;
