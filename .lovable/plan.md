## Causa do bug

O filtro **"Apenas atrasados"** está aplicando o filtro client-side **somente sobre a página atual de 50 pedidos** retornada por `useOrders` (ordenada por data DESC, ou seja, os mais recentes). Pedidos atrasados são justamente os **mais antigos**, então eles não estão na primeira página → aparece "nenhum pedido encontrado".

O painel "Pedidos em Alerta" do dashboard funciona porque busca até 500 pedidos não-finais diretamente via Supabase, ignorando a paginação.

## Correção

Quando `onlyOverdue` estiver ativo em `src/pages/ReportsPage.tsx`, fazer um **fetch dedicado** (não-paginado) parecido com o do dashboard:

- Query: `orders` com `status NOT IN (Expedição, Entregue, Cobrado, Pago, Cancelado)`, ordenado por `data_criacao ASC` (mais antigos primeiro = mais relevantes), `range(0, 999)`.
- Aplica os mesmos filtros já escolhidos pelo usuário: data, status (interseção com não-finais), vendedor, busca por número/cliente, produto (bota/cinto/extras).
- Filtra client-side por `getOrderDeadlineInfo(o).isOverdue === true`.
- Substitui o `serverOrders` em `visibleOrders` enquanto o toggle estiver ligado.
- Esconde a paginação (`totalPages > 1`) quando `onlyOverdue` está ativo, pois o resultado já vem completo.
- Adiciona um indicador de loading próprio para esse fetch.

Sem mudanças no banco/RPC. Único arquivo editado: `src/pages/ReportsPage.tsx` (novos imports `supabase`, `dbRowToOrder`, `Order`, novo `useEffect` que dispara quando `onlyOverdue` muda).
