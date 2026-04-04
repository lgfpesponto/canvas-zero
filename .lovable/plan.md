

## Adicionar clientes da Juliana como "vendedores" nos filtros de relatórios e gráficos

### Problema

Pedidos da vendedora "Juliana Cristina Ribeiro" têm o campo `cliente` preenchido obrigatoriamente. Esses clientes devem aparecer como opções individuais nos filtros de vendedor dos gráficos e relatórios, permitindo filtrar por cliente específico da Juliana.

### Lógica

Para cada pedido onde `vendedor === 'Juliana Cristina Ribeiro'` e `cliente` não é vazio, o nome do cliente será adicionado à lista de vendedores. Ao filtrar por esse "cliente-vendedor", o sistema mostrará os pedidos da Juliana que têm aquele cliente específico.

### Alterações

#### 1. `src/pages/Index.tsx` — Lista de vendedores e filtros

**Expandir `vendedores` (linha 46-49):** Além dos vendedores normais, extrair clientes únicos dos pedidos da Juliana e adicioná-los à lista:

```typescript
const vendedores = useMemo(() => {
  const names = new Set(sourceOrders.map(o => o.vendedor));
  // Adicionar clientes da Juliana como vendedores virtuais
  sourceOrders.forEach(o => {
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
      names.add(o.cliente.trim());
    }
  });
  return [...names].sort();
}, [sourceOrders]);
```

**Ajustar filtros de gráficos (linha 104-107):** Quando o filtro selecionado é um cliente da Juliana (não é um vendedor real), filtrar por `vendedor === 'Juliana' && cliente === filtro`:

```typescript
.filter(o => {
  if (chartVendedorFilter === 'todos') return true;
  if (o.vendedor === chartVendedorFilter) return true;
  // Cliente da Juliana como vendedor virtual
  if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() === chartVendedorFilter) return true;
  return false;
})
```

**Ajustar filtro financeiro "A receber" (linha 58):** Mesma lógica para `receberVendedor`.

**Ajustar filtro de produção (linhas 81, 88):** Mesma lógica para `prodVendedorFilter`.

#### 2. `src/pages/ReportsPage.tsx` — Lista de vendedores e filtro

**Expandir `allVendedores` (linha 130):** Adicionar clientes da Juliana:

```typescript
const allVendedores = isAdmin ? (() => {
  const names = new Set(allOrders.map(o => o.vendedor));
  allOrders.forEach(o => {
    if (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim()) {
      names.add(o.cliente.trim());
    }
  });
  return [...names].sort();
})() : [];
```

**Ajustar `displayOrders` (linha 85-87):** Incluir a mesma lógica de match por cliente da Juliana:

```typescript
const displayOrders = isAdmin && appliedFilters.filterVendedor.size > 0
  ? allOrders.filter(o => 
      appliedFilters.filterVendedor.has(o.vendedor) || 
      (o.vendedor === 'Juliana Cristina Ribeiro' && o.cliente?.trim() && appliedFilters.filterVendedor.has(o.cliente.trim()))
    )
  : orders;
```

### Resumo de arquivos

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/Index.tsx` | Clientes da Juliana na lista de vendedores + lógica de filtro nos gráficos, financeiro e produção |
| `src/pages/ReportsPage.tsx` | Clientes da Juliana na lista de vendedores + lógica de filtro na listagem de pedidos |

