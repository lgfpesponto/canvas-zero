## Objetivo

Corrigir o gap de **13 pedidos do Rafael Silva** (R$ 1.020) que estão em status `Pago` mas sem registro em `revendedor_baixas_pedido`. Como o saldo disponível (R$ 29.899,80) cobre folgadamente, o resultado esperado é: todos voltam a Pago **com** baixa registrada e sobram **R$ 28.879,80**.

## Migration (data-only, idempotente)

Para qualquer pedido com `status='Pago'`, vendedor válido (≠ 'Estoque') e **sem** linha em `revendedor_baixas_pedido`:

1. `UPDATE orders SET status='Cobrado'` + entrada no histórico: *"Correção: pedido reaberto para baixa automática (estava Pago sem registro de baixa)"*
2. Coletar lista de vendedores afetados
3. Para cada vendedor: `PERFORM tentar_baixa_automatica(vendedor, NULL)`

Isso reaproveita a função existente — que já cria o movimento `baixa_pedido`, insere em `revendedor_baixas_pedido` e move o pedido de volta para `Pago` com histórico correto. Se o saldo não cobrir algum pedido (não é o caso do Rafael), ele permanece em `Cobrado` e a tag "Falta R$ X" já implementada aparece automaticamente.

A query foi escrita genericamente — corrige o Rafael e qualquer outro vendedor que tenha o mesmo gap.

## Resultado esperado para o Rafael

| Antes | Depois |
|---|---|
| 208 Pago / 195 baixas / saldo R$ 29.899,80 | 208 Pago / **208 baixas** / saldo **R$ 28.879,80** |

## Arquivos

- **Novo:** `supabase/migrations/20260503020000_corrigir_pago_sem_baixa.sql`

Sem mudanças de código frontend — a UI já reflete os movimentos via realtime.
