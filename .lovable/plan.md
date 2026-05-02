## Ajuste no PDF de Cobrança — Bolinha de status

Arquivo: `src/components/SpecializedReports.tsx` (bloco ~linhas 1447-1457).

### Mudanças
1. **Reposicionar a bolinha** da célula de composição (`cx[2]`) para a célula do número do pedido (`cx[0]`), centralizada horizontalmente abaixo do código de barras.
   - X: centro da coluna 0 → `cx[0] + cols[0] / 2`
   - Y: logo abaixo do código de barras (que está em `y + 6` com altura 7) com folga → `y + 6 + 7 + 4` ≈ `y + 17`
2. **Aumentar o raio** da bolinha de `1.1` para `2.0` para melhor visibilidade.
3. Manter cores: verde (22,163,74) para acréscimo, vermelho (220,38,38) para desconto.
4. Resetar `setFillColor(0,0,0)` após desenhar.

### Snippet proposto
```ts
if (o.desconto && o.desconto !== 0) {
  const isAcrescimo = o.desconto < 0;
  if (isAcrescimo) doc.setFillColor(22, 163, 74); else doc.setFillColor(220, 38, 38);
  const cxBall = cx[0] + cols[0] / 2;
  const cyBall = y + 17; // abaixo do código de barras
  doc.circle(cxBall, cyBall, 2.0, 'F');
  doc.setFillColor(0, 0, 0);
}
```

Nenhuma outra lógica é alterada.
