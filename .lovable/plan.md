## Adicionar código de barras na área superior da ficha (boot layout)

Atualmente o código de barras só aparece no canhoto (parte de baixo, abaixo do tracejado). Adicionar uma segunda ocorrência na área vazia que o usuário circulou — canto inferior direito da metade superior da ficha, acima do tracejado.

### Onde alterar
- Arquivo: `src/lib/pdfGenerators.ts`
- Função: gerador de ficha A5 landscape (layout BOOT, a partir da linha ~285). O layout CINTO (linha 156) já tem outra estrutura — fora de escopo, a menos que o usuário peça depois.

### O que adicionar
Logo após desenhar as categorias do corpo (COUROS / PESPONTO / SOLADOS / BORDADOS), antes do bloco do canhoto (`stubTop = ph - 34`), renderizar:

1. Código de barras (mesmo valor de `orderBarcodeValue(order.numero, order.id)` usado no canhoto).
2. Texto do número (`orderNumClean`) centralizado abaixo do código.

Posicionamento aproximado:
- Área-alvo: lado direito, entre o fim da coluna SOLADOS/BORDADOS e a linha tracejada do canhoto.
- `x` ~ `pw - m - 70`, largura ~ 60 mm, altura ~ 14 mm.
- `y` calculado a partir de `descBottom - 18` para encostar logo acima do tracejado sem invadir o canhoto.
- Usar `barcodeDataUrl(bcVal, { width: 2, height: 40 })` (mesma chamada já existente).
- Não desenhar se o conteúdo das categorias chegou a `truncated = true` naquela posição (para evitar sobreposição) — neste caso simplesmente pular.

### Não muda
- Canhoto inferior continua igual (barcode + número).
- Layout do CINTO, demais PDFs (relatórios, listas) e QR code permanecem intactos.

### Validação
- Gerar a ficha de um pedido de bota e conferir visualmente que o barcode aparece nos dois locais e não colide com a seção BORDADOS nem com o tracejado.