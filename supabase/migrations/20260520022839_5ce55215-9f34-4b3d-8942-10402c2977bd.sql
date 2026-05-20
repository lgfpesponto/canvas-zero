LOCK TABLE public.revendedor_saldo_movimentos IN EXCLUSIVE MODE;
LOCK TABLE public.revendedor_baixas_pedido IN EXCLUSIVE MODE;

-- 1. Reinsere estornos compensatórios para cada baixa automática ajustada hoje
INSERT INTO public.revendedor_saldo_movimentos
  (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_at)
SELECT 
  b.vendedor, 'estorno', b.valor,
  'Reconciliação: crédito da baixa original substituída por nova baixa após congelamento de preço',
  b.order_id, 0, 0,
  '2026-05-19 22:36:14.000000+00'::timestamptz  -- imediatamente antes da baixa
FROM public.revendedor_saldo_movimentos b
WHERE b.created_at = '2026-05-19 22:36:14.346789+00'
  AND b.tipo = 'baixa_pedido'
  AND b.descricao = 'Baixa automática de pedido cobrado'
  AND b.vendedor IN ('Denise Garcia Feliciano','Fabiana Silva','Larissa Silva','Rafael Silva')
  -- só para baixas cujo order_id teve estorno apagado hoje (que sumiu da tabela)
  AND EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = b.order_id AND o.preco_congelado = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.revendedor_saldo_movimentos e
    WHERE e.order_id = b.order_id 
      AND e.vendedor = b.vendedor
      AND e.tipo = 'estorno'
      AND e.created_at::date = '2026-05-19'
  );

-- 2. Recalcular saldo das 4 revendedoras
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
      SELECT id, tipo, valor, descricao
        FROM public.revendedor_saldo_movimentos
       WHERE vendedor = v
       ORDER BY created_at ASC, id ASC
    LOOP
      IF mov.descricao LIKE '[QUITA%' THEN
        delta := 0;
      ELSIF mov.tipo IN ('entrada_comprovante','estorno','ajuste_admin') THEN
        delta := mov.valor;
      ELSIF mov.tipo = 'baixa_pedido' THEN
        delta := -mov.valor;
      ELSE
        delta := 0;
      END IF;

      UPDATE public.revendedor_saldo_movimentos
         SET saldo_anterior = saldo,
             saldo_posterior = saldo + delta
       WHERE id = mov.id;

      saldo := saldo + delta;
    END LOOP;
  END LOOP;
END $$;