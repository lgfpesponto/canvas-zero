## Ajuste de larguras de coluna no PDF Baixa Montagem

Em `src/lib/pdfGenerators.ts`, dentro de `generateBaixaMontagemPDF`, ajustar o objeto `col` para dar mais respiro ao número do pedido e reduzir um pouco o espaço do modelo.

**Antes:**
```ts
const col = { num: margin, pedido: margin + 8, data: margin + 42, modelo: margin + 75, valor: pageW - margin };
```

**Depois:**
```ts
const col = { num: margin, pedido: margin + 8, data: margin + 55, modelo: margin + 88, valor: pageW - margin };
```

- `pedido → data`: 34mm (era 34 com data em +42... ajustando: pedido fica de margin+8 até data em margin+55 → ~47mm de largura para o número, bem mais folga).
- `data → modelo`: 33mm (mantém data legível).
- `modelo → valor`: ~92mm (era ~105mm; ainda largo o suficiente para o nome do modelo, que é truncado em uma linha).

Nada mais muda.
