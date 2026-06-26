## Problema

Pedido Bagy `50013032` (#17824757479293, "Depósito em Lotérica") foi marcado como aprovado na Bagy, o webhook `order.approved` chegou no portal **duas vezes**, mas ambas foram descartadas com `erro: status_nao_aprovado:open` e o pedido nunca entrou em `bagy_pedidos`.

Causa: o webhook `bagy-webhook` decide aprovação só pelo `data.status`. Nesse pedido, o payload veio assim:

```
event           = order.approved
data.status     = "open"          ← (status logístico, ainda aberto)
data.payment_status = "approved"  ← (financeiro aprovado)
data.payment.status = "approved"
```

Como `"open"` não está em `APPROVED_STATUSES`, o pedido é ignorado. Isso é especialmente comum em pagamentos não automáticos (boleto, depósito em lotérica) que ficam `status=open` mesmo após aprovação manual.

## Correção

### `supabase/functions/bagy-webhook/index.ts`

Trocar o gating "só `data.status` aprovado" por uma checagem que aceita o pedido quando **qualquer** sinal indica aprovação:

1. **Evento já indica aprovação:** `event` ∈ {`order.approved`, `order.paid`, `order.invoiced`, `order.production`, `order.separated`, `order.shipped`, `order.delivered`, `order.completed`}.
2. **Status logístico aprovado:** `data.status` ∈ `APPROVED_STATUSES` (comportamento atual).
3. **Status de pagamento aprovado:** `data.payment_status`, `data.financial_status` ou `data.payment.status` ∈ `APPROVED_STATUSES`.

Se qualquer um valer, processa o pedido. Caso contrário, mantém o skip e o log com `status_nao_aprovado:<status>` atual.

O `statusBagyEarly` que é salvo na coluna `status_bagy` da tabela `bagy_pedidos` deve refletir o estado real:
- Se o `data.status` já é aprovado, usa ele.
- Senão, usa o payment_status aprovado (ex.: `approved`) para que o pedido apareça como aprovado na listagem do portal, mesmo quando a Bagy ainda traz `data.status=open`.

### Reprocessar o pedido perdido

Após o deploy, fazer um POST manual no webhook reusando o `payload` salvo em `bagy_webhook_log` para `bagy_order_id=50013032` com `?force=1`, para que o pedido entre na fila normalmente. Confirmação via `SELECT … FROM bagy_pedidos WHERE bagy_order_id='50013032'`.

## Fora de escopo
- Não muda nada na UI de `/rancho-chique/pedidos`.
- Não altera o fluxo de mapeamento de SKU nem as colunas da tabela.
- Não mexe em estoque/refund — `REFUND_STATUSES` segue igual.
