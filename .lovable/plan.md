# Etiquetas: fotos sem fundo

Objetivo: nas etiquetas A4, a foto do produto sai recortada (só a bota), sem o fundo da imagem original.

## Abordagem

Remoção de fundo no navegador, na hora de gerar o PDF, em duas camadas:

1. **IA (@imgly/background-removal)** — recorte de qualidade em qualquer foto. O modelo é baixado uma vez e fica em cache do navegador.
2. **Fallback automático** — se a IA falhar (offline, erro de modelo, foto problemática), aplica recorte simples por cor de fundo: amostra as bordas da imagem, remove pixels dentro de uma tolerância dessa cor e faz um leve suavizado nas bordas.

O resultado é desenhado sobre fundo branco (a etiqueta é impressa em papel branco), mantendo proporção e centralizado na célula da grade. Grade divisória e layout 4 colunas x 5 linhas permanecem como estão.

## Feedback ao usuário

- O botão "Gerar etiquetas" mostra progresso ("Processando fotos X/Y") já que o recorte leva alguns segundos por foto.
- Se alguma foto não puder ser recortada, ela entra com a foto original e o aviso final informa quantas ficaram sem recorte.

## Detalhes técnicos

- `bun add @imgly/background-removal`.
- `src/lib/etiquetasPdf.ts`: em `urlToDataUrl`, após obter o `ImageBitmap`/blob, passar pelo novo helper `removeBackground` em `src/lib/removeImageBackground.ts`, que exporta `cutoutToDataUrl(blob)` com a lógica IA + fallback por cor de borda.
- Cache por URL já existente é mantido, então a mesma foto só é processada uma vez por geração.
- Import dinâmico do pacote de IA para não pesar no bundle inicial.
