# Ficha Adesiva — Espaço após o cabeçalho e divisórias entre categorias

## Problema
Na ficha adesiva (10 × 15 cm, `src/lib/fichaAdesivaPdf.ts`), a primeira categoria (ex.: OBSERVAÇÃO) nasce muito rente à linha divisória do cabeçalho. E as categorias empilhadas não têm separação visual entre si.

## Mudanças (somente `src/lib/fichaAdesivaPdf.ts`)

1. **Descer a primeira categoria**: o início do corpo (`bodyTop`) passa a ter um respiro de ~2,5 mm abaixo da linha do cabeçalho (`y = bodyTop + 2.5` no posicionamento das seções, para as duas colunas).

2. **Divisórias entre categorias**: após posicionar as seções, desenhar uma linha horizontal fina separando cada categoria da seguinte — dentro da mesma coluna, na metade do espaço entre o fim de uma seção e o título da próxima. Regras:
   - Não desenhar entre o cabeçalho e a primeira categoria (a linha do cabeçalho já existe).
   - A divisória ocupa apenas a largura da coluna onde a categoria está (não atravessa o QR code nem a outra coluna).
   - A última categoria de cada coluna não recebe divisória depois dela (nada abaixo para separar).

3. **Nada mais muda**: fontes, negrito, QR, canhoto, código de barras, solas, rodapé e a lógica de encolher fonte quando não couber permanecem iguais. As divisórias não alteram as alturas, então o encolhimento automático continua funcionando.

## Validação
- Typecheck (`bunx tsgo`) e build.
- QA visual via Playwright: gerar amostras de bota e cinto (com múltiplas categorias, ex. OBSERVAÇÃO + PESPONTO + METAIS + EXTRAS), converter com `pdftoppm` e conferir: primeira categoria com respiro abaixo da linha, divisórias presentes entre categorias, sem sobreposição com QR/canhoto.
