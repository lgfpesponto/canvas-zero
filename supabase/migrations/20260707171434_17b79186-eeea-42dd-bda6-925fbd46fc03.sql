-- ============================================================
-- 1. DATA-FIX: apaga baixas fantasmas (pedido não está em Pago)
-- ============================================================
DELETE FROM public.revendedor_baixas_pedido b
USING public.orders o
WHERE b.order_id = o.id AND o.status <> 'Pago';

-- ============================================================
-- 2. Trigger: quando pedido sai de "Pago", gera estorno + apaga baixa
-- ============================================================
CREATE OR REPLACE FUNCTION public.reflete_saida_de_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
  saldo_ant numeric;
  saldo_pos numeric;
BEGIN
  SELECT * INTO b FROM public.revendedor_baixas_pedido WHERE order_id = NEW.id LIMIT 1;
  IF FOUND THEN
    SELECT COALESCE(SUM(
      CASE tipo
        WHEN 'entrada_comprovante' THEN valor
        WHEN 'ajuste_admin' THEN valor
        WHEN 'estorno' THEN valor
        WHEN 'baixa_pedido' THEN -valor
      END
    ), 0) INTO saldo_ant
    FROM public.revendedor_saldo_movimentos WHERE vendedor = b.vendedor;

    saldo_pos := saldo_ant + b.valor_pedido;

    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
    VALUES
      (b.vendedor, 'estorno', b.valor_pedido,
       'Estorno automático: pedido ' || NEW.numero || ' saiu de Pago para ' || NEW.status,
       NEW.id, saldo_ant, saldo_pos, auth.uid());

    DELETE FROM public.revendedor_baixas_pedido WHERE id = b.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reflete_saida_de_pago ON public.orders;
CREATE TRIGGER trg_reflete_saida_de_pago
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status = 'Pago' AND NEW.status IS DISTINCT FROM 'Pago')
  EXECUTE FUNCTION public.reflete_saida_de_pago();

-- ============================================================
-- 3. Trigger: ajuste de preço em pedido Pago reflete no saldo
-- ============================================================
CREATE OR REPLACE FUNCTION public.reflete_ajuste_preco_em_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
  novo_total numeric;
  antigo_total numeric;
  delta numeric;
  saldo_ant numeric;
  saldo_pos numeric;
BEGIN
  SELECT * INTO b FROM public.revendedor_baixas_pedido WHERE order_id = NEW.id LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;

  novo_total := COALESCE(NEW.preco, 0) * COALESCE(NEW.quantidade, 1);
  antigo_total := b.valor_pedido;
  delta := novo_total - antigo_total;
  IF delta = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(
    CASE tipo
      WHEN 'entrada_comprovante' THEN valor
      WHEN 'ajuste_admin' THEN valor
      WHEN 'estorno' THEN valor
      WHEN 'baixa_pedido' THEN -valor
    END
  ), 0) INTO saldo_ant
  FROM public.revendedor_saldo_movimentos WHERE vendedor = b.vendedor;

  IF delta < 0 THEN
    saldo_pos := saldo_ant + (-delta);
    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
    VALUES (b.vendedor, 'estorno', -delta,
      'Estorno por desconto em pedido Pago ' || NEW.numero || ' (R$ ' || to_char(antigo_total, 'FM999999990.00') || ' → R$ ' || to_char(novo_total, 'FM999999990.00') || ')',
      NEW.id, saldo_ant, saldo_pos, auth.uid());
  ELSE
    saldo_pos := saldo_ant - delta;
    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
    VALUES (b.vendedor, 'baixa_pedido', delta,
      'Baixa complementar por acréscimo em pedido Pago ' || NEW.numero || ' (R$ ' || to_char(antigo_total, 'FM999999990.00') || ' → R$ ' || to_char(novo_total, 'FM999999990.00') || ')',
      NEW.id, saldo_ant, saldo_pos, auth.uid());
  END IF;

  UPDATE public.revendedor_baixas_pedido
     SET valor_pedido = novo_total
   WHERE id = b.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reflete_ajuste_preco_em_pago ON public.orders;
CREATE TRIGGER trg_reflete_ajuste_preco_em_pago
  AFTER UPDATE OF preco, quantidade ON public.orders
  FOR EACH ROW
  WHEN (
    NEW.status = 'Pago' AND OLD.status = 'Pago'
    AND (COALESCE(NEW.preco,0) * COALESCE(NEW.quantidade,1))
        IS DISTINCT FROM (COALESCE(OLD.preco,0) * COALESCE(OLD.quantidade,1))
  )
  EXECUTE FUNCTION public.reflete_ajuste_preco_em_pago();