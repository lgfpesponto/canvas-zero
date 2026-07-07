## Objetivo
Corrigir o corte das últimas informações do canhoto da ficha impressa (A5 paisagem) e reposicionar o número do pedido para ficar **em cima** do código de barras nos dois canhotos de barcode, sem aumentar o espaço total do canhoto.

## Mudanças em `src/lib/pdfGenerators.ts` (função da ficha A5, bloco "STUB ÚNICO em 3 partes")

1. **Subir a linha dos canhotos**
   - `stubTop = ph - 34` → `stubTop = ph - 40` (6 mm mais alto).
   - A linha tracejada superior e as divisórias verticais acompanham automaticamente.

2. **Diminuir espaçamento entre linhas do 3º canhoto (infos da bota)**
   - Passo entre linhas de `cy += 7` → `cy += 5.5`.
   - `cy` inicial permanece `stubTop + 6`.
   - Como a região vertical agora é maior (canhoto subiu) e o passo menor, as 4 linhas (Nº pedido / tamanho+solado+cor / bico+vira / FORMA) cabem sem encostar na margem inferior.

3. **Nº do pedido acima do código de barras (canhotos 1 e 2)**
   - Em `drawBarcodeBlock`, inverter a ordem sem crescer o bloco:
     - Número (`orderNumClean`, fonte 11 bold, centralizado) desenhado em ~`stubTop + 4`.
     - Barcode desenhado logo abaixo, começando em ~`stubTop + 6` com a mesma altura de 16 mm.
   - Nada é adicionado ao layout; só reordena o que já existe dentro do mesmo espaço vertical.

## Fora do escopo
- Nenhuma alteração no conteúdo das informações, no valor do código de barras, no cabeçalho da ficha, nas outras seções (Couros/Pesponto/Solados/Metais/OBS), nem em outros PDFs (relatórios, cobrança, produção).