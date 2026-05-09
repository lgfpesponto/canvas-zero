## Diagnóstico

No pedido **#1951** (Bota normal): banco tem `preco = 290` (correto, já com desconto), mas a tela mostra **Subtotal R$ 295 / Desconto −R$ 5 / Total R$ 295** — o ajuste aparece na linha de auditoria, mas **não é subtraído do Total exibido**.

A causa é o helper `getOrderFinalValue(order, subtotalOverride)` em `src/lib/order-logic.ts`:
```ts
if (subtotalOverride != null) return Math.max(0, subtotalOverride);
```
Ele devolve o **bruto puro** quando recebe override, ignorando o desconto. Como `OrderDetailPage` sempre passa `subtotalReal` como override (independente do tipo), o Total exibido fica igual ao Subtotal para qualquer tipo (bota, cinto, extras).

E, agora que mudamos `subtotalReal` da Bota Pronta Entrega para o **bruto da composição** (correção anterior), o mesmo bug atinge ela também: se houver acréscimo de R$ 5 sobre R$ 310, a tela mostra Total = 310 em vez de 315 — o DB está certo (315), mas a UI não.

Resumindo: bug é só de **exibição** e atinge **todos os tipos**.

## Correção (uma linha de código + verificação cruzada)

### 1. `src/lib/order-logic.ts` — `getOrderFinalValue`

Mudar a semântica do override para que ele represente **bruto** e o helper aplique o ajuste:
```ts
export function getOrderFinalValue(order, subtotalOverride?) {
  if (subtotalOverride != null) {
    const ajuste = Number(order.desconto) || 0; // >0 desconto, <0 acréscimo
    return Math.max(0, subtotalOverride - ajuste);
  }
  return Number(order.preco) || 0;
}
```
Isso conserta o Total exibido em **todos** os pontos que passam um override (detalhe do pedido) — bota, cinto, extras — incluindo a Bota Pronta Entrega após o fix anterior.

### 2. Verificar callers do override

Buscar todos os usos de `getOrderFinalValue(order, X)` (apenas o detail page passa override hoje) e confirmar que `X` é sempre o **bruto** (sem ajuste):
- `OrderDetailPage`: `subtotalReal` = breakdown do tipo (bota = `totalCalc`; extras = `extraTotalCalc`; bota_pronta_entrega = `computeBotaProntaEntregaBruto`). Todos são bruto. ✓

### 3. Garantir que o `preco` persistido também siga a regra para todos os tipos

`computeTotalToSave` em `src/lib/recomputeOrderPrice.ts` já cobre os 3 caminhos (bota normal, extras genéricos, bota_pronta_entrega) e é usado pelo runner/edge function. Após a correção da edge function (passo anterior) **todos os tipos** ficam com `preco = bruto − desconto` no banco. Sem alterações adicionais necessárias.

### 4. Saneamento opcional

Listar com `SELECT` se algum pedido **não** Bota Pronta Entrega tem `preco` divergente da regra `bruto − desconto` (varredura do reconciliador deve cobrir, mas vou conferir antes).

### 5. Memória

Adicionar nota curta em `mem://features/orders/order-final-value` (já existe) lembrando que `getOrderFinalValue(order, override)` agora **sempre subtrai o desconto** quando override é dado — quem chamar precisa passar **bruto**, nunca total final.

---

## Por que isso é seguro

- Listagens, PDFs, dashboards e relatórios chamam `getOrderFinalValue(order)` **sem** override → caem no `return order.preco` (caminho inalterado).
- Apenas o detalhe do pedido passa override, e ele já passa bruto. Vai passar a refletir o ajuste corretamente.
- Sem migração nem mudança de schema.
