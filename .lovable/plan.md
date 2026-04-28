## Problema

Ao ativar o filtro **"Apenas atrasados"**, a lista de pedidos exibida muda corretamente (passa a mostrar apenas os atrasados), mas os cards **"Total de Produtos"** e **"Valor Total"** continuam exibindo os números do servidor — ou seja, o total de TODOS os pedidos da página atual (filtrados sem a regra de atraso).

## Causa

Em `src/pages/ReportsPage.tsx`:

- `totalProdutos` e `totalValue` vêm direto do hook `useOrders(...)` (linha 196), que faz a query paginada padrão e não conhece a lógica de atraso.
- Quando `onlyOverdue` está ligado, a lista visível (`visibleOrders`) é trocada para `overdueOrders` (calculado em outro `useEffect`, linha 272), mas os cards de resumo continuam lendo `totalProdutos` / `totalValue` do hook original.

Resultado: a contagem/valor dos cards reflete o conjunto SEM o filtro de atraso aplicado.

## Solução

Calcular `totalProdutos` e `totalValue` a partir de `visibleOrders` quando `onlyOverdue` estiver ativo, replicando a mesma fórmula usada pelo hook `useOrders` (somar `quantidade` e `preco * quantidade − desconto + adicional_valor`, respeitando regras já existentes de pedidos extras e descontos).

### Mudanças técnicas

1. **`src/pages/ReportsPage.tsx`**:
   - Inspecionar a fórmula exata em `src/hooks/useOrders.ts` para `totalProdutos` e `totalValue` (garantir paridade — botas vs extras, descontos, adicionais, exclusões TROCA/ERRO etc.).
   - Criar `useMemo` que, quando `onlyOverdue === true`, computa os totais a partir de `overdueOrders` usando a mesma fórmula.
   - Substituir os valores exibidos nos cards por esses derivados (`displayTotalProdutos`, `displayTotalValue`).
   - Ajustar `LoadingValue` para usar `overdueLoading` quando `onlyOverdue` estiver ativo.

2. Nenhuma mudança de banco, RLS ou backend.

### Critério de aceite

- Com "Apenas atrasados" ligado, "Total de Produtos" e "Valor Total" refletem exatamente os pedidos visíveis na lista.
- Combinações de filtros (vendedor, produto, status, busca) continuam funcionando junto com o filtro de atrasados.
- Sem o filtro ligado, os totais permanecem idênticos ao comportamento atual.