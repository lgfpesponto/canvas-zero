-- 1) RLS: incluir Baixa Corte nas policies do role bordado
DROP POLICY IF EXISTS "Bordado users can view bordado orders" ON public.orders;
DROP POLICY IF EXISTS "Bordado users can update bordado orders" ON public.orders;

CREATE POLICY "Bordado users can view bordado orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'bordado'::app_role)
  AND status = ANY (ARRAY[
    'Baixa Corte'::text,
    'Entrada Bordado 7Estrivos'::text,
    'Baixa Bordado 7Estrivos'::text
  ])
);

CREATE POLICY "Bordado users can update bordado orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'bordado'::app_role)
  AND status = ANY (ARRAY[
    'Baixa Corte'::text,
    'Entrada Bordado 7Estrivos'::text,
    'Baixa Bordado 7Estrivos'::text
  ])
);

-- 2) Remove a versão antiga (2 args) para evitar ambiguidade
DROP FUNCTION IF EXISTS public.bordado_baixar_pedido(uuid, text);

-- 3) Recria a RPC permitindo Baixa Corte → Entrada Bordado para o role bordado
CREATE OR REPLACE FUNCTION public.bordado_baixar_pedido(
  _order_id uuid,
  _novo_status text,
  _justificativa text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ped record;
  usuario_nome text;
  hist_entry jsonb;
  desc_text text;
BEGIN
  IF NOT (has_role(auth.uid(), 'bordado'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  IF _novo_status NOT IN ('Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos') THEN
    RAISE EXCEPTION 'Status inválido para o portal bordado';
  END IF;

  SELECT id, numero, status INTO ped FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- Para usuários bordado (sem ser admin_master): permite operar em pedidos
  -- já em etapas de bordado OU em Baixa Corte (para dar entrada).
  IF has_role(auth.uid(), 'bordado'::app_role)
     AND NOT has_role(auth.uid(), 'admin_master'::app_role)
     AND ped.status NOT IN ('Entrada Bordado 7Estrivos', 'Baixa Bordado 7Estrivos', 'Baixa Corte') THEN
    RAISE EXCEPTION 'Pedido em "%" — só pode dar entrada bordado a partir de "Baixa Corte"', ped.status;
  END IF;

  IF ped.status = _novo_status THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;

  -- Regra: para chegar em "Baixa Bordado" precisa estar em "Entrada Bordado"
  IF _novo_status = 'Baixa Bordado 7Estrivos'
     AND ped.status <> 'Entrada Bordado 7Estrivos' THEN
    RAISE EXCEPTION 'É preciso passar por Entrada Bordado antes de dar Baixa';
  END IF;

  -- Regra: voltar de Baixa para Entrada exige justificativa
  IF _novo_status = 'Entrada Bordado 7Estrivos'
     AND ped.status = 'Baixa Bordado 7Estrivos'
     AND COALESCE(btrim(_justificativa), '') = '' THEN
    RAISE EXCEPTION 'Justificativa obrigatória para retroceder Baixa → Entrada Bordado';
  END IF;

  usuario_nome := COALESCE(public.current_user_nome_completo(), 'Bordado');

  IF _novo_status = 'Entrada Bordado 7Estrivos' AND ped.status = 'Baixa Bordado 7Estrivos' THEN
    desc_text := 'Retrocesso Baixa→Entrada Bordado: ' || _justificativa;
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
$function$;