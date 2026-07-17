## Problema
Ao clicar em "excluir produto do estoque" a Stefany (admin_master) recebe:
`Erro ao excluir: null value in column "estoque_produto_id" of relation "bagy_stock_sync_queue" violates not-null constraint`

## Causa
A FK `bagy_stock_sync_queue.estoque_produto_id` é `ON DELETE SET NULL`, mas a coluna é `NOT NULL`. Quando a RPC tenta apagar o produto, o Postgres tenta setar NULL nas linhas de fila que apontam para ele e aborta a transação.

## Correção
Uma única migração recria as duas RPCs adicionando, logo antes do `DELETE FROM public.estoque_produtos`, um `DELETE FROM public.bagy_stock_sync_queue WHERE estoque_produto_id = ...` (a fila de sync perde o sentido depois que o produto some).

Funções afetadas:
- `public.excluir_estoque_produto(_produto_id uuid)`
- `public.excluir_estoque_produto_completo(_ids uuid[])`

## Fora do escopo
- Não altero a FK nem a nullability (evita efeitos em outros fluxos da Bagy).
- Não mexo em `EstoquePage.tsx` — o frontend já está correto.
- Regra de exclusão continua restrita a admin_master / admin_producao como hoje.
