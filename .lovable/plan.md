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

1. **Bloquear compra de produto sem preço**
   Na tela de compra do estoque, se o preço do tamanho for 0 ou vazio, o item aparece marcado em vermelho ("Produto sem preço cadastrado") e o botão de confirmar fica desabilitado, com aviso para procurar o admin.

2. **Impedir cadastro/edição de produto com preço 0**
   No formulário de produto do estoque, exigir preço maior que zero para salvar (inclusive na criação avulsa e na edição de preço por tamanho), sugerindo automaticamente o preço somado da ficha como valor inicial.

3. **Salvaguarda no salvamento do pedido**
   Se, mesmo assim, o total calculado ficar 0 em um pedido de estoque, o salvamento é recusado com mensagem clara em vez de gravar um pedido zerado.

4. **Lista de produtos com preço zerado (só admin)**
   Aviso na página de Estoque mostrando quantos produtos estão com preço 0, para corrigir antes que gere outro pedido zerado.

## Observações

- Nada de valor de pedidos existentes é alterado. O 4-299EST já está correto (R$ 415,60).
- Ainda vale corrigir o cadastro do produto "Texana Florência Radiante..." que segue com preço 0.

## Detalhes técnicos

- `EstoqueBuyDialog.tsx`: `preco_unit` vem de `t.preco` dos tamanhos; adicionar validação/disable quando `preco_unit <= 0` (considerando desconto promocional).
- Formulário de criação/edição de produto (`estoque_produtos` / tamanhos): validação `preco > 0` antes do submit.
- Handler de criação de pedido a partir do estoque: retornar erro se `total <= 0`.
