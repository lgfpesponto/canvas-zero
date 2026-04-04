

## Quebrar número do pedido em múltiplas linhas nos PDFs

### Problema

Em todos os relatórios PDF que têm coluna "Nº do Pedido", números longos (ex: `TROCA00123`) ultrapassam a borda da célula. O texto precisa quebrar para a linha de baixo quando excede a largura da coluna.

### Alterações

#### 1. `src/components/SpecializedReports.tsx`

Substituir todos os `doc.text(o.numero, cx[0] + N, y + N)` por lógica com `splitTextToSize`:

**Locais afetados (6 geradores de relatório):**
- Pesponto (~linha 581)
- Metais (~linha 663)
- Bordados (~linha 793)
- Corte (~linha 887)
- Expedição (~linha 955)
- Cobrança (~linha 1165)

Para cada local:
1. Usar `doc.splitTextToSize(o.numero, cols[0] - 4)` para quebrar o texto na largura da coluna
2. Renderizar cada linha com offset vertical (ex: `y + 5 + i * 3`)
3. Ajustar o cálculo de `rowH` para considerar o número de linhas do número (usar `Math.max` com o rowH atual)

Exemplo de padrão:
```typescript
const numLines = doc.splitTextToSize(o.numero, cols[0] - 4);
const numH = numLines.length * 3;
const rowH = Math.max(existingRowH, numH + 6);
// ...
doc.setFontSize(8);
numLines.forEach((line: string, i: number) => {
  doc.text(line, cx[0] + 2, y + 5 + i * 3);
});
```

#### 2. `src/lib/pdfGenerators.ts`

**Relatório de Comissão (~linha 520):** Mesmo ajuste — usar `splitTextToSize` para `o.numero` na coluna do número do pedido, respeitando a largura `colX.numero` até `colX.barcode`.

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Quebra de linha do número do pedido em 6 relatórios |
| `src/lib/pdfGenerators.ts` | Quebra de linha do número do pedido no relatório de comissão |

