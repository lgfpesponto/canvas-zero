## Problema

O card "Total de Produtos" e "Valor Total" em `/relatorios` está mostrando o total **do sistema inteiro** para vendedores, em vez de mostrar só os pedidos no nome deles.

**Causa:** A função `get_orders_totals` do banco é `SECURITY DEFINER`, ou seja, ignora a RLS e soma todos os pedidos. A lista de pedidos abaixo está correta (essa respeita RLS), mas os cards de cima usam essa RPC que enxerga tudo.

## Correção

Alterar a função `get_orders_totals` para que, quando o usuário **não for admin** (`admin_master` ou `admin_producao`), ela force o filtro pelo `nome_completo` do próprio usuário logado. Para `vendedor` e `vendedor_comissao` ela vai somar exclusivamente os pedidos onde `vendedor = nome do usuário logado` (mantendo também a regra da Juliana Cristina, que pode ter sub-clientes).

Para administradores nada muda — continuam vendo o total geral e podem filtrar por vendedor à vontade.

## Comportamento esperado depois da correção

- Vendedora Maria Gabriela entra em "Meus Pedidos": cards mostram **só os pedidos dela** (1.654 produtos, R$ 505.190,17 no exemplo).
- Os filtros de data, status e produto continuam funcionando normalmente — somam só dentro dos pedidos dela.
- Admin master/produção continua vendo o total do sistema.
- **Nenhum preço é alterado**, só o cálculo dos cards de resumo.

## Detalhes técnicos

- Migration alterando `public.get_orders_totals` para, no início, detectar se o caller é admin via `is_any_admin(auth.uid())`. Se não for, sobrescreve `_vendedores` com `ARRAY[current_user_nome_completo()]` (ignorando qualquer valor passado pelo frontend, por segurança).
- A cláusula de filtro existente já trata o caso Juliana → cliente, então funciona sem alteração adicional.
- A `count` usada no botão "Selecionar todos" também vem dessa mesma RPC (linha 154 de `useOrders.ts`), então o número total de pedidos selecionáveis também passa a refletir só os do vendedor.
- A query principal de listagem (`from('orders').select`) não muda — ela já é filtrada por RLS.
- Sem mudança de UI nem de TypeScript.