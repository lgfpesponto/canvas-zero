# Etiquetas: fotos que não saem (caso "Erro metais3601")

## Causa confirmada

O pedido `Erro metais3601` não tem produto de estoque vinculado (`estoque_produto_id` vazio). Nesse caso, o gerador tenta achar o produto pelo nome gravado no pedido — `FLORENCIA RUSTICA` — comparando com nome exato no cadastro de estoque. Os produtos reais se chamam `Florência Rústica ...` (com acentos e complemento). Como a comparação é exata, nada é encontrado, o item sai sem foto e sem aviso.

Ou seja: não é problema da imagem nem do Google Drive — é falha de correspondência entre o texto do pedido e o cadastro do produto.

## O que será feito

1. **Busca tolerante de produto**
   - Comparar nomes ignorando acentos, maiúsculas/minúsculas, espaços extras e pontuação.
   - Priorizar: SKU do pedido → nome+tamanho → nome → produto cujo nome comece pelo texto do pedido (ex.: "FLORENCIA RUSTICA" encontra "Florência Rústica com KitCanivete Marrom").
   - Quando o texto casar com mais de um produto, usar o do mesmo tamanho; se ainda houver empate, usar o primeiro em ordem alfabética e sinalizar no aviso final.

2. **Aviso claro em vez de etiqueta muda**
   - Ao terminar a geração, listar os números dos pedidos que saíram sem foto e o motivo (produto não encontrado x foto não carregou), para dar para corrigir o cadastro.

3. **Etiqueta continua saindo**
   - Mesmo sem foto, a etiqueta é impressa com nome e tamanho (comportamento atual mantido).

## Detalhes técnicos

- `src/lib/etiquetasPdf.ts`: em `resolveEtiquetaItems`, substituir o `.in('nome', nomes)` exato por: busca por `sku_base` dos pedidos, mais busca `ilike` por prefixo normalizado, e casamento em memória com normalização (`NFD` + remoção de diacríticos). `gerarEtiquetasPDF` passa a devolver também a lista de itens sem foto com o motivo.
- `src/pages/ReportsPage.tsx`: usar esse retorno no toast final, mostrando os pedidos sem foto.
- Sem alteração no banco de dados.
