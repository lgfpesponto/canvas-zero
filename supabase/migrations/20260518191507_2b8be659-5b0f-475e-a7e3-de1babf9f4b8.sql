-- Zera Utilizado da Maria Gabriela mantendo orders.status='Pago' intacto.
DELETE FROM public.revendedor_baixas_pedido WHERE vendedor = 'Maria Gabriela';
DELETE FROM public.revendedor_saldo_movimentos
 WHERE vendedor = 'Maria Gabriela' AND tipo = 'baixa_pedido';