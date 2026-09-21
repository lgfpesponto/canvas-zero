# Desenvolvimento faltando na composição do pedido

## O problema (confirmado no pedido 8-375)

O pedido 8-375 tem "Desenvolvimento (Bordado) — Igual foto" marcado na ficha, que vale R$ 50. Esse valor está somado no preço total do pedido (R$ 415), mas a lista de composição na tela de detalhe do pedido não mostra essa linha — por isso a soma exibida não bate com o total.

Causa: a composição do detalhe só considera o campo antigo de "Desenvolvimento" (o de escolha única). Os três desenvolvimentos novos da ficha (Bordado R$ 50, Laser R$ 100, Estampa R$ 150) não entram na lista, embora entrem no cálculo do preço.

Onde já funciona corretamente: tela de criação do pedido (espelho de valores), recálculo de preço e composição de botas de estoque.

## O que será feito

Na tela de detalhe do pedido, incluir na composição as linhas que hoje faltam:

- Desenvolvimento Bordado — R$ 50 (com a descrição quando houver, ex.: "Igual foto")
- Desenvolvimento Laser — R$ 100
- Desenvolvimento Estampa — R$ 150

Ficam logo após a linha do Desenvolvimento antigo, mantendo o mesmo estilo das demais linhas.

Nenhum preço de pedido é alterado — os totais salvos continuam exatamente os mesmos. A mudança é só de exibição: a composição passa a mostrar tudo que já está sendo cobrado.

## Verificação

Abrir o pedido 8-375 e conferir que a composição agora mostra "Desenvolvimento Bordado: Igual foto — R$ 50,00" e que a soma da composição fecha com o valor do pedido.

## Detalhes técnicos

- Arquivo: `src/pages/OrderDetailPage.tsx`, bloco `priceItems` (logo após a linha do `desenvP`, ~linha 411).
- Fonte dos dados: `order.extraDetalhes.desenvBordado / desenvLaser / desenvEstampa` e as respectivas `*Desc`, mesmos valores usados em `recomputeOrderPrice.ts` (50/100/150) e no espelho de `OrderPage.tsx`.
