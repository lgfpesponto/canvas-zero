## Objetivo

Quando um pedido de ficha (bota/cinto/extras) for criado a partir de um **modelo rascunho** do usuário, gravar no próprio pedido o **nome do modelo** e o **SKU** usado, e exibir esses dados como uma **tag pequena e discreta ao lado do número do pedido** em listagens e no detalhe. Produtos de estoque continuam usando o SKU já herdado e ficam fora dessa marcação.

## Mudanças

### 1. Banco (migration)
Adicionar duas colunas opcionais em `public.orders`:
- `template_nome text` — nome do modelo rascunho aplicado
- `template_sku text` — SKU resolvido a partir do modelo (SKU base, ou SKU da grade do tamanho escolhido)

Sem alteração de RLS. Nenhum dado existente é tocado.

### 2. Captura no momento de criar o pedido
Pontos de inserção que precisam preencher os novos campos quando `mode === 'template'` ou quando vier `templateData`:
- `src/pages/OrderPage.tsx` (botas + extras dinâmicas)
- `src/pages/BeltOrderPage.tsx` (cintos)

Regra de SKU:
1. Se o modelo tem `tamanhos_skus` e o tamanho escolhido bate, usar esse SKU.
2. Senão, usar `sku` base do modelo.
3. Senão, deixar `null`.

Pedidos de estoque (origem `EstoquePage`/grade) **não** preenchem esses campos — o SKU do estoque já vai no pedido pelo fluxo atual.

Para acompanhar o template aplicado entre o carregar e o submit, guardar em estado local `appliedTemplate: { nome, skuBase, tamanhosSkus }` quando `startEditing`/`populateFromTemplate` rodam vindos de um modelo (não vindos de draft puro).

### 3. UI — tag ao lado do número do pedido
Componente novo `src/components/orders/TemplateTag.tsx` (badge `outline`, texto `xs`, truncado, com tooltip mostrando nome completo + SKU). Render condicional: só aparece se `order.template_nome` existir.

Aplicar nos locais onde o número do pedido é exibido:
- `src/components/OrderCard.tsx` (listagens principais)
- `src/pages/OrderDetailPage.tsx` (cabeçalho do detalhe)
- `src/pages/EditOrderPage.tsx` / `EditBeltPage.tsx` / `EditExtrasPage.tsx` (cabeçalho da edição)

Visual: badge pequena cinza, formato `modelo • SKU` (SKU oculto se ausente).

### 4. Tipos
`src/integrations/supabase/types.ts` é regenerado pela migration. `Order` em `src/lib/order-logic.ts` ganha os campos opcionais e `dbRowToOrder` os repassa.

## Fora de escopo
- Backfill em pedidos antigos.
- Mudar o SKU dos pedidos de estoque.
- Alterar lógica de preços, comissão ou produção.
