# Pedido 4-299EST com total zerado — causa e correção

## O que aconteceu

O pedido nasceu zerado porque o **produto do estoque estava cadastrado com preço R$ 0,00**.

Produto: "Texana Florência Radiante Bico Fino Perfilado Ponta Quadrada" (tam 38)
- Criado avulso (manualmente) por Stefany em 14/08 19:46, com quantidade 1 e **preço 0** — não veio de nenhum pedido de produção (não existe pedido com esse SKU)
- Compra feita por Maria Gabriela em 27/08 → o pedido copiou o preço do produto (0)
- Em 01/09 a Juliana corrigiu manualmente: "Alterado Valor total de 0 para 415,60 — ela estava sem valor cobrando"

Respondendo à dúvida: o preço do produto de estoque **não é somado da ficha**. A ficha é guardada só como snapshot descritivo. O campo `preco` do produto é preenchido de duas formas: copiado do `preco` do pedido que originou o estoque, ou digitado à mão quando o produto é criado avulso. Nesse caso foi criação avulsa e o campo ficou vazio (0).

Por isso a composição aparece certa e só o total ficou zerado:
- **Composição exibida**: calculada na hora a partir do snapshot da ficha, cada linha com seu próprio preço → itens corretos.
- **Total do pedido**: valor copiado de `estoque_produtos.preco`, que era 0 → é esse que fica gravado e cobrado.

Não é bug de cálculo nem tem relação com a mudança da Bola Grande: o produto foi cadastrado sem preço e a compra foi aceita assim mesmo, sem nenhum aviso.

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
