CREATE OR REPLACE FUNCTION public.aprovar_ajuste_solicitacao(_solicitacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  ped RECORD;
  novo_desconto numeric;
  novo_preco numeric;
  admin_nome text;
  valor numeric;
  prefixo text := 'solicitação de ajuste motivo: ';
  motivo_prefixado text;
  data_str text;
  hora_str text;
  alteracoes_json jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN
    RAISE EXCEPTION 'Apenas admin_master pode aprovar solicitações';
  END IF;

  SELECT * INTO s FROM public.order_ajuste_solicitacoes WHERE id = _solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  SELECT * INTO ped FROM public.orders WHERE id = s.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  valor := COALESCE(s.desconto_solicitado, s.valor_solicitado, 0);
  novo_desconto := COALESCE(ped.desconto, 0) + valor;
  novo_preco := GREATEST(COALESCE(ped.preco, 0) - valor, 0);
  motivo_prefixado := prefixo || COALESCE(NULLIF(trim(s.motivo), ''), 'sem motivo informado');
  data_str := to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD');
  hora_str := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');

  SELECT COALESCE(nome_completo, nome_usuario) INTO admin_nome FROM public.profiles WHERE id = auth.uid();

  alteracoes_json := jsonb_build_array(
    jsonb_build_object(
      'data', data_str,
      'hora', hora_str,
      'usuario', COALESCE(admin_nome, 'admin'),
      'descricao', CASE
        WHEN COALESCE(ped.desconto, 0) = 0 THEN 'Adicionado Desconto: "' || to_char(novo_desconto, 'FM999999990.00') || '"'
        ELSE 'Alterado Desconto de "' || to_char(COALESCE(ped.desconto, 0), 'FM999999990.00') || '" para "' || to_char(novo_desconto, 'FM999999990.00') || '"'
      END,
      'justificativa', motivo_prefixado,
      'afetouValor', true
    ),
    jsonb_build_object(
      'data', data_str,
      'hora', hora_str,
      'usuario', COALESCE(admin_nome, 'admin'),
      'descricao', CASE
        WHEN ped.desconto_justificativa IS NULL OR trim(ped.desconto_justificativa) = '' THEN 'Adicionado Justificativa do Desconto: "' || motivo_prefixado || '"'
        ELSE 'Alterado Justificativa do Desconto de "' || ped.desconto_justificativa || '" para "' || motivo_prefixado || '"'
      END,
      'justificativa', motivo_prefixado,
      'afetouValor', true
    ),
    jsonb_build_object(
      'data', data_str,
      'hora', hora_str,
      'usuario', COALESCE(admin_nome, 'admin'),
      'descricao', 'Alterado Valor total de "' || to_char(COALESCE(ped.preco, 0), 'FM999999990.00') || '" para "' || to_char(novo_preco, 'FM999999990.00') || '"',
      'justificativa', motivo_prefixado,
      'afetouValor', true
    )
  );

  UPDATE public.orders
     SET desconto = novo_desconto,
         desconto_justificativa = motivo_prefixado,
         preco = novo_preco,
         alteracoes = COALESCE(alteracoes, '[]'::jsonb) || alteracoes_json,
         historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'data', data_str,
           'hora', hora_str,
           'local', 'Ajuste de Valor',
           'descricao', 'Ajuste aprovado por ' || COALESCE(admin_nome,'admin') || ': desconto de R$ ' || to_char(valor, 'FM999999990.00') || ' aplicado. ' || motivo_prefixado,
           'usuario', COALESCE(admin_nome, 'admin')
         ))
   WHERE id = s.order_id;

  UPDATE public.order_ajuste_solicitacoes
     SET status = 'aprovado',
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _solicitacao_id;

  IF ped.vendedor IS NOT NULL AND ped.vendedor <> '' AND ped.vendedor <> 'Estoque' THEN
    INSERT INTO public.order_notificacoes (order_id, numero, vendedor, status_no_momento, descricao, created_by)
    VALUES (
      ped.id, ped.numero, ped.vendedor, ped.status,
      'Solicitação de ajuste de preço APROVADA: desconto de R$ ' || to_char(valor, 'FM999999990.00') || ' aplicado no pedido. ' || motivo_prefixado,
      auth.uid()
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recusar_ajuste_solicitacao(_solicitacao_id uuid, _resposta text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  ped RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN
    RAISE EXCEPTION 'Apenas admin_master pode recusar solicitações';
  END IF;

  SELECT * INTO s FROM public.order_ajuste_solicitacoes WHERE id = _solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  UPDATE public.order_ajuste_solicitacoes
     SET status = 'negado',
         resposta_admin = _resposta,
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _solicitacao_id;

  SELECT * INTO ped FROM public.orders WHERE id = s.order_id;
  IF ped.vendedor IS NOT NULL AND ped.vendedor <> '' AND ped.vendedor <> 'Estoque' THEN
    INSERT INTO public.order_notificacoes (order_id, numero, vendedor, status_no_momento, descricao, created_by)
    VALUES (
      ped.id, ped.numero, ped.vendedor, ped.status,
      'Solicitação de ajuste de preço NEGADA. Desconto solicitado: R$ ' || to_char(COALESCE(s.desconto_solicitado, s.valor_solicitado, 0), 'FM999999990.00') ||
        CASE WHEN _resposta IS NOT NULL AND trim(_resposta) <> '' THEN '. Resposta do admin: ' || _resposta ELSE '' END,
      auth.uid()
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decidir_ajuste_solicitacao(_id uuid, _aprovar boolean, _resposta text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sol record;
  ord record;
  hist jsonb;
  alteracoes_json jsonb;
  admin_nome text;
  prefixo text := 'solicitação de ajuste motivo: ';
  motivo_prefixado text;
  data_str text;
  hora_str text;
BEGIN
  IF NOT has_role(auth.uid(),'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master';
  END IF;

  SELECT * INTO sol FROM public.order_ajuste_solicitacoes WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF sol.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  SELECT * INTO ord FROM public.orders WHERE id = sol.order_id FOR UPDATE;
  SELECT COALESCE(nome_completo, nome_usuario) INTO admin_nome FROM public.profiles WHERE id = auth.uid();

  data_str := to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD');
  hora_str := to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI');
  motivo_prefixado := prefixo || COALESCE(NULLIF(trim(sol.motivo), ''), 'sem motivo informado');

  IF _aprovar THEN
    hist := jsonb_build_object(
      'data', data_str,
      'hora', hora_str,
      'local', 'Ajuste de Valor',
      'descricao', format('Ajuste de valor aprovado: R$ %s -> R$ %s. %s',
                           to_char(sol.valor_atual,'FM999999990.00'),
                           to_char(sol.valor_solicitado,'FM999999990.00'),
                           motivo_prefixado),
      'usuario', COALESCE(admin_nome, current_user_nome_completo(), 'Admin')
    );

    alteracoes_json := jsonb_build_array(
      jsonb_build_object(
        'data', data_str,
        'hora', hora_str,
        'usuario', COALESCE(admin_nome, current_user_nome_completo(), 'Admin'),
        'descricao', 'Alterado Valor total de "' || to_char(COALESCE(sol.valor_atual, 0),'FM999999990.00') || '" para "' || to_char(COALESCE(sol.valor_solicitado, 0),'FM999999990.00') || '"',
        'justificativa', motivo_prefixado,
        'afetouValor', true
      ),
      jsonb_build_object(
        'data', data_str,
        'hora', hora_str,
        'usuario', COALESCE(admin_nome, current_user_nome_completo(), 'Admin'),
        'descricao', CASE
          WHEN ord.desconto_justificativa IS NULL OR trim(ord.desconto_justificativa) = '' THEN 'Adicionado Justificativa do Desconto: "' || motivo_prefixado || '"'
          ELSE 'Alterado Justificativa do Desconto de "' || ord.desconto_justificativa || '" para "' || motivo_prefixado || '"'
        END,
        'justificativa', motivo_prefixado,
        'afetouValor', true
      )
    );

    UPDATE public.orders
       SET preco = sol.valor_solicitado,
           desconto_justificativa = motivo_prefixado,
           preco_congelado = false,
           historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(hist),
           alteracoes = COALESCE(alteracoes,'[]'::jsonb) || alteracoes_json
     WHERE id = sol.order_id;
  END IF;

  UPDATE public.order_ajuste_solicitacoes
     SET status = CASE WHEN _aprovar THEN 'aprovado' ELSE 'negado' END,
         resposta_admin = _resposta,
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _id;

  IF COALESCE(sol.vendedor, '') <> '' AND sol.vendedor <> 'Estoque' THEN
    INSERT INTO public.order_notificacoes
      (order_id, vendedor, numero, status_no_momento, descricao, created_by)
    VALUES
      (sol.order_id, sol.vendedor, COALESCE(ord.numero, sol.numero),
       COALESCE(ord.status,'Entregue'),
       CASE WHEN _aprovar
            THEN 'Solicitação de ajuste de preço APROVADA: novo valor R$ ' || to_char(sol.valor_solicitado,'FM999999990.00') || '. ' || motivo_prefixado
            ELSE 'Solicitação de ajuste de preço NEGADA.' || CASE WHEN _resposta IS NOT NULL AND trim(_resposta) <> '' THEN ' Resposta do admin: ' || _resposta ELSE '' END
       END,
       auth.uid());
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _aprovar THEN 'aprovado' ELSE 'negado' END);
END;
$function$;

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
  descricoes_valor text[] := ARRAY[]::text[];
  descricoes_outras text[] := ARRAY[]::text[];
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

  SELECT id INTO vendedor_user_id
    FROM public.profiles
   WHERE nome_completo = ped.vendedor
   LIMIT 1;

  IF vendedor_user_id IS NOT NULL AND vendedor_user_id = auth.uid() THEN
    RETURN 0;
  END IF;

  FOREACH d IN ARRAY _descricoes LOOP
    IF d IS NULL OR length(trim(d)) = 0 THEN CONTINUE; END IF;

    IF d ILIKE '%Desconto%'
       OR d ILIKE '%Justificativa do Desconto%'
       OR d ILIKE '%Valor total%'
       OR d ILIKE '%Acréscimo%'
       OR d ILIKE '%Ajuste de valor%'
    THEN
      descricoes_valor := array_append(descricoes_valor, d);
    ELSE
      descricoes_outras := array_append(descricoes_outras, d);
    END IF;
  END LOOP;

  IF array_length(descricoes_valor, 1) IS NOT NULL THEN
    INSERT INTO public.order_notificacoes
      (order_id, vendedor, numero, descricao, status_no_momento, created_by)
    VALUES
      (ped.id, ped.vendedor, ped.numero,
       'Ajuste de valor aplicado no pedido: ' || array_to_string(descricoes_valor, '; '),
       ped.status, auth.uid());
    inseridas := inseridas + 1;
  END IF;

  FOREACH d IN ARRAY descricoes_outras LOOP
    INSERT INTO public.order_notificacoes
      (order_id, vendedor, numero, descricao, status_no_momento, created_by)
    VALUES
      (ped.id, ped.vendedor, ped.numero, d, ped.status, auth.uid());
    inseridas := inseridas + 1;
  END LOOP;

  RETURN inseridas;
END;
$function$;