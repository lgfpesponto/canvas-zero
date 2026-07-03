-- Drop antiga (assinatura 2 args) para evitar ambiguidade com nova de 3 args
DROP FUNCTION IF EXISTS public.montagem_marcar_erro(uuid, text);

CREATE OR REPLACE FUNCTION public.montagem_marcar_erro(
  _order_id uuid,
  _destino text,
  _motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  ped record;
  usuario_nome text;
  hist_entry jsonb;
  is_master boolean;
  is_producao boolean;
  motivo_limpo text;
  justificativa_final text;
  descricao_final text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin_master')
    INTO is_master;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin_producao')
    INTO is_producao;

  IF NOT (is_master OR is_producao) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  IF _destino NOT IN ('Montagem', 'Montagem Ailton') THEN
    RAISE EXCEPTION 'Destino inválido para ERRO MONTAGEM';
  END IF;

  SELECT id, numero, status, extra_detalhes
    INTO ped
    FROM public.orders
   WHERE id = _order_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  usuario_nome := COALESCE(public.current_user_nome_completo(), 'Admin');

  motivo_limpo := NULLIF(btrim(COALESCE(_motivo, '')), '');
  justificativa_final := COALESCE(motivo_limpo, 'ERRO MONTAGEM');
  descricao_final := 'ERRO MONTAGEM — pedido devolvido de "' || ped.status || '" para "' || _destino || '" (não será cobrado novamente)'
                     || CASE WHEN motivo_limpo IS NOT NULL THEN ' — Motivo: ' || motivo_limpo ELSE '' END;

  hist_entry := jsonb_build_object(
    'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
    'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    'local', _destino,
    'descricao', descricao_final,
    'usuario', usuario_nome,
    'justificativa', justificativa_final
  );

  UPDATE public.orders
     SET status = _destino,
         extra_detalhes = COALESCE(extra_detalhes, '{}'::jsonb)
                          || jsonb_build_object('montagem_erro', true),
         historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'id', ped.id, 'novo_status', _destino);
END;
$fn$;

REVOKE ALL ON FUNCTION public.montagem_marcar_erro(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.montagem_marcar_erro(uuid, text, text) TO authenticated;