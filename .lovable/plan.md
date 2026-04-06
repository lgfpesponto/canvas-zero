

## Corrigir seção de Cintos no relatório Forro

### Problema

A seção de cintos no relatório Forro usa um formato de texto simples (`tamanho → quantidade`), diferente do formato de blocos visuais usado para os modelos de botas (com título escuro, linha de tamanhos e linha de quantidades via `drawBlockLayout`).

### Solução

Substituir o bloco de renderização manual dos cintos (linhas 452-470) por um `BlockData` renderizado com `drawBlockLayout`, igual aos blocos de botas.

Em vez do código atual que desenha texto simples, criar um bloco:

```typescript
const cintoBlock: BlockData = {
  badgeLabel: 'CINTOS',
  description: 'Cintos',
  sizes: Object.entries(cintoSizes)
    .map(([t, q]) => ({ tamanho: t, quantidade: q }))
    .sort((a, b) => Number(a.tamanho) - Number(b.tamanho)),
};
```

E renderizar com `drawBlockLayout(doc, y, mx, cintoBlock)` — exatamente como os blocos de modelos de botas. Também incluir a quantidade de cintos no total de pares exibido no cabeçalho.

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Substituir renderização manual dos cintos por `BlockData` + `drawBlockLayout` (linhas 451-470) |

