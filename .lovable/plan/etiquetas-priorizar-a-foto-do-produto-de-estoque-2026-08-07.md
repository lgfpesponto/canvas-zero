# Etiquetas: priorizar a foto do produto de estoque

## Regra nova

Quando o pedido selecionado tiver um produto de estoque encontrado (vínculo direto por `estoque_produto_id` ou casamento por SKU/nome) e esse produto tiver foto cadastrada, a etiqueta usa **a foto do produto de estoque**, mesmo que o pedido tenha outra foto salva.

Ordem de prioridade da foto:

1. Foto do produto de estoque (`estoque_produtos.foto_url`), quando o produto for encontrado e tiver foto.
2. Foto do próprio pedido (`orders.fotos`), como reserva.
3. Sem foto: a etiqueta continua saindo com o tamanho (e nome, se houver).

Isso inverte a prioridade atual, em que a foto do pedido vinha primeiro.

## Restante mantido

- Nome do produto continua opcional.
- Tamanho sempre do pedido.
- Nenhum pedido é descartado por não ter produto de estoque.
- Layout A4 (grade 2x5), grade só nas células ocupadas, aviso final apenas quando nenhuma foto carregar.

## Detalhes técnicos

Arquivo: `src/lib/etiquetasPdf.ts`, função `resolveEtiquetaItems` — trocar a expressão de escolha da foto para `prod?.foto_url || fotoPedido`. O sinalizador `produtoNaoEncontrado` continua avaliando as duas fontes. Sem mudanças de banco.

## Validação

- Gerar etiquetas de pedidos de estoque cuja foto do produto difere da foto do pedido e conferir que sai a foto do produto.
- Gerar etiquetas de pedidos sem produto de estoque (ex.: Erro metais3601) e confirmar que a foto do pedido continua saindo.
