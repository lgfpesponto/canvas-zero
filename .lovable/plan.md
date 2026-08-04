# Bola Grande na composição do pedido

## O que foi verificado

No pedido 17855148246882 a ficha mostra "bola grande:24" nos metais, mas a composição não traz a linha de cobrança. Motivo confirmado no código:

- Na criação do pedido (`src/pages/OrderPage.tsx`), a bola grande entra no **total** (0,60 x quantidade), mas a quantidade só é gravada dentro do texto de metais como `Bola Grande:24`. Ela **não** é salva em `extra_detalhes.bolaGrandeQtd`.
- A tela de detalhe (`src/pages/OrderDetailPage.tsx`) lê exatamente `extra_detalhes.bolaGrandeQtd`, que nunca existe — por isso a linha some da composição e do quadro "Detalhes da Bota".
- O mesmo acontece no PDF de cobrança e no recálculo de preço: Strass, Cruz e Bridão têm linha própria, Bola Grande não tem.

## O que será feito

1. **Leitura tolerante**: uma função única que descobre a quantidade de bola grande do pedido, primeiro por `extra_detalhes.bolaGrandeQtd` e, se não houver, extraindo do texto de metais (`Bola Grande:24`).
2. **Composição do pedido**: passa a exibir `Bola Grande (24 un.) — R$ 14,40`, na mesma posição de Strass.
3. **Quadro "Detalhes da Bota"**: passa a mostrar a quantidade corretamente.
4. **PDF de cobrança e espelho**: mesma linha de cobrança.
5. **Recálculo de preço**: passa a somar a bola grande (hoje ela some do recálculo, o que pode reduzir indevidamente o valor de um pedido ao recalcular).
6. **Pedidos novos**: ao criar/editar, a quantidade também passa a ser gravada em `extra_detalhes.bolaGrandeQtd`.

## Sobre pedidos antigos

Nenhuma migração ou reconciliação em massa será executada — nada de pedido já passado será alterado no banco. Como a leitura é tolerante, pedidos antigos que já tinham `Bola Grande:N` no texto de metais passam apenas a **exibir** a linha corretamente, sem mudar o valor gravado.

## Arquivos afetados

- `src/lib/orderFichaCategories.ts` (ou novo helper compartilhado) — função de leitura da quantidade
- `src/pages/OrderDetailPage.tsx` — composição e detalhes
- `src/lib/cobrancaPdf.ts` — linha no PDF/espelho
- `src/lib/recomputeOrderPrice.ts` e `supabase/functions/reconciliar-precos/index.ts` — soma no recálculo
- `src/pages/OrderPage.tsx` e `src/pages/EditOrderPage.tsx` — gravar `bolaGrandeQtd` em `extra_detalhes`
