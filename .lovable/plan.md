## Objetivo
Gerar novamente o PDF/lista de pedidos em Pesponto 01–10, agora em **uma única coluna** (um pedido por linha), na ordem correta e sem incluir pedidos do vendedor "Estoque".

## Regras
- **Filtro**: `status` casa `Pesponto \d{2}` (01 a 10). Excluir `Pespontando` e `Pesponto Ailton`.
- **Somente botas de ficha de produção**: `tipo_extra IS NULL` e `estoque_pronto = false` (já é o padrão).
- **Excluir vendedor Estoque**: `vendedor <> 'Estoque'` (e variações — filtrar case-insensitive por segurança).
- **Ordenação**: `data_criacao` ASC, depois `numero` ASC.
- **Layout**: uma linha por pedido, três colunas fixas na mesma linha → `Nº Pedido | Data | Progresso`. Nada de múltiplos pedidos lado a lado.

## Passos (após aprovar)
1. Consultar novamente via `supabase--read_query` trazendo `numero, data_criacao, status, vendedor` filtrando `Pesponto%`, `tipo_extra IS NULL`, `estoque_pronto = false`, `vendedor <> 'Estoque'`.
2. Filtrar em Python para casar `^Pesponto \d{2}$`.
3. Ordenar por `data_criacao` ASC → `numero` ASC.
4. Imprimir a lista completa no chat, uma linha por pedido.
5. Gerar PDF `/mnt/documents/Pesponto - Todos - {data}.pdf` com reportlab, tabela de 3 colunas, uma linha por pedido, cabeçalho repetido por página, total no rodapé.
6. Entregar como `<presentation-artifact>`.

## Fora de escopo
Nenhuma alteração em código do portal, edge functions ou banco.
