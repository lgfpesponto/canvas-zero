# Etiquetas: incluir todos os selecionados + grade só onde tem produto

## O que está acontecendo

O botão monta a lista a partir de `serverOrders` (apenas os pedidos já carregados na tela) e ainda filtra por `vendedor = 'Estoque'` e `status = 'Baixa Estoque'`. Um pedido selecionado que não passa por esse filtro — ou que não está na página carregada — simplesmente some do PDF, sem aviso. É por isso que o terceiro pedido não apareceu (o PDF enviado tem só as 2 etiquetas da grade).

Diagnóstico do motivo exato (fora da página carregada vs. filtro de vendedor/status) fica confirmado no primeiro passo da implementação, buscando os IDs selecionados direto no banco.

## O que muda

1. **Todos os selecionados entram no PDF.** A lista passa a ser montada a partir de todos os `selectedIds`, buscando no banco os pedidos que não estão em memória. Sem filtro silencioso de vendedor/status na hora de gerar.
2. **Nada é descartado por falta de dados.** Se um pedido não tem produto de estoque vinculado, a etiqueta ainda é emitida com o nome/tamanho que existir no pedido, e o aviso final informa quantas saíram sem foto.
3. **Grade só onde tem produto.** Os retângulos passam a ser desenhados apenas nas células ocupadas (par foto + texto de cada etiqueta). Células vazias no fim da folha ficam em branco, sem moldura.

## Detalhes técnicos

- `src/pages/ReportsPage.tsx`: em `handleGerarEtiquetas`, resolver o alvo a partir de `selectedIds` — usar os pedidos já em memória (`serverOrders`/`scannedOrdersMap`) e completar os faltantes com um `select` em `orders` por `in('id', faltantes)`. Manter o filtro vendedor/status apenas para decidir se o botão aparece, não para montar a lista.
- `src/lib/etiquetasPdf.ts`: em `gerarEtiquetasPDF`, mover o desenho da grade para dentro do loop de itens (dois `doc.rect` por etiqueta: coluna da foto e coluna do texto), removendo `drawGrid()`; relaxar o erro de "nenhuma foto carregada" para apenas contabilizar falhas quando houver pelo menos texto para imprimir.
