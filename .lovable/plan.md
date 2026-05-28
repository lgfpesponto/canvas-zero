
## Problema 1 — Relatório "por Filtro" só exporta a página atual

**Causa raiz:** em `src/pages/ReportsPage.tsx` (linha 416), quando não há seleção manual, `ordersToExport` retorna `serverOrders` — que é só a página de 50 pedidos vinda do `useOrders`. O PDF então sai com no máx. 50 itens, mesmo que o filtro tenha 300.

**Correção:**
- Quando `selectedIds.size === 0`, ao clicar em "Gerar Relatório por Filtros" ou "Imprimir Fichas de Produção", buscar TODOS os pedidos do filtro via `fetchAllFilteredOrders(appliedFilters)` antes de gerar o PDF.
- Mostrar um toast de loading enquanto baixa ("Carregando 213 pedidos…") porque pode demorar 1–3 s.
- O destaque "Pedidos / Produtos / Valor total" no diálogo já usa `serverCount`/`totalProdutos`/`totalValue` (RPC `get_orders_totals`), que já contam tudo — só o PDF estava errado.

---

## Problema 2 — Filtro "Mudou para status" lento e retorna vazio com duas datas

**Causa raiz:** a RPC `find_orders_by_status_change` faz **sequential scan** em toda a tabela `orders`, explodindo `historico` (jsonb) com `jsonb_array_elements` em cada linha e ainda parseando string→date. Sem índice. Com a base atual, o scan ultrapassa o timeout do PostgREST → erro retorna array vazio no frontend (`return []` no `useOrders.ts:37`). É por isso que "com duas datas" parece "não retornar nada" — quanto maior o range, mais demorado, maior chance de timeout.

**Correção em duas frentes:**

1. **Reescrever a RPC para usar índice GIN:**
   - Criar índice: `CREATE INDEX idx_orders_historico_gin ON orders USING gin (historico jsonb_path_ops);`
   - Mudar o filtro inicial da RPC para pré-filtrar com `historico @> ANY (ARRAY[...])` (status), reduzindo drasticamente as linhas escaneadas antes do `jsonb_array_elements`.
   - Manter o parse de data como hoje (compatível com ambos formatos), mas só rodando sobre as linhas pré-filtradas.

2. **Frontend (`useOrders.ts`):**
   - Distinguir "RPC falhou" de "lista vazia": se houver erro, mostrar `toast.error("Filtro 'Mudou para' demorou demais — tente um período menor")` em vez de retornar `[]` silenciosamente.

---

## Problema 3 — Relatório "Comissão Bordado" muda a quantidade entre execuções no mesmo período

**Causa raiz:** em `SpecializedReports.tsx` (linha 1418), depois de pegar os IDs via `find_orders_by_status_change`, o filtro `valid` exclui pedidos cujo **status atual** seja anterior a "Baixa Bordado 7Estrivos" ou seja "Cancelado". Resultado: um pedido baixado no sábado pode, na segunda, ter voltado de status (regressão com justificativa) ou ter sido cancelado — e some do relatório, mesmo a baixa tendo realmente ocorrido no período.

**Correção:**
- Remover o filtro `idx >= baixaIdx` — a única exclusão que faz sentido é `status === 'Cancelado'`. Quem teve baixa dentro do período conta como baixa daquele período, independente do que aconteceu depois.
- Replicar a mesma lógica em `BordadoPortalPage.tsx` (linha 240) para o portal de Bordado, garantindo que Neto/Débora e o admin vejam o mesmo número.
- Adicionar nota no rodapé do PDF: "Inclui pedidos baixados no período mesmo se hoje estão em outra etapa. Excluídos apenas os Cancelados."

---

## Arquivos a alterar

```text
supabase/migrations/<novo>.sql        Índice GIN + nova versão da find_orders_by_status_change
src/hooks/useOrders.ts                Toast de erro na RPC + nada de mascarar como vazio
src/pages/ReportsPage.tsx             ordersToExport busca tudo via fetchAllFilteredOrders
src/components/SpecializedReports.tsx Remover filtro idx>=baixaIdx no Comissão Bordado
src/pages/BordadoPortalPage.tsx       Mesma correção do filtro no PDF do portal
```

## Validações depois de aplicar

1. Filtrar 30 dias com "Mudou para = Baixa Bordado 7Estrivos" — deve voltar em < 2 s e listar todos.
2. Gerar "Relatório por Filtros" sem selecionar nada num filtro com > 50 pedidos — PDF deve conter todos.
3. Rodar "Comissão Bordado" no mesmo período em dois dias diferentes — contagem só pode mudar se algum pedido novo for baixado no intervalo.
