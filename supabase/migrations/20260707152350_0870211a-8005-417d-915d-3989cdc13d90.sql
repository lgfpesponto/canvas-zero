
CREATE OR REPLACE FUNCTION public.registrar_observacao_entrega(
  _order_id uuid,
  _texto text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ped record;
  autor_nome text;
  texto_limpo text;
  texto_anterior text;
  data_hoje text;
  hora_agora text;
  descricao text;
  nova_alteracao jsonb;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin_producao'::app_role)
       OR has_role(auth.uid(), 'admin_master'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para registrar observação de entrega';
  END IF;

  SELECT id, numero, vendedor, status, observacao_entrega, alteracoes
    INTO ped
    FROM public.orders
   WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  autor_nome := current_user_nome_completo();
  texto_limpo := NULLIF(btrim(coalesce(_texto, '')), '');
  texto_anterior := NULLIF(btrim(coalesce(ped.observacao_entrega, '')), '');

  -- Sem mudança real: não faz nada
  IF texto_limpo IS NOT DISTINCT FROM texto_anterior THEN
    RETURN;
  END IF;

  UPDATE public.orders
     SET observacao_entrega = texto_limpo,
         observacao_entrega_por = CASE WHEN texto_limpo IS NULL THEN NULL ELSE autor_nome END,
         observacao_entrega_em  = CASE WHEN texto_limpo IS NULL THEN NULL ELSE now() END
   WHERE id = _order_id;

  -- Timestamp em Brasília para casar com o formato usado no histórico do app
  data_hoje := to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD');
  hora_agora := to_char(timezone('America/Sao_Paulo', now()), 'HH24:MI');

  IF texto_limpo IS NULL THEN
    descricao := 'Removida Observação de entrega (era: "' || coalesce(texto_anterior, '') || '")';
  ELSIF texto_anterior IS NULL THEN
    descricao := 'Adicionada Observação de entrega: "' || texto_limpo || '"';
  ELSE
    descricao := 'Alterada Observação de entrega de "' || texto_anterior || '" para "' || texto_limpo || '"';
  END IF;

  nova_alteracao := jsonb_build_object(
    'data', data_hoje,
    'hora', hora_agora,
    'usuario', autor_nome,
    'descricao', descricao
  );

  UPDATE public.orders
     SET alteracoes = coalesce(alteracoes, '[]'::jsonb) || jsonb_build_array(nova_alteracao)
   WHERE id = _order_id;

  -- Notifica o vendedor se houver texto novo/alterado
  IF texto_limpo IS NOT NULL
     AND ped.vendedor IS NOT NULL
     AND length(btrim(ped.vendedor)) > 0
     AND ped.vendedor <> 'Estoque' THEN
    INSERT INTO public.order_notificacoes
      (order_id, vendedor, numero, descricao, status_no_momento, created_by)
    VALUES
      (ped.id, ped.vendedor, ped.numero,
       'Nova observação de entrega: "' || texto_limpo || '"',
       ped.status, auth.uid());
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_observacao_entrega(uuid, text) TO authenticated;
