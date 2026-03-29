

## Ordenação decrescente nos PDFs com pedidos

### Alteração

Aplicar `.sort()` por número do pedido (decrescente) + data de criação (decrescente) em todos os PDFs que listam pedidos individualmente.

**Função de ordenação** (reutilizada em todos os locais):
```ts
(a, b) => {
  const numA = parseInt(a.numero.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.numero.replace(/\D/g, ''), 10) || 0;
  if (numB !== numA) return numB - numA;
  return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
}
```

### Locais afetados

**`src/pages/ReportsPage.tsx`**:
1. **Relatório de pedidos** (linha 177): `ordersToExport` → aplicar `.slice().sort(...)` antes do `forEach`
2. **Fichas de produção** (linha 204): `ordersToExport` → aplicar `.slice().sort(...)` antes da iteração

**`src/components/SpecializedReports.tsx`**:
3. **Pesponto** (linha 562): `filtered` → `.sort(...)` antes do `for`
4. **Metais** (linha 643): `filtered` → `.sort(...)`
5. **Bordados** (linha 711): `filtered` → `.sort(...)`
6. **Expedição** (linha 749-752): `filtered` → `.sort(...)`
7. **Cobrança**: `filtered` → `.sort(...)`

Os relatórios agregados (Escalação, Forro, Palmilha, Forma) agrupam dados e não listam pedidos individuais, portanto não precisam desta ordenação.

