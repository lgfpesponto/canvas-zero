## Objetivo

`orders.preco` no banco passa a guardar o **TOTAL FINAL** do pedido — já com tudo da ficha somado, multiplicado pela quantidade e com desconto/acréscimo aplicado. Nada mais é recalculado em runtime. Toda vez que o pedido é salvo ou editado, o total é recalculado e gravado. Listagens, "Meus Pedidos", relatórios e PDFs leem `order.preco` direto.

```
SUBTOTAL = soma de tudo que foi lançado na ficha (modelo + couros + bordados + metais + sola + ...)
TOTAL    = (SUBTOTAL × quantidade) - desconto   (desconto positivo = abate, negativo = acréscimo)

→ DB.orders.preco = TOTAL
```

A coluna `desconto` **continua existindo** no banco (você precisa saber que tal pedido teve R$ 30 de desconto/acréscimo), mas vira **informativa** — usada só pra mostrar a tag "DESC" / "ACRÉSC" na lista e no detalhe. **Não é mais aplicada em runtime**, porque o `preco` já está com ela embutida. Se aplicasse, descontaria duas vezes.

## Mudanças

### 1. Lógica central — leitura simplificada

**`src/lib/order-logic.ts`**
- `getOrderFinalValue(order)` passa a retornar `Number(order.preco) || 0`. Sem mais multiplicação, sem mais subtração de desconto.
- `getOrderBaseValue(order)` idem.
- Comentário no topo deixando explícito que `preco` é o total final gravado.

### 2. Lógica central — gravação

Novo helper em **`src/lib/recomputeOrderPrice.ts`**:
```ts
export function computeTotalToSave(order, findFichaPrice, getByCategoria): number {
  const subtotal = recomputeSubtotal(order, findFichaPrice, getByCategoria);
  const qtd = order.tipoExtra ? 1 : Math.max(1, order.quantidade || 1);
  const ajuste = Number(order.desconto) || 0;
  return Math.max(0, subtotal * qtd - ajuste);
}
```

Para `bota_pronta_entrega` (cujo `preco` já é o total cheio do bloco), não recalcula — preserva o que veio do form.

### 3. Fluxos de gravação — todos passam a salvar TOTAL no `preco`

Editar a chamada de `preco:` em cada submit/save para usar `computeTotalToSave`:

- `src/pages/OrderPage.tsx` (linha ~847): `preco: total * quantidade - (descontoNum || 0)`
- `src/pages/EditOrderPage.tsx` (linha ~462): idem
- `src/pages/BeltOrderPage.tsx` (linha ~391): idem (qtd = 1)
- `src/pages/EditBeltPage.tsx`: idem
- `src/pages/ExtrasPage.tsx` / `src/pages/EditExtrasPage.tsx` (linha ~207): `preco_unitario × qty - ajuste` (exceto Bota PE)
- `src/pages/DynamicOrderPage.tsx` (linha ~121): `totalPreco - ajuste`
- `src/pages/OrderDetailPage.tsx`: ao editar desconto/acréscimo inline, recalcula e grava na mesma operação.

### 4. Auto-correção persistente no detalhe (sem botão)

`OrderDetailPage` continua exibindo a "Composição" recalculada (transparência visual). Se ao abrir o pedido detectar `Math.abs(computeTotalToSave - order.preco) >= 1`:

- **Grava silenciosamente** o novo `preco` no banco (UPDATE).
- Registra entrada em `order.alteracoes` com `tipo: 'recalculo_automatico'` e descrição `"Total recalculado: R$ X → R$ Y (composição atualizada)"`.
- Não mostra dialog, não mostra botão. É transparente.
- Restrito por RLS já existente: só admins conseguem fazer o UPDATE; vendedor abrindo o próprio pedido também consegue (RLS `auth.uid() = user_id`).

Isso garante: **uma vez salvo certo, o sistema para de recalcular**. A próxima vez que abrir, `preco` já bate com a composição → nenhuma ação.

### 5. Leituras — remover multiplicação e subtração espalhadas

Auditar e simplificar pra usar `order.preco` direto (a maioria já chama `getOrderFinalValue`, então mudar o helper resolve sozinho):

