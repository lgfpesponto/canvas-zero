# Corrigir fotos ausentes nas etiquetas

## Diagnóstico confirmado

Os pedidos **Erro metais3601** e **ERRO METAIS3601** não possuem vínculo em `estoque_produto_id`. A geração tenta localizar o produto pelos campos de nome/SKU, mas os textos dos pedidos não correspondem ao cadastro atual:

- `FLORENCIA RUSTICA` é genérico e não identifica com segurança qual variação “Florência Rústica” usar.
- `LARA METAIS LATEGO PRETO` não corresponde ao SKU/nome atual encontrado no estoque.

Mesmo assim, os dois pedidos já possuem uma foto válida em `orders.fotos`. O gerador atual não consulta nem utiliza esse campo, por isso as células saem em branco no PDF enviado.

## Correção

- Incluir a primeira foto de `orders.fotos` nos dados enviados ao gerador, tanto para pedidos já carregados na tela quanto para os buscados por ID.
- Usar a foto do produto vinculado quando houver; se o vínculo ou a correspondência por nome/SKU falhar, usar automaticamente a foto salva no próprio pedido.
- Manter nome e tamanho atuais da etiqueta, sem alterar pedidos nem cadastros de estoque.
- Preservar o aviso de falha apenas quando nenhuma das fontes de foto puder ser carregada.

## Validação

- Gerar novamente as etiquetas dos dois pedidos e confirmar que ambas as fotos aparecem na grade do PDF.
- Confirmar que etiquetas com vínculo direto ao estoque continuam usando normalmente a foto do produto.
- Confirmar que a grade permanece somente nas células preenchidas.

## Detalhes técnicos

Arquivos envolvidos: `src/pages/ReportsPage.tsx` e `src/lib/etiquetasPdf.ts`. Não haverá mudança de banco nem armazenamento adicional de PDFs ou imagens.