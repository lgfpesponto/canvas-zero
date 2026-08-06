# Etiquetas: usar sempre a foto do pedido

## Diagnóstico confirmado

Os pedidos **Erro metais3601** e **ERRO METAIS3601** não têm vínculo com produto de estoque (`estoque_produto_id` vazio) e os nomes gravados não batem com o cadastro atual, então a busca por nome/SKU falha e a célula sai em branco.

Porém os dois pedidos já têm uma foto válida salva em `orders.fotos` — o gerador simplesmente não usa esse campo hoje.

## Nova regra

A etiqueta deixa de depender do estoque. Ela precisa apenas de **foto + tamanho**; o nome do produto entra quando existir, mas é opcional.

- Fonte principal da foto: a primeira imagem de `orders.fotos` do próprio pedido.
- Se o pedido não tiver foto e houver produto de estoque vinculado, usa a foto do produto como reserva.
- Tamanho: sempre o tamanho do pedido.
- Nome: usa o nome do produto/modelo quando houver; se não houver, a etiqueta sai só com a foto e o tamanho, sem texto vazio ocupando espaço.
- Nenhum pedido é descartado por não ser de estoque.

## Validação

- Gerar etiquetas dos dois pedidos citados e confirmar que as fotos aparecem.
- Gerar etiquetas de pedidos comuns (não estoque) e confirmar foto + tamanho corretos.
- Confirmar que a grade continua desenhada apenas nas células preenchidas.
- Aviso final de falha somente quando nenhuma fonte de foto carregar.

## Detalhes técnicos

Arquivos: `src/pages/ReportsPage.tsx` (passar `fotos` do pedido, inclusive nos pedidos buscados por ID) e `src/lib/etiquetasPdf.ts` (prioridade de foto, nome opcional, layout ajustado quando não há nome). Sem mudanças de banco e sem armazenar imagens ou PDFs no servidor.
