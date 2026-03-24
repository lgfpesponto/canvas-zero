

## Ajustes na busca e seleção de pedidos

### O que o usuário quer
1. **Lista de pedidos**: Ao buscar por número e selecionar, buscar outro número sem perder a seleção anterior (manter contagem acumulativa).
2. **Pedido detalhado**: Adicionar campo de busca manual por número (não só scanner de código de barras), e ao navegar para outro pedido, manter o anterior selecionado.

### Alterações

#### 1. ReportsPage — Não limpar seleção ao aplicar filtros
- **Arquivo**: `src/pages/ReportsPage.tsx`, linha 62
- Remover `setSelectedIds(new Set())` da função `applyFilters` para que a seleção persista ao buscar novos pedidos.

#### 2. OrderDetailPage — Campo de busca manual + seleção acumulativa
- **Arquivo**: `src/pages/OrderDetailPage.tsx`
- Renomear botão "Escanear" para "Buscar Pedido" e alterar placeholder do input de `"Escaneie o código de barras..."` para `"Digite o nº do pedido ou escaneie..."`.
- No `handleScanSubmit`: antes de navegar para o novo pedido, chamar `toggle(order.id)` para selecionar/manter o pedido atual. Não fechar o scanner após busca (remover `setShowScanner(false)`), permitindo buscas consecutivas.
- Isso usa o contexto `useSelectedOrders` que já está importado e funcional na página.

#### Detalhes técnicos

**ReportsPage.tsx** (linha 62):
```
// Antes:
setSelectedIds(new Set());
// Depois: remover esta linha
```

**OrderDetailPage.tsx** (`handleScanSubmit`, linha 37-48):
```typescript
const handleScanSubmit = useCallback(() => {
  if (!scanValue.trim()) return;
  const sourceOrders = isAdmin ? allOrders : orders;
  const match = sourceOrders.find(o => matchOrderBarcode(scanValue.trim(), o));
  if (match) {
    // Selecionar pedido atual antes de navegar
    if (order && !isSelected(order.id)) {
      toggle(order.id);
    }
    setScanValue('');
    navigate('/pedido/' + match.id);
  } else {
    toast.error('Pedido não encontrado.');
    setScanValue('');
  }
}, [scanValue, isAdmin, allOrders, orders, navigate, order, isSelected, toggle]);
```

- Botão: `"Escanear"` → `"Buscar Pedido"`
- Placeholder: `"Escaneie o código de barras..."` → `"Digite o nº do pedido ou escaneie..."`
- Remover `setShowScanner(false)` do submit para manter campo aberto

