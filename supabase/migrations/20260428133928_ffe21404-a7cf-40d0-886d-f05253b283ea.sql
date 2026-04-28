CREATE OR REPLACE FUNCTION public.registrar_alteracoes_pos_entrega(_order_id uuid, _descricoes text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ped record;
  d text;
  inseridas integer := 0;
  vendedor_user_id uuid;
BEGIN
  IF _descricoes IS NULL OR array_length(_descricoes, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT id, numero, vendedor, status
    INTO ped
    FROM public.orders
   WHERE id = _order_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  IF ped.vendedor IS NULL OR length(trim(ped.vendedor)) = 0 OR ped.vendedor = 'Estoque' THEN
    RETURN 0;
  END IF;

  -- Não notifica o próprio vendedor das suas próprias edições
  SELECT id INTO vendedor_user_id
    FROM public.profiles
   WHERE nome_completo = ped.vendedor
   LIMIT 1;

  IF vendedor_user_id IS NOT NULL AND vendedor_user_id = auth.uid() THEN
    RETURN 0;
  END IF;

  FOREACH d IN ARRAY _descricoes LOOP
    IF d IS NULL OR length(trim(d)) = 0 THEN CONTINUE; END IF;
    INSERT INTO public.order_notificacoes
      (order_id, vendedor, numero, descricao, status_no_momento, created_by)
    VALUES
      (ped.id, ped.vendedor, ped.numero, d, ped.status, auth.uid());
    inseridas := inseridas + 1;
  END LOOP;

  RETURN inseridas;
END;
$function$;