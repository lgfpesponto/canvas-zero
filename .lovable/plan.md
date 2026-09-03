# Pedido 4-299EST com total zerado — causa e correção

## O que aconteceu

O pedido nasceu zerado porque o **produto do estoque estava cadastrado com preço R$ 0,00**.

Produto: "Texana Florência Radiante Bico Fino Perfilado Ponta Quadrada" (tam 38)
- `preco = 0` no cadastro (registro criado em 14/08, ainda hoje com preço 0)
- Compra feita por Maria Gabriela em 27/08 → o pedido copiou o preço do produto (0)
- Em 01/09 a Juliana corrigiu manualmente: "Alterado Valor total de 0 para 415,60 — ela estava sem valor cobrando"

Ou seja: não é bug de cálculo nem tem relação com a mudança da Bola Grande. A tela de compra usa o preço do tamanho/produto direto, e como esse valor era 0, o total ficou 0 e ninguém foi avisado.

## Correção proposta

1. **Bloquear compra de produto sem preço**
   Na tela de compra do estoque, se o preço do tamanho for 0 ou vazio, o item aparece marcado em vermelho ("Produto sem preço cadastrado") e o botão de confirmar fica desabilitado, com aviso para procurar o admin.

2. **Impedir cadastro/edição de produto com preço 0**
   No formulário de produto do estoque, exigir preço maior que zero para salvar (mesma validação na edição de preço por tamanho).

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
