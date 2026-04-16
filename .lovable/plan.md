

## Diagnóstico: "Visualizar pedidos" não mostra os pedidos escaneados

### Causa raiz

Na linha 311 de `ReportsPage.tsx`, a lista de pedidos selecionados é construída assim:

```typescript
serverOrders.filter(o => selectedIds.has(o.id))
```

O problema: `serverOrders` é **paginado** e contém apenas os pedidos da página atual. Quando você escaneia vários pedidos sequencialmente, cada scan define `scanFilterId` para o último pedido escaneado — fazendo `serverOrders` conter apenas esse último pedido. Os pedidos escaneados anteriormente **não estão mais em `serverOrders`**, então o filtro retorna lista vazia.

O mesmo problema afeta o `ordersToExport` (linha 178-179) e as verificações de PDF (linhas 674+).

### Correção proposta

**Arquivo: `src/pages/ReportsPage.tsx`**

1. **Adicionar estado para pedidos escaneados**: Criar um `Map<string, Order>` local (`scannedOrdersMap`) que acumula todos os pedidos escaneados durante a sessão do scanner

2. **Alimentar o map no handleScan**: Quando `fetchOrderByScan` retorna um pedido, armazená-lo no map além de adicioná-lo ao `selectedIds`

3. **Corrigir "Visualizar pedidos"**: Na seção `showSelectedList`, usar o `scannedOrdersMap` como fonte dos pedidos selecionados em vez de `serverOrders.filter(...)`

4. **Corrigir `ordersToExport`**: Usar `fetchOrdersByIds` (já importado) ou o map local para garantir que todos os pedidos selecionados estejam disponíveis para exportação e mudança de status

### O que NÃO muda
- Lógica de scan (`fetchOrderByScan`) continua igual
- Paginação e filtros normais não são afetados
- O `selectedIds` continua sendo o Set de controle
- O beep e feedback visual continuam iguais

