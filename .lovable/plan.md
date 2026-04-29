## Objetivo

Permitir navegar entre pedidos diretamente da tela de detalhe (`/pedido/:id`) usando setas "Anterior" e "Próximo", sem precisar voltar à listagem.

## Como vai funcionar

- No cabeçalho de `OrderDetailPage`, ao lado do botão "Voltar", aparecem dois botões com setas: `←` Anterior e Próximo `→`.
- A ordem usada é a mesma da listagem padrão de "Meus Pedidos / Acompanhar": ordenada por `created_at DESC` (igual ao `useOrdersQuery` já existente), respeitando o que o usuário enxerga:
  - `vendedor` / `vendedor_comissao`: somente os próprios pedidos.
  - `admin_master` / `admin_producao`: todos os pedidos.
- A navegação é cíclica desativada: nas extremidades os botões ficam desabilitados (sem voltar do primeiro para o último).
- Mostra texto auxiliar pequeno: "3 / 128" indicando posição na lista.
- Atalhos de teclado: setas `←` / `→` navegam (ignorado quando o foco está em input/textarea).

## Como obter a lista

Criar um hook leve `useOrderNeighbors(currentId)` que:

1. Busca apenas as colunas `id` e `created_at` de `orders` (payload mínimo).
2. Aplica o filtro de visibilidade do papel do usuário:
   - vendedores: `.eq('vendedor_id', user.id)` (mesmo critério já usado em outras telas).
   - admins: sem filtro.
3. Ordena por `created_at DESC, id DESC` (desempate estável).
4. Retorna `{ prevId, nextId, index, total }` com base na posição do `currentId`.

A lista é cacheada via `useQuery` (chave inclui o role/userId) para evitar refetch a cada navegação. Ao trocar para um pedido vizinho, o `useOrderById` já recarrega os dados completos.

## Arquivos afetados

- `src/hooks/useOrderNeighbors.ts` — novo hook.
- `src/pages/OrderDetailPage.tsx` — adicionar os botões `ChevronLeft` / `ChevronRight` no header (linhas ~357-375), contador "x / y" e listener de teclado.

## UI (rascunho)

```
[← Voltar]            [← Anterior]  3 / 128  [Próximo →]   [Selecionar] [Buscar Pedido]
```

Botões usam `Button variant="outline" size="sm"` para combinar com o "Buscar Pedido" existente. Em telas estreitas (mobile) o contador esconde e mantém só as setas.

## Fora do escopo

- Não muda comportamento da listagem nem ordenação dela.
- Não altera o botão "Voltar" atual.
- Não persiste filtros aplicados na listagem (sempre usa a lista global do usuário). Se quiser respeitar filtros específicos da `ReportsPage` no futuro, seria uma extensão separada.
