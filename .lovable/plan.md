

## Plano: Corrigir listagem de vendedores no filtro

### Problema
A função `fetchVendedores()` em `src/hooks/useOrders.ts` faz `supabase.from('orders').select('vendedor, cliente')` sem paginação. O Supabase limita a 1000 linhas por padrão, e com 1539 pedidos, vendedores que só aparecem nos pedidos mais recentes (ou mais antigos) ficam de fora.

### Solução
Buscar os vendedores em lotes paginados de 1000, acumulando todos os nomes distintos.

### Alteração

#### Arquivo: `src/hooks/useOrders.ts` — função `fetchVendedores`

Substituir a query única por um loop paginado:

```typescript
export async function fetchVendedores(): Promise<string[]> {
  const names = new Set<string>();
  const BATCH = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await supabase
      .from('orders')
      .select('vendedor, cliente')
      .range(offset, offset + BATCH - 1);

    if (!data || data.length === 0) { hasMore = false; break; }

    data.forEach((o: any) => {
      if (o.vendedor) names.add(o.vendedor);
      if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
        names.add(o.cliente.trim());
      }
    });

    if (data.length < BATCH) hasMore = false;
    offset += BATCH;
  }

  return [...names].sort();
}
```

### O que NÃO muda
- Nenhum outro filtro, layout ou lógica é afetado
- A lógica de vendedores virtuais (Juliana) permanece idêntica

