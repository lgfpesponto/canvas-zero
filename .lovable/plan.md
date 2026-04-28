## Problema

O filtro **"Apenas atrasados"** não puxa pedidos atrasados de **Gravata Country** (e outros extras de revendedores) quando combinado com filtros de produto e vendedor. Investiguei a URL atual (`atrasados=1`, `produtos=gravata_country`, lista de vendedores) e identifiquei dois bugs no `useEffect` overdue de `src/pages/ReportsPage.tsx` (linhas 202–240):

### Bug 1 — Filtro de vendedor ignora "clientes virtuais da Juliana"

A query usa `.in('vendedor', [...filterVendedor])`, mas em `useOrders.ts` (lógica padrão da lista) o filtro de vendedor é montado com OR para também aceitar pedidos onde `vendedor='Juliana Cristina Ribeiro' AND cliente=<nome do vendedor>`. Confirmei via banco que existem clientes vinculados à Juliana com mesmos nomes de revendedores (`Rejane`, `Simeia`, `Rayne` aparecem como `cliente` da Juliana). O overdue ignora esse caso.

### Bug 2 — `.neq('vendedor', 'Estoque')` conflita com seleção do usuário

Quando "Estoque" está no filtro selecionado, o `.neq('vendedor','Estoque')` o exclui de qualquer modo. Como pedidos do "Estoque" são internos e não têm prazo (`isNoDeadline=true`), na prática isso não tira nenhum atrasado; mas é redundante e pode confundir. O correto é deixar a própria função `getOrderDeadlineInfo` decidir (ela já retorna `isOverdue=false` para `vendedor=Estoque`).

### Bug 3 — Combinação `produto + vendedor` no banco é AND restritivo

Hoje a query aplica `vendedor IN (...)` e depois filtra produto em memória. Tudo bem, mas com filtros de produto cujos pedidos vêm de muitas fontes diferentes (ex.: `gravata_country` espalhada por Maria Gabriela, Rafael, Samuel, Fabiana), o limite de 1.000 pode cortar antes de pegar tudo. Para o caso atual cabe folgado, mas vou empurrar o filtro de produto para o banco também (`tipo_extra IN (...)` ou `tipo_extra IS NULL` para botas) para reduzir tráfego e garantir consistência.

## Arquivo a editar

**`src/pages/ReportsPage.tsx`** — `useEffect` overdue (linhas 202–240):

1. **Filtro de vendedor**: replicar a mesma lógica de `useOrders.ts` (cláusula `or` aceitando `vendedor.eq.<nome>` OU `and(vendedor.eq.Juliana Cristina Ribeiro, cliente.eq.<nome>)`).

2. **Remover `.neq('vendedor','Estoque')`**: deixar `getOrderDeadlineInfo` filtrar via `isOverdue=false` para Estoque (já garante).

3. **Empurrar filtro de produto para o banco**:
   - `bota` → `tipo_extra IS NULL`
   - extras → `tipo_extra IN (...)`
   - combinação → `or(tipo_extra.is.null, tipo_extra.in.(...))`

4. Manter o `.range(0, 999)` e o filtro final em memória por `isOverdue` (que considera prazo dinâmico por tipo).

## Resultado esperado

- Marcar "Apenas atrasados" + produto Gravata Country + vendedores selecionados → mostra os pedidos `Em aberto`/`Produzindo` de gravata_country desses vendedores que passaram do prazo de 1 dia útil (ex.: pedido `8033` da Fabiana de 17/04, `GRAVATAxx` da Maria Gabriela de 23/04, etc.).
- Funciona para qualquer combinação de produto + vendedor + status + data + busca + atrasados.
- Pedidos do vendedor "Estoque" continuam fora (sem prazo).
