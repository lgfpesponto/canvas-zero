
ALTER TABLE revendedor_baixas_pedido DISABLE TRIGGER USER;
ALTER TABLE revendedor_saldo_movimentos DISABLE TRIGGER USER;

-- 1. Apaga ajuste antigo da Gabi
DELETE FROM revendedor_saldo_movimentos
WHERE vendedor='Maria Gabriela' AND tipo='ajuste_admin';

-- 2. Desliga vínculo das baixas existentes da Gabi do movimento
UPDATE revendedor_baixas_pedido
SET movimento_id = NULL
WHERE vendedor='Maria Gabriela';

-- 3. Apaga as saídas (baixa_pedido) da Gabi
DELETE FROM revendedor_saldo_movimentos
WHERE vendedor='Maria Gabriela' AND tipo='baixa_pedido';

-- 4. Quita historicamente o pedido Cobrado pendente (Rafael, R$0)
INSERT INTO revendedor_baixas_pedido (order_id, vendedor, valor_pedido, movimento_id)
SELECT o.id, o.vendedor, COALESCE(o.preco,0), NULL
FROM orders o
WHERE o.status='Cobrado'
  AND NOT EXISTS (SELECT 1 FROM revendedor_baixas_pedido b WHERE b.order_id=o.id);

ALTER TABLE revendedor_saldo_movimentos ENABLE TRIGGER USER;
ALTER TABLE revendedor_baixas_pedido ENABLE TRIGGER USER;
