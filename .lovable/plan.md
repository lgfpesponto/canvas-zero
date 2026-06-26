## Problema

O pedido Bagy `50013032` (e qualquer outro nessa situação) chegou no portal com `items[].sku = null` no payload — porque o SKU foi cadastrado na Bagy **depois** que o pedido foi criado. O webhook usa só `sku` do payload para casar com estoque/modelo. Quando o usuário cadastra o SKU no produto Bagy e no modelo rascunho e clica em **Reprocessar**, o `bagy-reprocess` apenas re-envia o **payload salvo** (que continua com `sku: null`), então o match continua falhando e o pedido permanece em `aguardando_mapeamento`.

## Correção

### `supabase/functions/bagy-webhook/index.ts`

Quando um item do pedido vier sem SKU no payload, buscar o SKU **ao vivo** na Bagy usando os IDs que já vêm no payload (`variation_id` e/ou `product_id`).

1. Adicionar helper `fetchBagySku({ variationId, productId })`:
   - Se `BAGY_API_TOKEN` não estiver setado, retorna `null` (mantém comportamento atual).
   - Tenta `GET {BAGY_BASE}/variations/{variationId}` e lê `sku` (fallback `/products/variations/{variationId}` em 404, mesmo padrão usado em `bagy-stock-sync`).
   - Se ainda não achou e tiver `productId`, tenta `GET {BAGY_BASE}/products/{productId}` e lê `sku` raiz.
   - Faz cache em memória por chamada (Map) para evitar refetch quando o mesmo item se repete.

2. No loop de itens (linha ~396): se `skuRaw` ficar vazio, chamar `fetchBagySku(...)` e usar o valor retornado como `skuRaw` antes da busca por estoque/template. Continuar tudo igual a partir daí (parse de tamanho, lookup em `estoque_produtos`, lookup em `order_templates` por `sku` raiz ou por `tamanhos_skus[*].sku`).

3. Mantém `payload: it` salvo cru no `bagy_pedido_itens.payload`; mas grava `sku: skuRaw` (já enriquecido) na coluna `sku`, para a tela mostrar corretamente.

### Sem mudanças em `bagy-reprocess`

Como o reprocess apenas re-POSTa o payload, e a re-lookup acontece dentro do webhook, basta o usuário clicar **Reprocessar** depois de cadastrar o SKU na Bagy + criar o modelo. Não precisa novo botão.

## Fora de escopo
- Não muda a UI da página de Pedidos Bagy.
- Não altera a estrutura do payload salvo em `bagy_pedidos.payload`.
- Não muda `bagy-stock-sync` nem fluxo de estoque.
- Sem migração de banco.
