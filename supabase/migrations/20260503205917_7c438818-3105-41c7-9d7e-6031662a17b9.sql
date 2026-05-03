-- RLS: usuário 'bordado' vê apenas pedidos nas etapas de bordado
CREATE POLICY "Bordado users can view bordado orders"
ON public.orders FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'bordado'::app_role)
  AND status IN ('Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos')
);

-- RLS: usuário 'bordado' pode atualizar apenas pedidos atualmente nessas etapas
CREATE POLICY "Bordado users can update bordado orders"
ON public.orders FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'bordado'::app_role)
  AND status IN ('Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos')
);

-- RPC para baixar pedido em modo bordado, com histórico automático
CREATE OR REPLACE FUNCTION public.bordado_baixar_pedido(_order_id uuid, _novo_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ped record;
  usuario_nome text;
  hist_entry jsonb;
BEGIN
  IF NOT (has_role(auth.uid(), 'bordado'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  IF _novo_status NOT IN ('Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos') THEN
    RAISE EXCEPTION 'Status inválido para o portal bordado';
  END IF;

  SELECT id, numero, status INTO ped FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- Para usuários 'bordado', só permite mexer em pedidos já em etapas de bordado
  IF has_role(auth.uid(), 'bordado'::app_role)
     AND NOT has_role(auth.uid(), 'admin_master'::app_role)
     AND ped.status NOT IN ('Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos') THEN
    RAISE EXCEPTION 'Pedido fora das etapas de bordado';
  END IF;

  IF ped.status = _novo_status THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;

  usuario_nome := COALESCE(public.current_user_nome_completo(), 'Bordado');

  hist_entry := jsonb_build_object(
    'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
    'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    'local', _novo_status,
    'descricao', 'Pedido movido para ' || _novo_status,
    'usuario', usuario_nome
  );

  UPDATE public.orders
  SET status = _novo_status,
      historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
  WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'changed', true, 'novo_status', _novo_status);
END;
$$;

REVOKE ALL ON FUNCTION public.bordado_baixar_pedido(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bordado_baixar_pedido(uuid, text) TO authenticated;