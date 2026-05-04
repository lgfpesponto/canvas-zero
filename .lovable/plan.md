## Ajustes no PDF "Resumo Baixa Bordado"

**Arquivo:** `src/lib/pdfGenerators.ts` (função `generateBordadoBaixaResumoPDF`, ~linha 802-818)

### 1. Coluna Qtd → numeração sequencial
Trocar o `'1'` fixo por contador `seq` que incrementa por linha dentro de cada grupo de data (1, 2, 3...).

### 2. Qualidade do código de barras
Aumentar resolução do canvas usado para gerar o CODE128: de `width: 2, height: 40` para `width: 3, height: 80`. O tamanho impresso no PDF (`barcodeW × barcodeH`) continua igual, mas com mais pixels-por-barra a leitura por scanner fica nítida.

Sem outras mudanças.
