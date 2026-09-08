# Gravata Pronta Entrega: quantidade limitada ao estoque e resumo do pedido

## O que muda na tela de compra

1. **Sem caixinha de seleção**
   - Sai o quadradinho de marcar. Cada variação passa a ter só o nome, a disponibilidade e o campo de quantidade.
   - Preencher qualquer quantidade acima de zero já conta como escolhida; apagar o campo (ou deixar zero) desfaz a escolha.
   - O visual fica parecido com a compra de estoque: campo vazio por padrão, com botões de mais/menos.

2. **Não deixa passar do disponível**
   - Digitar um número maior que o disponível é automaticamente reduzido para o máximo daquela variação.
   - Se a variação tem 1 disponível, o campo não aceita 2.
   - A validação no momento de finalizar continua existindo como segurança (inclusive se o estoque mudar enquanto a tela está aberta).

3. **Resumo do pedido montado embaixo**
   - Abaixo da lista aparece um bloco com o que já foi escolhido, em ordem:
     - `Gravata 1 — Off White + Bridão Flor + Azul — quantidade 2`
     - `Gravata 2 — Preta + Metal Dourado — quantidade 1`
   - Cada linha tem um botão para remover aquela gravata do pedido.
   - No fim do bloco: total de gravatas e o valor total (já multiplicado pela quantidade, como hoje).
   - O bloco só aparece quando há pelo menos uma gravata escolhida.

## O que não muda

- Preço por gravata, baixa de estoque por variação e o que é gravado no pedido continuam iguais.
- A composição do pedido no detalhe segue mostrando cada gravata com sua quantidade.
- Nenhum pedido já existente é alterado.

## Detalhes técnicos

- Arquivo: `src/pages/ExtrasPage.tsx`, bloco `productId === 'gravata_pronta_entrega'` (linhas ~721-781).
- `setGravataQtd` passa a receber o limite da variação e aplicar `Math.min(valor, item.quantidade)`, além de aceitar string vazia.
- Remoção do `Checkbox`; o rótulo deixa de ser clicável para marcar e o `Input` numérico (com `min=0`, `max=item.quantidade`) passa a ser o único controle.
- Novo bloco de resumo renderizado a partir de `gravataSelecionadas()`, com índice sequencial, rótulo `cor_tira + tipo_metal (+ cor_brilho)`, quantidade e botão de remover (`setGravataQtd(id, '')`).
- Validações em `handleSubmit` (linhas ~248-262) e o cálculo de preço/baixa por variação permanecem intactos.
