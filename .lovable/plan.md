## Objetivo

No PDF de cobrança, dentro da coluna "COMPOSIÇÃO" de cada pedido, colorir:
- A palavra **Desconto** em **vermelho**
- A palavra **Acréscimo** em **verde**

## Mudança

### `src/components/SpecializedReports.tsx` (função `generateCobrancaPDF`)

O texto da composição é renderizado por `doc.text(lines, cx[2] + 1, y + 4)` em preto. Como `Desconto`/`Acréscimo` sempre começa numa linha própria (formato `"Desconto R$ 50,00"`), basta:

1. Localizar o índice da linha após o `splitTextToSize`.
2. Sobrepor apenas a palavra com a cor correta na mesma posição.

```ts
doc.setFontSize(6);
doc.text(lines, cx[2] + 1, y + 4);
// Sobrepõe a palavra "Desconto" (vermelho) ou "Acréscimo" (verde) com cor
if (o.desconto && o.desconto !== 0) {
  const isAcr = o.desconto < 0;
  const word = isAcr ? 'Acréscimo' : 'Desconto';
  const lineIdx = (lines as string[]).findIndex(l => l.startsWith(word));
  if (lineIdx >= 0) {
    if (isAcr) doc.setTextColor(22, 163, 74);   // emerald-600
    else doc.setTextColor(220, 38, 38);         // red-600
    doc.text(word, cx[2] + 1, y + 4 + lineIdx * 3);
    doc.setTextColor(0, 0, 0);                  // restaura preto
  }
}
```

Sem mudanças em outros arquivos. Sem mudanças no banco.

Posso aplicar?