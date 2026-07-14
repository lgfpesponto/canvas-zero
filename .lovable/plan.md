## Contexto atual

Existem dois caminhos que geram pedidos no portal a partir da Bagy:

1. **Estoque** (`RPC comprar_estoque_bagy` chamada pelo `bagy-webhook`) — junta todos os itens de estoque num único pedido `RC-{numeroBagy}`, com `quantidade` somada e vários "botas" no `extra_detalhes`.
2. **Ficha** (`BagyFichaDialog` aberto pelo botão "Gerar ficha" em `RanchoChiquePedidosPage`) — enfileira cada `bagy_pedido_itens` que tem `template_id`. Cada item vira UMA ficha, sempre com número `RC-{numeroBagy}` (colidiria se houvesse mais de um).

## Regra decidida

- Sufixo só quando há mais de um par no pedido Bagy.
- **Por unidade** (par): quantidade 3 do mesmo modelo → `A`, `B`, `C`. Produtos diferentes também consomem letras na mesma sequência.
- Formato: `RC-1234`, `RC-1234A`, `RC-1234B`, ... `RC-1234Z`, `RC-1234AA`, ...
- Pedidos com apenas 1 par mantêm `RC-1234` (sem letra).
- A letra é atribuída na ordem dos itens do payload Bagy; para quantidade>1 do mesmo item, letras consecutivas.

## Mudanças

### 1. Estoque — `comprar_estoque_bagy` (migration)

Reescreve a RPC para criar **um pedido por par** ao invés de um pedido único:

- Calcula `total_units = soma(quantidade)` de todos os itens de estoque.
- Se `total_units == 1`: numero = `_numero_pedido` (comportamento atual, sem sufixo).
- Se `total_units > 1`: gera letras `A..Z, AA, AB, ...` (helper interno `_suffix(n)`), cada par vira um `INSERT` separado em `orders` com:
  - `numero = _numero_pedido || _suffix(i)`
  - `quantidade = 1`, `preco = preco_unit` daquele item
  - `extra_detalhes.botas` só com a bota correspondente (1 par)
  - `historico` diz "Par X de Y da Bagy"
  - Todos compartilham `bagy_order_id` e o mesmo `_numero_pedido` base em `numero_pedido_bota` para agrupamento
- Retorna `{ok, order_ids: [uuid,...], numeros: ['RC-1234A',...], total_qtd, total_preco}` (mantém compat com `order_id` retornando o primeiro).
- Idempotência: check inicial procura por `bagy_order_id` — se já existe pelo menos 1 pedido para esse bagy_order_id, retorna `already_existed`.

### 2. Estoque — `bagy-webhook/index.ts`

- Atualiza chamada para consumir a nova assinatura de retorno.
- Ao atualizar `bagy_pedido_itens.order_id_portal`, precisa mapear cada linha da tabela ao seu pedido correto: expande o item Bagy em N ordens; para simplificar, guarda `order_ids` numa coluna JSONB `order_ids_portal` no item (já existe? verificar) OU grava o primeiro `order_id` no `order_id_portal` existente e a lista completa em `extra_detalhes` do primeiro pedido. **Alternativa mínima**: apenas gravar o primeiro `order_id_portal` em `bagy_pedido_itens` (mantém compat com hoje) e deixar todos os pedidos linkados via `bagy_order_id` — a UI já consegue listar por esse campo.
- Ao enfileirar sync "separated" na Bagy, envia uma vez só (comportamento atual).

### 3. Ficha — `RanchoChiquePedidosPage.tsx` (queueFromPedido)

Ao montar a fila de fichas:
- Enumera itens elegíveis (`aguardando_ficha` + `template_id`).
- Expande cada item em `quantidade` entradas na fila.
- Calcula total de pares no pedido inteiro; se >1, atribui letras `A..Z, AA, ...` na sequência global; se ==1, sem letra.
- A fila passa a carregar `{pedidoId, itemId, unitIndex, numeroOverride}` para o dialog.

### 4. Ficha — `BagyFichaDialog.tsx`

- Aceita o `numeroOverride` do item de fila e usa como `resolved.numero` (ao invés de sempre `RC-{numeroBagy}`).
- Cabeçalho mostra "Par X/Y" com base em `unitIndex`.
- Ao salvar (`onBagySaved`), avança normalmente; próximo item usa a próxima letra.

### 5. Helper compartilhado

Cria `src/lib/bagySuffix.ts` com `letterSuffix(n)` (0→'A', 25→'Z', 26→'AA'...) para reusar entre RanchoChiquePedidosPage e outros pontos que precisem exibir/agrupar.

Uma função equivalente em PL/pgSQL vai dentro da migration.

## Escopo de arquivos

- 1 migration SQL (nova versão de `comprar_estoque_bagy` + helper `bagy_suffix`).
- `supabase/functions/bagy-webhook/index.ts` (ajuste no consumo do retorno).
- `src/pages/RanchoChiquePedidosPage.tsx` (expansão da fila).
- `src/components/bagy/BagyFichaDialog.tsx` (aceita `numeroOverride`, exibe par X/Y).
- `src/lib/bagySuffix.ts` (novo, helper de letras).

## Fora de escopo

- Não altero UI da listagem `RanchoChiquePedidosPage` além do necessário para gerar a fila; o agrupamento visual dos vários pedidos derivados já funciona porque compartilham `bagy_order_id`.
- Não mexo em pedidos Bagy já criados (não vou renomear retroativamente).
