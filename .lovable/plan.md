# Pedido 4-299EST com total zerado — causa e correção

## O que aconteceu

Achei o bug de verdade: **o pré-cadastro de tamanhos com quantidade zero grava o preço fixo em 0**.

Produto: "Texana Florência Radiante Bico Fino Perfilado Ponta Quadrada" (tam 38)
- Criado em 14/08 19:46 com **quantidade 0 e preço 0**, pelo fluxo "Estoque já criado" da ficha de produção — nesse fluxo, os tamanhos que ficam com quantidade 0 são inseridos direto na tabela de estoque com `preco: 0` fixo no código, ignorando o valor calculado da ficha
- Um minuto depois (19:47) a Stefany ajustou a quantidade de 0 para 1 — o ajuste de quantidade não mexe no preço, então continuou 0
- 27/08: compra da Maria Gabriela copiou o preço do produto (0) → pedido 4-299EST zerado
- 01/09: Juliana corrigiu manualmente para R$ 415,60

Respondendo à dúvida: a ficha realmente calcula o valor, mas ele só é aproveitado quando o produto nasce de um pedido com quantidade (aí o preço do pedido é copiado). No caminho de tamanho zerado o código nunca usa esse valor — insere 0 direto. Por isso a ficha/composição mostra tudo certo e só o total fica zerado:
- **Composição exibida**: calculada na hora pelo snapshot da ficha, linha a linha → correta.
- **Total do pedido**: cópia de `estoque_produtos.preco` = 0 → é o que fica gravado e cobrado.

Nada a ver com a mudança da Bola Grande.

## Correção proposta

1. **Corrigir o pré-cadastro de tamanho zerado (causa raiz)**
   No fluxo "Estoque já criado", em vez de gravar preço 0, usar o valor calculado da ficha (o mesmo preço unitário que o pedido teria), para que o produto já nasça com preço correto.

2. **Bloquear compra de produto sem preço**
   Na tela de compra do estoque, item com preço 0 aparece destacado ("Produto sem preço cadastrado") e o botão de confirmar fica desabilitado.

3. **Salvaguarda no salvamento do pedido**
   Se o total de um pedido de estoque ficar 0, recusar o salvamento com mensagem clara em vez de gravar pedido zerado.

4. **Lista de produtos com preço zerado (admin)**
   Aviso na página de Estoque listando os produtos ativos com preço 0, para corrigir antes de virar outro pedido zerado.

## Observações

- Nenhum valor de pedido existente é alterado. O 4-299EST já está correto (R$ 415,60).
- O produto "Texana Florência Radiante..." segue com preço 0 no cadastro e precisa ser corrigido.

## Detalhes técnicos

- `OrderPage.tsx` (~linha 1652): `rowsToInsert` usa `preco: 0` fixo — trocar pelo preço unitário calculado da ficha.
- `EstoqueBuyDialog.tsx`: `preco_unit` vem de `t.preco`; desabilitar quando `<= 0` (considerando desconto promocional).
- Criação de pedido a partir do estoque: erro se `total <= 0`.
- Query auxiliar: `estoque_produtos` com `preco = 0 and ativo = true`.
