CREATE OR REPLACE FUNCTION public.reabater_estoque_pedido(_extra_detalhes jsonb)
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
  v_saldo integer;
  v_nome text;
  v_tam text;
  v_reabatidos jsonb := '[]'::jsonb;
BEGIN
  IF _extra_detalhes IS NULL THEN RETURN jsonb_build_object('reabatidos', v_reabatidos); END IF;
  v_botas := _extra_detalhes->'botas';
  IF v_botas IS NULL OR jsonb_typeof(v_botas) <> 'array' THEN
    RETURN jsonb_build_object('reabatidos', v_reabatidos);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_botas) LOOP
    v_key := v_item->>'estoque_produto_id';
    IF v_key IS NULL OR length(v_key) = 0 THEN CONTINUE; END IF;
    v_agg := jsonb_set(v_agg, ARRAY[v_key], to_jsonb(COALESCE((v_agg->>v_key)::int, 0) + 1));
  END LOOP;

  FOR v_key, v_qtd IN SELECT k, (v::text)::int FROM jsonb_each(v_agg) AS t(k, v) LOOP
    v_id := v_key::uuid;
    SELECT quantidade, nome, tamanho INTO v_saldo, v_nome, v_tam
      FROM public.estoque_produtos WHERE id = v_id FOR UPDATE;
    IF v_saldo IS NULL THEN
      RAISE EXCEPTION 'Produto de estoque não encontrado para reativar o pedido.';
    END IF;
    IF v_saldo < v_qtd THEN
      RAISE EXCEPTION 'Não é possível reativar: % (tam %) está sem saldo suficiente (disponível: %, necessário: %).',
        v_nome, v_tam, v_saldo, v_qtd;
    END IF;
    UPDATE public.estoque_produtos
       SET quantidade = quantidade - v_qtd, updated_at = now()
     WHERE id = v_id;
    v_reabatidos := v_reabatidos || jsonb_build_array(jsonb_build_object('produto_id', v_id, 'qtd', v_qtd));
  END LOOP;

  RETURN jsonb_build_object('reabatidos', v_reabatidos);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reabater_estoque_pedido(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_orders_reabate_estoque_reativa_fn()
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
  IF OLD.status = 'Cancelado'
     AND NEW.status IS DISTINCT FROM 'Cancelado'
     AND COALESCE((NEW.extra_detalhes->>'origem_estoque')::boolean, false) = true
     AND COALESCE((NEW.extra_detalhes->>'estoque_devolvido')::boolean, false) = true
  THEN
    v_result := public.reabater_estoque_pedido(NEW.extra_detalhes);
    NEW.extra_detalhes := jsonb_set(NEW.extra_detalhes, '{estoque_devolvido}', 'false'::jsonb, true);

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_result->'reabatidos') LOOP
      v_total := v_total + COALESCE((v_item->>'qtd')::int, 0);
    END LOOP;

    IF v_total > 0 THEN
      NEW.estoque_baixado := true;
      NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
        'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
        'local', NEW.status,
        'descricao', format('Pedido reativado — %s par(es) reabatido(s) do estoque', v_total),
        'usuario', COALESCE(public.current_user_nome_completo(), 'Sistema')
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_reabate_estoque_reativa ON public.orders;
CREATE TRIGGER trg_orders_reabate_estoque_reativa
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_reabate_estoque_reativa_fn();