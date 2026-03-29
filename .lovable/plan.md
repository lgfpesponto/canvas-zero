

## Reordenar por data + Filtros multi-select para Status e Vendedor

### 1. Ordenação por data/hora (mais recentes primeiro)

**Arquivo**: `src/pages/ReportsPage.tsx`

Alterar o `.sort()` no `filteredOrders` (linha 90-96) para ordenar por data + hora em vez de número do pedido:

```ts
.sort((a, b) => {
  if (a.dataCriacao !== b.dataCriacao) return b.dataCriacao.localeCompare(a.dataCriacao);
  if (a.horaCriacao && b.horaCriacao) return b.horaCriacao.localeCompare(a.horaCriacao);
  return 0;
});
```

### 2. Filtro "Progresso da Produção" multi-select

Converter `filterStatus` de `string` para `Set<string>` (mesmo padrão do filtro Produto):

- **State**: `filterStatus` → `useState<Set<string>>(new Set())` (vazio = todos)
- **appliedFilters**: `filterStatus` passa a ser `Set<string>`
- **Filtro lógico** (linha 83): Se o set não está vazio, checar `appliedFilters.filterStatus.has(o.status)`
- **UI** (linhas 766-772): Trocar o `<select>` por um `<Popover>` com checkboxes, igual ao filtro Produto. Botões "Todos" e "Nenhum" no topo
- **Limpar filtros**: resetar para `new Set()`

### 3. Filtro "Vendedor" multi-select (admin)

Converter `filterVendedor` de `string` para `Set<string>`:

- **State**: `filterVendedor` → `useState<Set<string>>(new Set())` (vazio = todos)
- **appliedFilters**: `filterVendedor` passa a ser `Set<string>`
- **displayOrders** (linha 74-76): Se set não vazio, filtrar `allOrders` por `filterVendedor.has(o.vendedor)`
- **UI** (linhas 773-780): Trocar o `<select>` por `<Popover>` com checkboxes, mesmo padrão
- **Limpar filtros**: resetar para `new Set()`

### Resumo

| Alteração | Detalhe |
|-----------|---------|
| Ordenação | Data + hora desc (mais recente primeiro) |
| filterStatus | `string` → `Set<string>` + Popover com checkboxes |
| filterVendedor | `string` → `Set<string>` + Popover com checkboxes |
| Arquivo | `src/pages/ReportsPage.tsx` apenas |

