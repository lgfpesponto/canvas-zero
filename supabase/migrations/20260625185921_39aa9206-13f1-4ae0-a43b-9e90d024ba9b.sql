
CREATE OR REPLACE FUNCTION public.devolver_estoque_pedido(_extra_detalhes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_botas jsonb;
  v_item jsonb;
  v_id uuid;
  v_agg jsonb := '{}'::jsonb;
  v_key text;
  v_qtd integer;
  v_devolvidos jsonb := '[]'::jsonb;
BEGIN
  IF _extra_detalhes IS NULL THEN RETURN jsonb_build_object('devolvidos', v_devolvidos); END IF;
  v_botas := _extra_detalhes->'botas';
  IF v_botas IS NULL OR jsonb_typeof(v_botas) <> 'array' THEN
    RETURN jsonb_build_object('devolvidos', v_devolvidos);
  END IF;

  -- Agrega quantidade por estoque_produto_id
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_botas) LOOP
    v_key := v_item->>'estoque_produto_id';
    IF v_key IS NULL OR length(v_key) = 0 THEN CONTINUE; END IF;
    v_agg := jsonb_set(
      v_agg,
      ARRAY[v_key],
      to_jsonb(COALESCE((v_agg->>v_key)::int, 0) + 1)
    );
  END LOOP;

  -- Aplica somando de volta
  FOR v_key, v_qtd IN SELECT k, (v::text)::int FROM jsonb_each(v_agg) AS t(k, v) LOOP
    v_id := v_key::uuid;
    PERFORM 1 FROM public.estoque_produtos WHERE id = v_id FOR UPDATE;
    UPDATE public.estoque_produtos
       SET quantidade = quantidade + v_qtd,
           updated_at = now()
     WHERE id = v_id;
    v_devolvidos := v_devolvidos || jsonb_build_array(jsonb_build_object('produto_id', v_id, 'qtd', v_qtd));
  END LOOP;

  RETURN jsonb_build_object('devolvidos', v_devolvidos);
END;
$$;

GRANT EXECUTE ON FUNCTION public.devolver_estoque_pedido(jsonb) TO authenticated, service_role;

-- Trigger BEFORE UPDATE: devolve quando passa para Cancelado
CREATE OR REPLACE FUNCTION public.trg_orders_devolve_estoque_cancel_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total int := 0;
  v_item jsonb;
BEGIN
  IF NEW.status = 'Cancelado'
     AND (OLD.status IS DISTINCT FROM 'Cancelado')
     AND COALESCE((NEW.extra_detalhes->>'origem_estoque')::boolean, false) = true
     AND COALESCE((NEW.extra_detalhes->>'estoque_devolvido')::boolean, false) = false
  THEN
    v_result := public.devolver_estoque_pedido(NEW.extra_detalhes);
    -- Marca como devolvido
    NEW.extra_detalhes := jsonb_set(NEW.extra_detalhes, '{estoque_devolvido}', 'true'::jsonb, true);

    -- Conta total de pares devolvidos
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_result->'devolvidos') LOOP
      v_total := v_total + COALESCE((v_item->>'qtd')::int, 0);
    END LOOP;

    IF v_total > 0 THEN
      NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
        'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
        'local', 'Cancelado',
        'descricao', format('Pedido cancelado — %s par(es) devolvido(s) ao estoque', v_total),
        'usuario', COALESCE(public.current_user_nome_completo(), 'Sistema')
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_devolve_estoque_cancel ON public.orders;
CREATE TRIGGER trg_orders_devolve_estoque_cancel
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_devolve_estoque_cancel_fn();

-- Trigger BEFORE DELETE: devolve antes de remover a linha
CREATE OR REPLACE FUNCTION public.trg_orders_devolve_estoque_delete_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE((OLD.extra_detalhes->>'origem_estoque')::boolean, false) = true
     AND COALESCE((OLD.extra_detalhes->>'estoque_devolvido')::boolean, false) = false
  THEN
    PERFORM public.devolver_estoque_pedido(OLD.extra_detalhes);
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_devolve_estoque_delete ON public.orders;
CREATE TRIGGER trg_orders_devolve_estoque_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_devolve_estoque_delete_fn();
