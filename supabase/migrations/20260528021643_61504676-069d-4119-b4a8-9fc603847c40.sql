CREATE OR REPLACE FUNCTION public.aplicar_mudanca_preco(
  _tipo text,
  _target_id uuid,
  _preco_depois numeric,
  _escopo text,
  _data_corte timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _aplicar_em timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _observacao text DEFAULT NULL::text,
  _modo text DEFAULT 'congelar'
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target_label text := '';
  v_categoria_slug text := NULL;
  v_campo_slug text := NULL;
  v_preco_antes numeric := 0;
  v_delta numeric;
  v_mudanca_id uuid;
  v_ped record;
  v_qtd integer;
  v_valor_delta numeric;
  v_total_ajustados integer := 0;
  v_total_compensado numeric := 0;
  v_data_corte timestamptz;
  v_hist jsonb;
  v_preco_novo numeric;
  v_descricao text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode alterar preços com ajuste retroativo';
  END IF;
  IF _tipo NOT IN ('ficha_variacao','custom_option') THEN
    RAISE EXCEPTION 'Tipo inválido: %', _tipo;
  END IF;
  IF _escopo NOT IN ('desde_inicio','data_especifica','futuro') THEN
    RAISE EXCEPTION 'Escopo inválido: %', _escopo;
  END IF;
  IF _modo NOT IN ('congelar','recalcular') THEN
    RAISE EXCEPTION 'Modo inválido: %', _modo;
  END IF;

  -- Carrega preço antes + labels
  IF _tipo = 'ficha_variacao' THEN
    SELECT v.nome, COALESCE(v.preco_adicional,0), fcat.slug, fc.slug
      INTO v_target_label, v_preco_antes, v_categoria_slug, v_campo_slug
      FROM public.ficha_variacoes v
      LEFT JOIN public.ficha_campos fc ON fc.id = v.campo_id
      LEFT JOIN public.ficha_categorias fcat ON fcat.id = v.categoria_id
      WHERE v.id = _target_id;
  ELSE
    SELECT co.label, COALESCE(co.preco,0), co.categoria
      INTO v_target_label, v_preco_antes, v_categoria_slug
      FROM public.custom_options co
      WHERE co.id = _target_id;
  END IF;

  IF v_target_label IS NULL THEN
    RAISE EXCEPTION 'Variação/opção não encontrada';
  END IF;

  v_delta := COALESCE(_preco_depois,0) - v_preco_antes;

  v_data_corte := CASE
    WHEN _escopo = 'desde_inicio'   THEN now() + interval '100 years'
    WHEN _escopo = 'data_especifica' THEN COALESCE(_data_corte, now())
    WHEN _escopo = 'futuro'          THEN COALESCE(_aplicar_em, now() + interval '1 day')
    ELSE now()
  END;

  INSERT INTO public.preco_mudancas
    (created_by, tipo, target_id, target_label, categoria_slug, campo_slug,
     preco_antes, preco_depois, delta, escopo, data_corte, aplicar_em,
     status, observacao)
  VALUES
    (auth.uid(), _tipo, _target_id, v_target_label, v_categoria_slug, v_campo_slug,
     v_preco_antes, _preco_depois, v_delta, _escopo, v_data_corte, _aplicar_em,
     CASE WHEN _escopo = 'futuro' THEN 'pendente' ELSE 'aplicada' END,
     COALESCE(_observacao,'') || CASE WHEN _modo='recalcular' THEN ' [modo: recalcular]' ELSE '' END)
  RETURNING id INTO v_mudanca_id;

  -- Se for futuro, não toca em pedido nem no preço agora
  IF _escopo = 'futuro' THEN
    RETURN jsonb_build_object(
      'mudanca_id', v_mudanca_id,
      'pedidos_ajustados', 0,
      'agendado_para', _aplicar_em,
      'status', 'pendente',
      'modo', _modo
    );
  END IF;

  -- Itera pedidos elegíveis
  FOR v_ped IN
    SELECT o.id, o.preco, o.quantidade, o.status, o.numero, o.tipo_extra, o.extra_detalhes
      FROM public.orders o
     WHERE o.created_at < v_data_corte
       AND o.status <> 'Cancelado'
       AND COALESCE(o.preco_congelado, false) = false
  LOOP
    -- Quantidade aplicada: para bota_pronta_entrega com múltiplas botas usa o tamanho do array
    IF v_ped.tipo_extra = 'bota_pronta_entrega'
       AND jsonb_typeof(v_ped.extra_detalhes->'botas') = 'array'
       AND jsonb_array_length(v_ped.extra_detalhes->'botas') > 0 THEN
      v_qtd := jsonb_array_length(v_ped.extra_detalhes->'botas');
    ELSE
      v_qtd := GREATEST(COALESCE(v_ped.quantidade,1), 1);
    END IF;
    v_valor_delta := v_delta * v_qtd;  -- positivo = aumento, negativo = desconto
    v_total_compensado := v_total_compensado + v_valor_delta;
    v_total_ajustados := v_total_ajustados + 1;

    IF _modo = 'recalcular' THEN
      v_preco_novo := GREATEST(0, COALESCE(v_ped.preco,0) + v_valor_delta);
      v_descricao := format('Preço RECALCULADO por mudança retroativa: %s %s → %s (Δ R$ %s × %s un = R$ %s)',
                            v_target_label,
                            to_char(v_preco_antes,'FM999G990D00'),
                            to_char(_preco_depois,'FM999G990D00'),
                            to_char(v_delta,'FM999G990D00'),
                            v_qtd,
                            to_char(v_valor_delta,'FM999G990D00'));
    ELSE
      v_preco_novo := v_ped.preco;
      v_descricao := format('Preço congelado por mudança retroativa: %s %s → %s (compensação R$ %s)',
                            v_target_label,
                            to_char(v_preco_antes,'FM999G990D00'),
                            to_char(_preco_depois,'FM999G990D00'),
                            to_char(-v_valor_delta,'FM999G990D00'));
    END IF;

    v_hist := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', v_ped.status,
      'descricao', v_descricao,
      'usuario', COALESCE(public.current_user_nome_completo(),'Sistema'),
      'mudanca_id', v_mudanca_id::text,
      'modo', _modo
    );

    UPDATE public.orders
       SET preco = v_preco_novo,
           preco_congelado = true,
           extra_detalhes = COALESCE(extra_detalhes, '{}'::jsonb)
             || jsonb_build_object(
                  'ajustes_retroativos',
                  COALESCE(extra_detalhes->'ajustes_retroativos','[]'::jsonb)
                    || jsonb_build_array(jsonb_build_object(
                      'mudanca_id', v_mudanca_id,
                      'variacao', v_target_label,
                      'preco_antes', v_preco_antes,
                      'preco_depois', _preco_depois,
                      'qtd_aplicada', v_qtd,
                      'valor_total_delta', v_valor_delta,
                      'modo', _modo,
                      'preco_pedido_antes', v_ped.preco,
                      'preco_pedido_depois', v_preco_novo,
                      'data', now()
                    ))
                ),
           historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(v_hist)
     WHERE id = v_ped.id;

    INSERT INTO public.preco_mudanca_aplicacoes
      (mudanca_id, order_id, qtd_aplicada, valor_unit_delta, valor_total_delta,
       preco_antes_pedido, preco_depois_pedido)
    VALUES
      (v_mudanca_id, v_ped.id, v_qtd, v_delta, v_valor_delta,
       v_ped.preco, v_preco_novo);
  END LOOP;

  -- Atualiza a variação/opção AGORA (preço novo vale a partir daqui)
  IF _tipo = 'ficha_variacao' THEN
    UPDATE public.ficha_variacoes SET preco_adicional = _preco_depois WHERE id = _target_id;
  ELSE
    UPDATE public.custom_options SET preco = _preco_depois WHERE id = _target_id;
  END IF;

  UPDATE public.preco_mudancas
     SET pedidos_ajustados = v_total_ajustados,
         valor_total_compensado = v_total_compensado,
         applied_at = now()
   WHERE id = v_mudanca_id;

  RETURN jsonb_build_object(
    'mudanca_id', v_mudanca_id,
    'pedidos_ajustados', v_total_ajustados,
    'valor_total_compensado', v_total_compensado,
    'status', 'aplicada',
    'modo', _modo
  );
END;
$function$;