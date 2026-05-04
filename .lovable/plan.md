## Remover barra laranja do PDF "Resumo Comissão Bordado"

**Arquivo:** `src/lib/pdfGenerators.ts` — função `drawHeader` (linhas ~726-738)

### Mudança

Trocar o retângulo laranja preenchido por um cabeçalho em texto preto sobre fundo branco, com uma linha cinza fina abaixo como divisor — economiza tinta na impressão.

```ts
const drawHeader = () => {
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(13);
  doc.text('Resumo Comissão Bordado 7Estrivos', margin, 10);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.text(periodoLabel, pageW - margin, 10, { align: 'right' });
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, 14, pageW - margin, 14);
};
```

O `y = 24` inicial logo após permanece igual, mantendo o espaçamento do conteúdo.
