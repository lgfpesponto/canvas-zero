

## Incluir filtro de Produto na persistência via URL

### Alterações no `src/pages/ReportsPage.tsx`

**1. Inicialização do `filterProduto` a partir da URL (linha 47)**

Atualmente inicializa sempre com `defaultProduto`. Mudar para ler o param `produtos` da URL:

```typescript
const [filterProduto, setFilterProduto] = useState<Set<string>>(() => {
  const v = searchParams.get('produtos');
  return v ? new Set(v.split(',')) : new Set(defaultProduto);
});
```

**2. Inicialização do `appliedFilters.filterProduto` (linha 99)**

Usar a mesma lógica: se houver param `produtos` na URL, usar esse valor em vez do default:

```typescript
filterProduto: new Set(searchParams.get('produtos')?.split(',') ?? [...defaultProduto]),
```

**3. `syncSearchParams` — adicionar `filterProduto` (linhas 102-110)**

Atualizar a assinatura e o corpo para incluir o produto:

```typescript
const syncSearchParams = useCallback((filters: {
  searchQuery: string; filterDate: string; filterDateEnd: string;
  filterStatus: Set<string>; filterVendedor: Set<string>; filterProduto: Set<string>;
}) => {
  const params = new URLSearchParams();
  // ... existing params ...
  // Só persiste se não for o default completo
  const isDefault = filters.filterProduto.size === defaultProduto.size &&
    [...defaultProduto].every(v => filters.filterProduto.has(v));
  if (!isDefault && filters.filterProduto.size > 0) {
    params.set('produtos', [...filters.filterProduto].join(','));
  }
  setSearchParams(params, { replace: true });
}, [setSearchParams]);
```

**4. Nenhuma alteração no `applyFilters`** — já passa `filterProduto` no objeto `newFilters` (linha 115) e chama `syncSearchParams`.

**5. Nenhuma alteração no "Limpar"** — já reseta `filterProduto` para o default e chama `setSearchParams({}, ...)` que limpa todos os params.

### Resumo

| Local | Mudança |
|-------|---------|
| Inicialização `filterProduto` (L47) | Ler `produtos` da URL |
| Inicialização `appliedFilters` (L99) | Ler `produtos` da URL |
| `syncSearchParams` (L102-110) | Adicionar `filterProduto` ao tipo e serializar como CSV |

