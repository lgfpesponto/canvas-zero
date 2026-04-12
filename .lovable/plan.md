

## Problema

O `AdminSelectField` e `AdminMultiSelect` usam esta logica (linha 366):
```
const options = dbOptions.length > 0 ? dbOptions : fallbackOptions;
```
Se existir **qualquer** registro no banco para uma categoria (ex: "tamanhos" tem apenas "10"), ele ignora completamente o fallback (TAMANHOS = 24-45). Por isso so aparece 1 tamanho em vez de 22.

O mesmo problema afeta "tipos-couro" (1 registro no DB) e qualquer outra categoria parcialmente populada.

## Solucao

Mudar a logica de merge em `AdminSelectField` e `AdminMultiSelect` para **sempre usar o fallback como base** e sobrepor com dados do DB quando existirem. Itens do DB que nao estao no fallback tambem aparecem (foram adicionados pelo admin).

### Alteracao em AdminSelectField (linhas 360-366)

```typescript
// Merge: fallback como base, DB sobrepoe precos/nomes
const fallbackOptions = (Array.isArray(fallback) && typeof fallback[0] === 'string')
  ? (fallback as string[]).map(f => ({ label: f, preco: 0 }))
  : (fallback as { label: string; preco?: number }[]).map(f => ({ label: f.label, preco: f.preco || 0 }));

const dbMap = new Map((variacoes || []).map(v => [v.nome.toLowerCase(), v]));

// Start with fallback, enrich with DB data
const merged = fallbackOptions.map(f => {
  const dbItem = dbMap.get(f.label.toLowerCase());
  return dbItem ? { label: dbItem.nome, preco: dbItem.preco_adicional } : f;
});
// Add DB-only items (admin added, not in fallback)
(variacoes || []).forEach(v => {
  if (!fallbackOptions.some(f => f.label.toLowerCase() === v.nome.toLowerCase())) {
    merged.push({ label: v.nome, preco: v.preco_adicional });
  }
});
// Sort alphabetically
merged.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const options = merged.map(m => m.preco > 0 ? `${m.label} (R$${m.preco})` : m.label);
```

### Alteracao em AdminMultiSelect (linhas 390-392)

Mesma logica de merge: fallback como base, DB sobrepoe, itens extras do DB sao adicionados.

### Arquivos alterados
- `src/pages/AdminConfigFichaPage.tsx` -- apenas as funcoes `AdminSelectField` e `AdminMultiSelect`, sem mexer no layout/estrutura

