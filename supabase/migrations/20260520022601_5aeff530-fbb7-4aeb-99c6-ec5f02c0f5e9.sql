-- ============================================================
-- LIMPEZA: estornos automáticos de 19/05/2026 + blindagem do trigger
-- ============================================================

-- 1. Bloquear concorrência durante a reescrita
LOCK TABLE public.revendedor_saldo_movimentos IN EXCLUSIVE MODE;
LOCK TABLE public.revendedor_baixas_pedido IN EXCLUSIVE MODE;

-- 2. Snapshot dos deltas originais (para preservar histórico de outros movimentos)
CREATE TEMP TABLE _delta_snapshot ON COMMIT DROP AS
SELECT id, (saldo_posterior - saldo_anterior) AS delta_original
FROM public.revendedor_saldo_movimentos
WHERE vendedor IN ('Denise Garcia Feliciano','Fabiana Silva','Larissa Silva','Rafael Silva');

-- 3. Para cada par (estorno_auto, baixa_auto) de hoje, ajustar valor da baixa
--    para o valor atual do pedido (que já foi corrigido pelo congelamento)
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (e.vendedor, e.order_id)
      e.id AS estorno_id,
      b.id AS baixa_id,
      o.preco AS valor_correto
    FROM public.revendedor_saldo_movimentos e
    JOIN public.revendedor_saldo_movimentos b
      ON b.vendedor = e.vendedor
     AND b.order_id = e.order_id
     AND b.tipo = 'baixa_pedido'
     AND b.descricao = 'Baixa automática de pedido cobrado'
     AND b.created_at::date = '2026-05-19'
    JOIN public.orders o ON o.id = e.order_id
    WHERE e.tipo = 'estorno'
      AND e.descricao = 'Estorno automático: valor/vendedor do pedido alterado'
      AND e.created_at::date = '2026-05-19'
    ORDER BY e.vendedor, e.order_id, b.created_at DESC
  LOOP
    -- Ajusta valor do movimento de baixa
    UPDATE public.revendedor_saldo_movimentos
       SET valor = rec.valor_correto
     WHERE id = rec.baixa_id;
    -- Ajusta valor_pedido em revendedor_baixas_pedido
    UPDATE public.revendedor_baixas_pedido
       SET valor_pedido = rec.valor_correto
     WHERE movimento_id = rec.baixa_id;
    -- Apaga estorno
    DELETE FROM public.revendedor_saldo_movimentos WHERE id = rec.estorno_id;
  END LOOP;
END $$;

-- 4. Recalcular saldo_anterior/saldo_posterior em ordem para as 4 revendedoras
DO $$
DECLARE
  v text;
  mov record;
  saldo numeric;
  delta numeric;
  novo_valor numeric;
BEGIN
  FOREACH v IN ARRAY ARRAY['Denise Garcia Feliciano','Fabiana Silva','Larissa Silva','Rafael Silva'] LOOP
    saldo := 0;
    FOR mov IN
      SELECT m.id, m.tipo, m.valor, m.descricao, m.saldo_anterior, m.saldo_posterior,
             ds.delta_original
        FROM public.revendedor_saldo_movimentos m
        LEFT JOIN _delta_snapshot ds ON ds.id = m.id
       WHERE m.vendedor = v
       ORDER BY m.created_at ASC, m.id ASC
    LOOP
      -- Quitação histórica: delta zero (saldo não muda)
      IF mov.descricao LIKE '[QUITAÇÃO HISTÓRICA]%' THEN
        delta := 0;
      ELSIF mov.tipo IN ('entrada_comprovante','estorno','ajuste_admin') THEN
        delta := mov.valor;
      ELSIF mov.tipo = 'baixa_pedido' THEN
        -- Ajuste negativo via baixa_pedido tinha delta = -valor também (saldo_post = ant + delta_negativo = ant - abs(delta))
        delta := -mov.valor;
      ELSE
        -- Fallback: usa delta original do snapshot
        delta := COALESCE(mov.delta_original, 0);
      END IF;

      UPDATE public.revendedor_saldo_movimentos
         SET saldo_anterior = saldo,
             saldo_posterior = saldo + delta
       WHERE id = mov.id;

      saldo := saldo + delta;
    END LOOP;
  END LOOP;
END $$;

-- 5. Blindar o trigger: não estornar se pedido está com preço congelado
CREATE OR REPLACE FUNCTION public.trg_orders_estorno_baixa_on_value_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  baixa record;
  saldo_ant numeric;
  novo_valor numeric;
  valor_baixado numeric;
  vendedor_mudou boolean;
  valor_mudou boolean;
BEGIN
  -- Pedidos com preço congelado são imunes a estorno automático por mudança de regra
  IF NEW.preco_congelado = true THEN
    RETURN NEW;
  END IF;

  SELECT * INTO baixa FROM public.revendedor_baixas_pedido WHERE order_id = NEW.id LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  novo_valor := COALESCE(NEW.preco, 0);
  valor_baixado := baixa.valor_pedido;
  vendedor_mudou := (NEW.vendedor IS DISTINCT FROM baixa.vendedor);
  valor_mudou := (novo_valor <> valor_baixado);

  IF NOT vendedor_mudou AND NOT valor_mudou THEN
    RETURN NEW;
  END IF;

  saldo_ant := COALESCE(public.saldo_atual_revendedor(baixa.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (baixa.vendedor, 'estorno', valor_baixado,
     'Estorno automático: valor/vendedor do pedido alterado',
     NEW.id, saldo_ant, saldo_ant + valor_baixado, auth.uid());

  DELETE FROM public.revendedor_baixas_pedido WHERE id = baixa.id;

  NEW.status := 'Cobrado';
  NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Cobrado',
      'descricao', 'Estorno automático: valor/vendedor alterado (R$ ' || to_char(valor_baixado, 'FM999G990D00') || ' devolvido ao saldo)',
      'usuario', COALESCE(public.current_user_nome_completo(), 'Sistema')
    )
  );

  RETURN NEW;
END;
$function$;