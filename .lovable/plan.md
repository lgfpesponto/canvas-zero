## Inserir comprovante histórico de 27/04/2026 — Maria Gabriela

**Alvo único:** 1 comprovante aprovado, sem arquivo, valor R$ 11.492,60, data 27/04/2026, vendedor Maria Gabriela.

### O que será feito

Migration SQL com:
1. `INSERT` em `revendedor_comprovantes` com:
   - `vendedor` = nome completo exato da Maria Gabriela
   - `valor` = 11492.60
   - `data_pagamento` = 2026-04-27
   - `status` = 'aprovado'
   - `comprovante_url` = '' (histórico, sem arquivo)
   - `observacao` = 'Lançamento histórico — comprovante a ser anexado depois'
   - `enviado_por` / `aprovado_por` = uid da Juliana (admin_master)
   - `aprovado_em` = now()
2. `INSERT` em `revendedor_saldo_movimentos` (tipo `entrada_comprovante`) com saldo_anterior/posterior recalculados a partir do saldo atual da Maria Gabriela, vinculando ao comprovante criado.

Tudo dentro de uma transação para garantir consistência.

### Efeito esperado

- Saldo da Maria Gabriela sobe R$ 11.492,60.
- Total de comprovantes aprovados passa a refletir esse lançamento.
- Combinado com os 3 que você já adicionou (10.000 + 12.937,20 + 10.269,40 = R$ 33.206,60), o saldo fecha exatamente em R$ 386.344,40, batendo com sua planilha.

### O que NÃO será tocado

- Nenhum pedido em `orders`.
- Nenhuma baixa existente em `revendedor_baixas_pedido`.
- Nenhum outro comprovante ou movimento.
