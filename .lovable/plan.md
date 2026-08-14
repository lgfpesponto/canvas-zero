# Filtro por cliente + "Apenas atrasados" nos relatórios

## 1. Novo filtro "Cliente" em Meus Pedidos

Hoje existe apenas um campo de busca geral, que já procura no número do pedido **e** no nome do cliente ao mesmo tempo. Isso mistura resultados e não permite buscar só por cliente.

Mudança:
- Adicionar um campo próprio **"Cliente"** na barra de filtros, ao lado da busca, disponível para todos os papéis (vendedor, comissão, admin etc.).
- Digitar parte do nome já filtra (busca parcial, sem diferenciar maiúsculas/acentos de digitação).
- O campo entra no botão FILTRAR, no LIMPAR e no link da página (para poder compartilhar/voltar mantendo o filtro).
- Cada vendedor continua vendo apenas os próprios pedidos — o filtro não amplia acesso.

## 2. "Apenas atrasados" (e demais filtros) no Relatório por Filtros

Hoje, ao gerar o "Relatório por Filtros", o PDF é montado a partir de uma nova busca que ignora o botão **Apenas atrasados** — o resultado sai com pedidos que não estão atrasados, diferente do que aparece na tela.

Mudança:
- O relatório passa a usar exatamente a mesma lista mostrada na tela: com "Apenas atrasados" ligado, só entram os pedidos atrasados.
- Garantir que os demais filtros também sejam respeitados nesse modo: **Conferido** e **"Mudou para o status"** hoje não são aplicados quando "Apenas atrasados" está ligado; passarão a ser.
- O mesmo vale para as **Fichas de Produção** e demais exportações que usam a lista de pedidos filtrados.
- O resumo de confirmação antes de gerar o PDF passa a listar todos os filtros ativos (incluindo Cliente, Conferido e "Mudou para").

## Detalhes técnicos

Arquivos: `src/pages/ReportsPage.tsx`, `src/hooks/useOrders.ts`.

- `OrderFilters` ganha `filterCliente?: string`; em `useOrders` aplica `cliente.ilike.%...%` (separado do `or` de `searchQuery`), e o mesmo em `fetchAllFilteredOrders` e no fetch de atrasados.
- Estado `filterCliente` em `ReportsPage`, incluído em `appliedFilters`, `applyFilters`, `syncSearchParams` (param `cliente`), no handler do switch de atrasados e no LIMPAR.
- `resolveOrdersForExport`: quando `onlyOverdue` estiver ativo, retornar `visibleOrders`/`overdueOrders` (já filtrados por `getOrderDeadlineInfo(...).isOverdue`) em vez de chamar `fetchAllFilteredOrders`, respeitando a seleção manual quando houver.
- No `useEffect` de atrasados: aplicar `filterConferido` e restringir aos IDs da RPC `find_orders_by_status_change` quando `mudouParaStatus` estiver ativo.
