WITH ins AS (
  INSERT INTO revendedor_comprovantes (vendedor, valor, data_pagamento, status, comprovante_url, observacao, enviado_por, aprovado_por, aprovado_em)
  VALUES ('Maria Gabriela', 11492.60, '2026-04-27', 'aprovado', '', 'Lançamento histórico — comprovante a ser anexado depois', '4ae76415-8574-4c6f-8251-4dedf63d2d76', '4ae76415-8574-4c6f-8251-4dedf63d2d76', now())
  RETURNING id, vendedor, valor
)
INSERT INTO revendedor_saldo_movimentos (vendedor, tipo, valor, descricao, comprovante_id, saldo_anterior, saldo_posterior, created_by)
SELECT ins.vendedor, 'entrada_comprovante', ins.valor, 'Comprovante histórico aprovado (27/04/2026)', ins.id, 374851.80, 374851.80 + ins.valor, '4ae76415-8574-4c6f-8251-4dedf63d2d76'
FROM ins;