- `src/components/OrderCard.tsx` ✓ (já usa `getOrderFinalValue`)
- `src/components/SpecializedReports.tsx`
- `src/components/CommissionPanel.tsx`
- `src/components/SoladoBoard.tsx`
- `src/components/financeiro/saldo/DetalhesRevendedorDrawer.tsx`
- `src/pages/ReportsPage.tsx`
- `src/pages/TrackOrderPage.tsx`
- `src/lib/pdfGenerators.ts` (todos os geradores)
- `src/components/dashboard/*`
- `src/hooks/useOrders.ts` / `useOrdersQuery.ts` (somatórios)

### 6. Funções RPC do banco — corrigir contas

Hoje várias RPCs fazem `preco × quantidade - desconto`. Depois da migração isso vai dar resultado errado (multiplicaria de novo e subtrairia de novo). Atualizar para usar **`COALESCE(preco, 0)`** direto:

- `get_orders_totals` → `valor_total = SUM(COALESCE(preco, 0))`
- `get_pending_value` → `SUM(COALESCE(preco, 0))`
- `tentar_baixa_automatica` → `valor_p := COALESCE(ped.preco, 0)`
- `quitar_pedidos_historico` → idem
- `trg_orders_estorno_baixa_on_value_change` → `novo_valor := COALESCE(NEW.preco, 0)` + comparar com `OLD.preco` (estorna se `preco` mudou, não mais a fórmula composta)

### 7. Backfill — corrigir TODOS os pedidos antigos

Como você quer que **todos fiquem certos** (incluindo o 1951 onde o `preco` salvo está abaixo do que a composição mostra), o backfill **não pode ser SQL puro** — precisa rodar a `recomputeSubtotal` (que depende de `ficha_variacoes` + `custom_options`) e isso só roda em JS.

Plano:

a) **Migração SQL leve** — apenas adiciona uma coluna de controle pra marcar quais pedidos já foram migrados:
```sql
ALTER TABLE orders ADD COLUMN preco_migrado_v2 boolean DEFAULT false;
```

b) **Runner de migração no admin** — uma página/botão único em `/admin/configuracoes` (visível só pra admin_master), tipo "Migrar preços para v2". Ao clicar:
   1. Busca todos os pedidos com `preco_migrado_v2 = false`, em lotes de 100.
   2. Para cada pedido: roda `recomputeSubtotal` → calcula `total = subtotal × qty - desconto` → faz UPDATE em `preco` e marca `preco_migrado_v2 = true`.
   3. Mostra progresso (X de Y pedidos), tempo estimado, e log de divergências (pra você conferir os casos tipo 1951 que mudaram bastante).
   4. Pode rodar em segundo plano e ser pausado/retomado.

c) **Após migração 100% completa**, a coluna `preco_migrado_v2` pode ser removida em uma migração futura. Não é urgente.

d) Pedidos novos criados depois do deploy já entram com o `preco` correto via passo 3 — não precisam migração.

### 8. Exibição do desconto/acréscimo

No detalhe do pedido e na lista, mostrar a tag (já existe `temDesconto` no `OrderCard`) com o valor:
- `desconto > 0`: tag "DESC −R$ 30,00"
- `desconto < 0`: tag "ACRÉSC +R$ 10,00"

E na composição do detalhe, abaixo do subtotal, uma linha "Desconto: −R$ 30,00" ou "Acréscimo: +R$ 10,00" antes do "Total: R$ 295,00". Puramente visual — a conta já está em `preco`.

## Resumo

- ✅ `preco` no banco = TOTAL final, sempre. Acabou divergência composição × banco × relatório.
- ✅ Sem botão. Auto-corrige na primeira vez que abrir o detalhe. Daí em diante fica salvo e estável.
- ✅ Desconto/acréscimo: campo `desconto` mantido no banco como registro. Na hora de salvar, é aplicado uma vez sobre o subtotal e o resultado vira `preco`. Na hora de ler, ninguém mais aplica — só mostra a tag visual.
- ✅ Relatórios e listagens leem `preco` direto. RPCs do banco corrigidas para não multiplicar nem subtrair de novo.
- ✅ Backfill via runner client-side cobre todos os pedidos antigos, inclusive os com `preco` errado tipo o 1951.

## Ordem de execução

1. Migration SQL (adicionar `preco_migrado_v2` + atualizar as 5 RPCs/triggers).
2. Atualizar `order-logic.ts` (leitura simples).
3. Atualizar todos os fluxos de gravação (passos 3 e 4).
4. Criar `RecalcPrecosRunner` no admin.
5. Auditar leituras restantes (passo 5).
6. Você roda o runner uma vez, em produção, fora de horário de pico.
7. Após confirmar tudo certo, ajustar UI de desconto (passo 8).
