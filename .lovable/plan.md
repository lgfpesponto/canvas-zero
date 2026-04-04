

## Incluir pedidos de Cinto no Relatório de Corte

### Problema

O relatório de Corte filtra apenas botas (`!o.tipoExtra`). Pedidos de cinto (`tipoExtra === 'cinto'`) também precisam aparecer, agrupados juntos e ordenados.

### Alteração: `src/components/SpecializedReports.tsx` — `generateCortePDF`

**1. Filtro (linha 756-758):** Mudar de `!o.tipoExtra` para `!o.tipoExtra || o.tipoExtra === 'cinto'`

**2. Ordenação (linhas 762-766):** Ajustar para agrupar cintos juntos. Cintos não têm `couroCano`, então usar uma chave que os agrupe:

```typescript
filtered.sort((a, b) => {
  const isBeltA = a.tipoExtra === 'cinto' ? 1 : 0;
  const isBeltB = b.tipoExtra === 'cinto' ? 1 : 0;
  if (isBeltA !== isBeltB) return isBeltA - isBeltB; // botas primeiro, cintos depois
  if (!isBeltA) {
    // ambos botas: ordenar por couro+cor
    const keyA = `${a.couroCano || ''}|${a.corCouroCano || ''}`;
    const keyB = `${b.couroCano || ''}|${b.corCouroCano || ''}`;
    const cmp = keyA.localeCompare(keyB);
    if (cmp !== 0) return cmp;
  }
  // desempate por número
  const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
  return numA - numB;
});
```

**3. Descrição do corte para cintos (linhas 796-806):** Adicionar lógica condicional — quando `o.tipoExtra === 'cinto'`, montar descrição com dados do `extraDetalhes` (tamanho, bordado, fivela, carimbo, etc.) em vez dos campos de couro de bota.

```typescript
if (o.tipoExtra === 'cinto') {
  const det = o.extraDetalhes as any || {};
  parts.push('CINTO');
  if (det.tamanhoCinto) parts.push(`Tamanho: ${det.tamanhoCinto}`);
  if (det.fivela) parts.push(`Fivela: ${det.fivela}${det.fivelaOutroDesc ? ' - ' + det.fivelaOutroDesc : ''}`);
  if (det.bordadoP === 'Sim') parts.push(`Bordado P: ${det.bordadoPDesc || ''} ${det.bordadoPCor || ''}`);
  if (det.nomeBordado === 'Sim') parts.push(`Nome: ${det.nomeBordadoDesc || ''}`);
  if (det.carimbo) parts.push(`Carimbo: ${det.carimbo} - ${det.carimboDesc || ''}`);
} else {
  // lógica atual de bota (cano, gáspea, taloneira, modelo, etc.)
}
```

### Arquivo alterado

| Arquivo | O que muda |
|---------|-----------|
| `src/components/SpecializedReports.tsx` | Filtro inclui cintos, ordenação agrupa cintos juntos, descrição adaptada para cintos |

