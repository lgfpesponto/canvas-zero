

## Edição do relatório "Cobrança" — PDF

### Alterações

**Arquivo**: `src/components/SpecializedReports.tsx` — função `generateCobrancaPDF` (linhas 848-1031)

#### 1. Remover coluna "PAGO" e redistribuir larguras (linha 848)
- De: `cols = [25, 22, 68, 15, 28, cw - 25 - 22 - 68 - 15 - 28]` (6 colunas)
- Para: `cols = [45, 22, 68, 15, 28]` (5 colunas — coluna Nº Pedido ampliada de 25 para ~45mm)
- Atualizar `cx` para 5 posições

#### 2. Remover "PAGO" do cabeçalho (linhas 857-862)
- Remover `doc.text('PAGO', cx[5]...)` 
- Manter apenas: Nº PEDIDO, DATA, COMPOSIÇÃO, QTD, PREÇO

#### 3. Adicionar código de barras na coluna Nº Pedido (linhas 1002-1003)
- Linha 1: número do pedido (como hoje)
- Linha 2: código de barras usando `barcodeDataUrl(orderBarcodeValue(o.numero, o.id))` e `doc.addImage`
- Barcode centralizado na largura da coluna, abaixo do número
- Ajustar `rowH` mínimo para acomodar barcode (~14mm no mínimo)

#### 4. Remover checkbox "PAGO" (linhas 1014-1015)
- Remover o `doc.rect` que desenhava o quadrado de checkbox na coluna PAGO

#### 5. Linha de total (linhas 1027-1029)
- Ajustar índices de `cx[3]`/`cx[4]` para os novos 5 cols (índices 3 e 4 permanecem os mesmos)

