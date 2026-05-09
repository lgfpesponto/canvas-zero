## Diagnóstico — por que a soma deu errado

No pedido `a0c65fa4…` (Bota Pronta Entrega — florencia R$ 310, acréscimo de R$ 5):

- **Esperado**: `preco = 315`
- **No banco hoje**: `preco = 325` (e a tela mostrou 320 entre as etapas)

### Causa raiz (uma só, em dois lugares)

Para `tipo_extra = 'bota_pronta_entrega'`, o "subtotal bruto" está sendo lido de `order.preco`, que **já é o total final pós-ajuste**. Ou seja, todo recálculo soma o ajuste em cima de um valor que já contém o ajuste anterior → o total cresce R$ 5 a cada save / cada execução do reconciliador.

1. **`src/pages/OrderDetailPage.tsx` (linha ~451)** — em `computeExtraTotal` para `bota_pronta_entrega`:
   ```ts
   case 'bota_pronta_entrega': t += order.preco; break;  // ← usa total final como "bruto"
   ```
   Resultado: `displayTotalBruto = order.preco` (já com ajuste). Ao aplicar +R$ 5:
   `novoTotal = 310 − (−5) = 315` ✓ na 1ª vez, mas `315 − (−5) = 320` na 2ª, `320 − (−5) = 325` na 3ª…

2. **`src/lib/recomputeOrderPrice.ts` (linhas 174-175)** — em `computeTotalToSave`:
   ```ts
   if (order.tipoExtra === 'bota_pronta_entrega') {
     return Math.max(0, (Number(order.preco) || 0) - (Number(order.desconto) || 0));
   }
   ```
   Mesma armadilha: o `reconciliar-precos` (edge function) e o backfill rodam essa função e a cada execução adicionam o ajuste de novo. Como o reconciliador roda no login e a cada mudança de regra, ele "explode" o valor.

A linha de auditoria que mostrou "310 → 315" foi da 1ª aplicação correta. Os R$ 10 a mais vieram de execuções subsequentes do reconciliador / segundo save.

---

## Correção

Tornar a "fonte da verdade" do bruto para Bota Pronta Entrega o `extra_detalhes.botas[].valorManual` (+ preços dos extras aninhados), nunca `order.preco`.

### 1. `src/lib/recomputeOrderPrice.ts`

Criar helper `computeBotaProntaEntregaBruto(order)` que soma:
- `valorManual` de cada bota em `extra_detalhes.botas[]`
- `extras[].preco` aninhados de cada bota
- Fallback: se `extra_detalhes.botas` não existir (pedidos legados sem array), manter `order.preco` como bruto (comportamento atual para não quebrar os antigos).

Trocar em `computeTotalToSave`:
```ts
if (order.tipoExtra === 'bota_pronta_entrega') {
  const bruto = computeBotaProntaEntregaBruto(order);
  return Math.max(0, bruto - (Number(order.desconto) || 0));
}
```

### 2. `src/pages/OrderDetailPage.tsx`

- Em `computeExtraTotal`, substituir `case 'bota_pronta_entrega': t += order.preco` por `t += computeBotaProntaEntregaBruto(order)`.
- Assim `subtotalReal` / `displayTotalBruto` ficam = R$ 310 (independente de quantos ajustes existam), e a aplicação do +R$ 5 sempre gera 315.

### 3. `supabase/functions/reconciliar-precos/index.ts`

Aplicar a mesma correção na lógica portada (Deno) — usar `extra_detalhes.botas` para calcular o bruto antes de subtrair `desconto`. Sem isso, o reconciliador continuará inflando os valores.

### 4. Saneamento do pedido afetado

Migration única para corrigir o pedido atual (e qualquer outro `bota_pronta_entrega` cujo `preco` esteja > soma de `valorManual` + extras − desconto):
```sql
UPDATE orders
SET preco = <bruto_recalculado> - desconto
WHERE tipo_extra = 'bota_pronta_entrega'
  AND <preco diverge>;
```
Vou listar primeiro com `SELECT` para mostrar quais pedidos serão tocados antes de aplicar.

### 5. Guarda contra regressão

Adicionar comentário-alerta nos dois pontos (`computeExtraTotal` e `computeTotalToSave`) explicando que **nunca** se deve usar `order.preco` como bruto quando `desconto !== 0`, para evitar que esse padrão volte. Registrar também na memória do projeto sob `mem://features/orders/bota-pronta-entrega-multi`.

---

## Como evito que aconteça de novo

- **Regra geral**: em qualquer recálculo do total, o "bruto" precisa vir da composição (campos de origem), não de `order.preco`. `order.preco` é **resultado**, nunca **insumo** do cálculo de ajuste.
- Comentários explícitos nos dois pontos.
- Nota de memória persistente para futuras edições.
