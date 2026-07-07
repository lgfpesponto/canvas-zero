
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS observacao_entrega text,
  ADD COLUMN IF NOT EXISTS observacao_entrega_por text,
  ADD COLUMN IF NOT EXISTS observacao_entrega_em timestamptz;

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
BEGIN
  IF NOT (has_role(auth.uid(), 'admin_producao'::app_role)
       OR has_role(auth.uid(), 'admin_master'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para registrar observação de entrega';
  END IF;

  SELECT id, numero, vendedor, status, observacao_entrega
    INTO ped
    FROM public.orders
   WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  autor_nome := current_user_nome_completo();
  texto_limpo := NULLIF(btrim(coalesce(_texto, '')), '');
  texto_anterior := NULLIF(btrim(coalesce(ped.observacao_entrega, '')), '');

  UPDATE public.orders
     SET observacao_entrega = texto_limpo,
         observacao_entrega_por = CASE WHEN texto_limpo IS NULL THEN NULL ELSE autor_nome END,
         observacao_entrega_em  = CASE WHEN texto_limpo IS NULL THEN NULL ELSE now() END
   WHERE id = _order_id;

  -- Notifica o vendedor se houver texto novo/alterado
  IF texto_limpo IS NOT NULL
     AND texto_limpo IS DISTINCT FROM texto_anterior
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
