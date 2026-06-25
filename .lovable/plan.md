# Plano — Devolução automática ao estoque + UI "Sem estoque" + remover edição admin

## 1. Devolver pares ao estoque ao cancelar/excluir pedido de Estoque

### Mecanismo
Usar triggers no banco para garantir consistência independente do caminho (UI, RPC, edge function). Cada item em `extra_detalhes.botas[]` carrega `estoque_produto_id` e representa **1 par** — basta agregar e somar de volta.

### Migração SQL
- Função `public.devolver_estoque_pedido(_extra_detalhes jsonb) RETURNS jsonb`:
  - Agrupa `botas[].estoque_produto_id` somando ocorrências.
  - Para cada produto: `UPDATE estoque_produtos SET quantidade = quantidade + n WHERE id = ...` (com lock).
  - Retorna `{ devolvidos: [{ produto_id, qtd }] }`.
  - `SECURITY DEFINER`, `search_path = public`.
- Trigger `trg_orders_devolve_estoque_cancel` **BEFORE UPDATE** em `public.orders`:
  - Condição: `(NEW.extra_detalhes->>'origem_estoque')::boolean = true`
    AND `NEW.extra_detalhes->>'estoque_devolvido' IS DISTINCT FROM 'true'`
    AND `NEW.status = 'Cancelado'` AND `OLD.status IS DISTINCT FROM 'Cancelado'`.
  - Chama `devolver_estoque_pedido(NEW.extra_detalhes)`.
  - Marca `NEW.extra_detalhes = jsonb_set(NEW.extra_detalhes, '{estoque_devolvido}', 'true'::jsonb)`.
  - Acrescenta linha em `NEW.historico` descrevendo a devolução (ex.: "Devolvidos ao estoque: 3 par(es)").
- Trigger `trg_orders_devolve_estoque_delete` **BEFORE DELETE** em `public.orders`:
  - Condição igual (origem_estoque=true e ainda não devolvido).
  - Chama `devolver_estoque_pedido(OLD.extra_detalhes)`.
  - Não precisa marcar flag (linha está saindo).
- Sem migração de dados — só novas funções/triggers.

### Comportamentos cobertos
- Status muda para "Cancelado" via UI/ReportsPage/RPC → estoque volta.
- Exclusão direta ou em lote (`deleted_orders` arquivamento permanece como está) → estoque volta antes do DELETE.
- Idempotente: a flag `estoque_devolvido` evita devolver duas vezes (ex.: cancelar → reativar → cancelar de novo não devolve a segunda vez; se o pedido foi reativado sem que o estoque tenha sido re-debitado, o sistema não sabe disso — documentar em mensagem de histórico).

### Fora do escopo
- Re-debitar estoque ao "des-cancelar" um pedido (cenário raro; o usuário pediu explicitamente apenas o caminho cancelado/excluído).

## 2. Card "Sem estoque" e ordenação por último

`src/pages/EstoquePage.tsx`:
- Em `filteredGroups`, parar de filtrar produtos com soma=0 — manter no grid.
- Computar `g.totalQtd = sum(tamanhos.quantidade)` e ordenar: produtos com estoque primeiro (alfabético), produtos zerados depois (alfabético).
- No card: se `totalQtd === 0`, exibir um overlay/badge grande "SEM ESTOQUE" sobre a imagem, esconder a grade de tamanhos (ou mostrar todos com `0 un.` e cor mutada), desabilitar o botão "Comprar" (mostrar "Indisponível").
- Os tamanhos ainda existem no banco para futura reposição (entram pedidos com mesmo nome+sku_base via `criar_estoque_produto` somando quantidade).

## 3. Remover edição admin do estoque

- Em `src/pages/EstoquePage.tsx`: remover os botões "Editar grade" e "Excluir", o estado `editingProduct`, o handler `handleDeleteProduct`, os imports `Pencil`/`Trash2` (se não usados em outro lugar) e o uso de `useAuth`.
- Remover o mount de `<EstoqueGradeEditor />`.
- Apagar arquivo `src/components/estoque/EstoqueGradeEditor.tsx`.
- Estoque passa a ser mutado **apenas** por:
  - `criar_estoque_produto` (pedidos novos de vendedor=Estoque chegando à etapa Baixa Estoque).
  - `comprar_estoque` (compras saindo).
  - `devolver_estoque_pedido` (novo — cancelamento/exclusão).

## 4. Arquivos

- **Migração nova** (via tool de migração): funções + triggers descritos em §1.
- **Editado**: `src/pages/EstoquePage.tsx` (itens §2 e §3).
- **Removido**: `src/components/estoque/EstoqueGradeEditor.tsx`.

Confirma para implementar?
