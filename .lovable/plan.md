## Objetivo

Registrar **R$ 81.251,67** como **Utilizado** da Maria Gabriela (backfill), para que o painel mostre corretamente o que ela já consumiu de saldo. Os demais (Denise, Rafael) continuam com Utilizado zerado.

## Estado atual

| Vendedora | Recebido | Utilizado |
|---|---|---|
| Maria Gabriela | R$ 300.251,32 | R$ 0,00 |
| Rafael Silva | R$ 11.400,00 | R$ 0,00 |
| Denise Garcia Feliciano | R$ 3.415,00 | R$ 0,00 |

Saldo da Maria hoje: R$ 300.251,32 (errado — precisa cair para R$ 218.999,65 após registrar o utilizado).

## Mudança

Inserir **1 movimento** em `revendedor_saldo_movimentos` para Maria Gabriela:

- `vendedor`: "Maria Gabriela"
- `tipo`: `baixa_pedido` (é como o painel calcula "Utilizado", linha 167 do `FinanceiroSaldoRevendedor.tsx`)
- `valor`: 81251.67
- `descricao`: "Utilizado em pedidos anteriores (backfill manual — saldo histórico já consumido)"
- `order_id`: NULL (backfill agregado, sem pedido específico)
- `saldo_anterior`: 300251.32
- `saldo_posterior`: 218999.65
- `created_at`: timestamp atual

A inserção será feita via **migração SQL** (a tabela tem RLS bloqueando INSERT direto, então só passa por migração).

## Resultado esperado no painel

| Vendedora | Recebido | Utilizado | Saldo |
|---|---|---|---|
| Maria Gabriela | R$ 300.251,32 | **R$ 81.251,67** | R$ 218.999,65 |
| Rafael Silva | R$ 11.400,00 | R$ 0,00 | R$ 11.400,00 |
| Denise Garcia Feliciano | R$ 3.415,00 | R$ 0,00 | R$ 3.415,00 |

## Não muda

- Nada em pedidos (`orders`).
- Nada em comprovantes.
- Toggle de baixa automática segue como está (desligado).
- Recebido das outras revendedoras intacto.