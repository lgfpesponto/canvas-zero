# Etiquetas: corrigir foto e adicionar grade divisória

## O que está errado hoje
No PDF gerado saiu apenas o texto (nome + tamanho). As fotos foram inseridas, mas com dados inválidos ("Bad image parameters" na leitura do arquivo) — as imagens do estoque são WEBP/formatos que o jsPDF não decodifica. Também não há linhas separando as etiquetas.

## O que será feito

1. **Foto sempre visível**
   - Converter cada foto para JPEG/PNG real antes de inserir: carregar a imagem em um `Image`, desenhar em `canvas` e exportar como `image/jpeg` com fundo branco. Isso resolve WEBP, PNG transparente e imagens com perfil estranho.
   - Manter proporção da foto (sem esticar) e centralizar na célula.
   - Manter o cache por URL (mesma grade = mesma foto baixada uma vez).
   - Se mesmo assim a foto falhar, deixar a célula em branco (sem quebrar o PDF).

2. **Grades divisórias (igual ao PDF de referência)**
   - Desenhar retângulos de contorno em todas as 10 células da página (4 colunas: foto | texto | foto | texto, x 5 linhas), inclusive nas células vazias da última página, para que a folha saia com a grade completa recortável.
   - Linha fina cinza/preta, bordas coladas entre células (sem espaço entre elas).

## Detalhes técnicos
- Arquivo: `src/lib/etiquetasPdf.ts`.
- Nova função `imageUrlToJpegDataUrl(url)` usando `fetch` + `createImageBitmap`/`Image` + `canvas.toDataURL('image/jpeg', 0.85)`.
- Layout: 4 colunas iguais de largura `(210 - 2*margem)/4` e 5 linhas de `(297 - 2*margem)/5`; `doc.rect(...)` de contorno em cada coluna/linha.
