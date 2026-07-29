# Filtros na vitrine pública + "não sincronizados" em Ver produtos

## Parte 1 — Filtros dentro do link público (`VitrinePublicaPage`)

Hoje o payload do link (`payload.search`, `payload.tamanhos`, `payload.ficha`) só serve como filtro fixo aplicado no servidor. Quem abre o link não consegue ajustar nada. Vou adicionar controles no cabeçalho da vitrine para o destinatário refinar dentro do escopo enviado.

**Comportamento**
- `payload.search`, `payload.tamanhos` e `payload.ficha` continuam sendo o **escopo máximo** — o visitante só filtra dentro do que foi enviado.
- Se o admin já mandou o link com tamanhos específicos, o filtro de tamanho na página fica **restrito àqueles tamanhos**.
- Se não mandou nenhum, aparecem todos os tamanhos com estoque disponível no resultado atual.

**UI (barra fixa logo abaixo do header)**
- Campo `Buscar modelo` (input com ícone lupa) — combina com o `payload.search` via AND.
- Chips de tamanho — só os que existem no resultado do escopo; clicáveis para toggle.
- Botão `Limpar` aparece quando o visitante mexeu em algo.
- Contador `X produtos` à direita.

Nada de filtros de ficha nem preço — mantém a página simples para o cliente final. Sem alteração no token/link, é só filtragem client-side.

## Parte 2 — "Ver produtos" mostrando **todos os não sincronizados**

Hoje o diálogo lê apenas `estoque_produtos` com `bagy_sync_status in (pendente/erro/nao_encontrado)` ou `bagy_sync_at is null`. O problema é que os erros atuais (401 token inválido) acontecem no drenar da fila `bagy_stock_sync_queue`, e esses casos ficam registrados lá com `ultimo_erro`, **sem** necessariamente alterar `bagy_sync_status` do produto — por isso o diálogo mostra "0 produtos" mesmo com fila cheia de erros.

**Mudança**
- No `BagySyncErrorsDialog` e no `BagySyncPendingButton`, unir duas fontes:
  1. `estoque_produtos` (filtro atual) → produtos "nunca sincronizados" ou marcados com erro no registro-mestre.
  2. `bagy_stock_sync_queue` com `processado_em is null` **OU** `ultimo_erro is not null` → joga o produto pai (`estoque_produto_id`) na lista com o `ultimo_erro` da fila e a data de `criado_em`/`tentativas` como "Última tentativa".
- Deduplicar por `estoque_produto_id`. Quando o produto aparece nas duas fontes, priorizar a mensagem de erro mais recente (fila) sobre a do produto.
- Contador do botão externo (`Sincronizar com Bagy (N)`) passa a refletir o mesmo conjunto unificado, para o número bater com o que abre no diálogo.
- Nova coluna implícita: linha ganha um sub-badge "Fila" quando o erro veio de `bagy_stock_sync_queue`, para distinguir de erro cadastral.
- Realtime: assinar também `bagy_stock_sync_queue` além de `estoque_produtos`.

Sem mudanças de schema, RLS ou edge function. Apenas front-end.

## Fora do escopo

- Não vou tocar no gerador do token nem no botão de compartilhar.
- Não vou renovar o token Bagy nem mexer no drenar da fila — o objetivo aqui é só **enxergar** os itens com problema.
