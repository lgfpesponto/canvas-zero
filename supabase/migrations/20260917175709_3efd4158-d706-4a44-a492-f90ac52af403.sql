
CREATE OR REPLACE FUNCTION public.list_corte_usuarios()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(p.nome_completo ORDER BY p.nome_completo), ARRAY[]::text[])
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role::text = 'corte';
$$;

REVOKE ALL ON FUNCTION public.list_corte_usuarios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_corte_usuarios() TO authenticated;

CREATE OR REPLACE FUNCTION public.corte_baixar_pedido(_order_id uuid, _novo_status text, _justificativa text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ped record;
  usuario_nome text;
  hist_entry jsonb;
  desc_text text;
  is_corte boolean;
  is_master boolean;
  tipo text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'corte') INTO is_corte;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin_master') INTO is_master;

  IF NOT (is_corte OR is_master) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  IF _novo_status NOT IN ('Corte', 'Baixa Corte') THEN
    RAISE EXCEPTION 'Status inválido para o portal corte';
  END IF;

  SELECT id, numero, status, tipo_extra INTO ped FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  tipo := COALESCE(NULLIF(btrim(ped.tipo_extra), ''), 'bota');
  IF tipo NOT IN ('bota', 'cinto') THEN
    RAISE EXCEPTION 'Somente pedidos de bota e cinto passam pelo corte';
  END IF;

  IF ped.status = _novo_status THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;

  IF _novo_status = 'Corte'
     AND ped.status NOT IN ('Impresso', 'Baixa Corte') THEN
    RAISE EXCEPTION 'Pedido em "%" — só pode dar entrada no corte a partir de "Impresso"', ped.status;
  END IF;

  IF _novo_status = 'Baixa Corte' AND ped.status <> 'Corte' THEN
    RAISE EXCEPTION 'É preciso passar por Corte antes de dar Baixa';
  END IF;

  IF _novo_status = 'Corte'
     AND ped.status = 'Baixa Corte'
     AND COALESCE(btrim(_justificativa), '') = '' THEN
    RAISE EXCEPTION 'Justificativa obrigatória para retroceder Baixa Corte → Corte';
  END IF;

  usuario_nome := COALESCE(public.current_user_nome_completo(), 'Corte');

  IF _novo_status = 'Corte' AND ped.status = 'Baixa Corte' THEN
    desc_text := 'Retrocesso Baixa Corte→Corte: ' || _justificativa;
  ELSE
    desc_text := 'Pedido movido para ' || _novo_status;
  END IF;

  hist_entry := jsonb_build_object(
    'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
    'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    'local', _novo_status,
    'descricao', desc_text,
    'usuario', usuario_nome,
    'justificativa', _justificativa
  );

  UPDATE public.orders
  SET status = _novo_status,
      historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
  WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'changed', true, 'novo_status', _novo_status);
END;
$$;

REVOKE ALL ON FUNCTION public.corte_baixar_pedido(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.corte_baixar_pedido(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS "Corte users can view corte orders" ON public.orders;
CREATE POLICY "Corte users can view corte orders"
ON public.orders FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'corte')
  AND status = ANY (ARRAY['Impresso'::text, 'Corte'::text, 'Baixa Corte'::text])
);

DROP POLICY IF EXISTS "Corte users can update corte orders" ON public.orders;
CREATE POLICY "Corte users can update corte orders"
ON public.orders FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'corte')
  AND status = ANY (ARRAY['Impresso'::text, 'Corte'::text, 'Baixa Corte'::text])
);
