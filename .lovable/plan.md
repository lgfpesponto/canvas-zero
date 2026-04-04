

## Ordenar fichas de produção por couro (igual ao relatório de Corte)

### Problema

Atualmente `generateProductionSheetPDF` ordena os pedidos por número (decrescente). O usuário quer que a ordenação siga o mesmo critério do relatório de Corte: agrupar por tipo de couro + cor do couro.

### Alteração: `src/lib/pdfGenerators.ts`

**Substituir a lógica de sort** (linhas 58-63) na função `generateProductionSheetPDF`:

```typescript
const list = ordersToExport.slice().sort((a, b) => {
  const keyA = `${a.couroCano || ''}|${a.corCouroCano || ''}`;
  const keyB = `${b.couroCano || ''}|${b.corCouroCano || ''}`;
  const cmp = keyA.localeCompare(keyB);
  if (cmp !== 0) return cmp;
  const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
  return numA - numB;
});
```

Ordena primeiro por couro do cano + cor (agrupa iguais), depois por número do pedido crescente como desempate.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/pdfGenerators.ts` | Ordenação das fichas de produção por couro+cor em vez de número |

