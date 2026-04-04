

## Ajustes no Painel de Comissão e PDF

### Alterações

#### 1. `src/components/CommissionPanel.tsx`

**Remover mensagem "Meta mínima"** (linhas 108-111): substituir o bloco `else` por `null` — quando não bateu a meta, não mostra nada abaixo do número de vendas.

#### 2. `src/lib/pdfGenerators.ts` — `generateCommissionPDF`

**Adicionar coluna "Código de Barras"** na tabela do relatório:

- Atualizar a assinatura para receber `id` além de `numero` e `dataCriacao`
- Ajustar colunas: Qtd | Nº do Pedido | Código de Barras | Data do Pedido
- Para cada pedido, gerar a imagem do código de barras via `barcodeDataUrl(orderBarcodeValue(o.numero, o.id))` e inserir como imagem na célula correspondente

#### 3. `src/components/CommissionPanel.tsx` — interface Order

Garantir que `id` é passado na interface e no `handleGeneratePDF`.

### Detalhes técnicos

- Colunas do PDF: `seq: 14`, `numero: 30`, `barcode: 75` (imagem ~40x15), `data: 140`
- Usar `barcodeDataUrl` e `orderBarcodeValue` já existentes em `pdfGenerators.ts`
- Altura da linha aumenta para ~18 para acomodar a imagem do código de barras

