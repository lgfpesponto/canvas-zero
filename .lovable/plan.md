
## Objetivo
1. **Congelar histórico de preços**: pedido nasce com o valor da régua atual e nunca mais muda quando o admin editar preços em /admin/configurações. Só pedidos **novos** (a partir da data da alteração) usam a nova régua.
2. **Prazo de bota = 25 dias úteis** para botas criadas a partir de **segunda 18/05/2026**. Botas anteriores continuam com 20du.

---

## Parte 1 — Congelar preço por pedido

### Comportamento alvo
- Pedido novo: calcula com a régua atual → grava `preco`, `preco_regra_versao = atual`, **`preco_congelado = true`**.
- Pedido existente: nunca mais é tocado por reconciliador, backfill ou trigger.
- Admin editar preço no painel: só impacta novos pedidos daqui pra frente. Comissão, saldo, relatórios históricos ficam estáveis.
- Edição manual de um pedido (mudar modelo, bordado, qtd…): recalcula normalmente o `preco` daquele pedido com a régua **atual** (essa é a única forma de "destravar" — editar o próprio pedido). O valor segue congelado depois.

### Mudanças
1. **Migração SQL** — `UPDATE orders SET preco_congelado = true` em TODOS os pedidos existentes (one-shot).
2. **Default da coluna** — `ALTER COLUMN preco_congelado SET DEFAULT true` para que toda nova linha já nasça congelada.
3. **Trigger `trg_orders_estorno_baixa_on_value_change`** — já respeita `preco_congelado`, ok. Confirmar que demais triggers de recálculo (se houver) também respeitam.
4. **Frontend**:
   - `precoBackfillQueue.enqueueBackfill`: já pula congelados ✓.
   - `PrecoAutoBackfill`: filtro `.eq('preco_congelado', false)` já existe ✓ — vira efetivamente no-op.
   - `PrecoReconciler` (edge `reconciliar-precos`): adicionar filtro `preco_congelado = false` na query do edge function para nunca tocar pedidos congelados.
   - Criação/edição de pedido (OrderPage, EditOrderPage, ExtrasPage, BeltOrderPage, EditExtrasPage): no payload de insert/update já grava `preco_congelado: true` explicitamente (cinto de segurança caso o default não pegue).

### Impacto colateral
- O sistema atual de "régua versionada" (`preco_regra_versao` + `system_counters`) continua existindo, mas perde função prática — todo pedido fica congelado. Mantido para não quebrar nada.
- Pedidos criados de hoje em diante são congelados igual. Se quiser ajustar valor de um pedido específico, basta abrir e salvar (recálculo manual).

---

## Parte 2 — Lead time de bota 25du a partir de 18/05/2026

### Mudança em `src/lib/orderDeadline.ts`
Função `getTotalBizDays`: para botas (sem `tipoExtra`) e cintos, retornar:
```ts
const created = parseCreatedDateRaw(order);
const CUTOFF = new Date('2026-05-18T00:00:00');
if (!order.tipoExtra) return created >= CUTOFF ? 25 : 20;
if (order.tipoExtra === 'cinto') return 20;  // cinto fica 20du
```
Cinto fica como está (20du). Apenas **bota (ficha)** muda para 25du a partir de 18/05/2026.

Pedidos anteriores a 18/05 continuam calculando com 20du; pedidos de 18/05 em diante já entram com 25du automaticamente — sem migração de dados, é cálculo dinâmico.

---

## Confirmações
1. **Congelar TODOS os pedidos existentes** (inclusive os criados hoje e ontem) está ok? 
2. **25du vale só para bota** (cinto continua 20du), correto?
3. Se um admin abrir um pedido antigo congelado e clicar "Salvar" sem mudar nada, ele **recalcula com a régua atual** (e segue congelado no novo valor). Confirma que esse comportamento está ok ou prefere que mesmo editar manualmente NÃO recalcule?
