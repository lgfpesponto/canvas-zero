LOCK TABLE public.revendedor_saldo_movimentos IN EXCLUSIVE MODE;

INSERT INTO public.revendedor_saldo_movimentos
  (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_at)
SELECT 
  b.vendedor, 'estorno', b.valor,
  'Reconciliação: crédito da baixa original (apagada pelo trigger de mudança de preço)',
  b.order_id, 0, 0,
  b.created_at - interval '1 microsecond'
FROM public.revendedor_saldo_movimentos b
WHERE b.created_at::date = '2026-05-19'
  AND b.tipo = 'baixa_pedido'
  AND b.descricao = 'Baixa automática de pedido cobrado'
  AND b.vendedor IN ('Denise Garcia Feliciano','Fabiana Silva','Larissa Silva','Rafael Silva')
  AND NOT EXISTS (
    SELECT 1 FROM public.revendedor_saldo_movimentos e
    WHERE e.order_id = b.order_id 
      AND e.vendedor = b.vendedor
      AND e.tipo = 'estorno'
      AND e.created_at::date = '2026-05-19'
  );

DO $$
DECLARE
  v text;
  mov record;
  saldo numeric;
  delta numeric;
BEGIN
  FOREACH v IN ARRAY ARRAY['Denise Garcia Feliciano','Fabiana Silva','Larissa Silva','Rafael Silva'] LOOP
    saldo := 0;
    FOR mov IN
      SELECT id, tipo, valor, descricao FROM public.revendedor_saldo_movimentos
       WHERE vendedor = v ORDER BY created_at ASC, id ASC
    LOOP
      IF mov.descricao LIKE '[QUITA%' THEN delta := 0;
      ELSIF mov.tipo IN ('entrada_comprovante','estorno','ajuste_admin') THEN delta := mov.valor;
      ELSIF mov.tipo = 'baixa_pedido' THEN delta := -mov.valor;
      ELSE delta := 0;
      END IF;
      UPDATE public.revendedor_saldo_movimentos
         SET saldo_anterior = saldo, saldo_posterior = saldo + delta
       WHERE id = mov.id;
      saldo := saldo + delta;
    END LOOP;
  END LOOP;
END $$;