

## Corrigir tela branca ao selecionar pedidos em "Meus Pedidos"

### Causa raiz

O componente `ReportsPage.tsx` (1077 linhas) recria funções pesadas de geração de PDF (~500 linhas) e recalcula valores não-memoizados a cada mudança de seleção. Com muitos pedidos em memória, isso causa acúmulo de memória até o navegador crashar.

### Solução

#### 1. Memoizar valores derivados (`ReportsPage.tsx`)

```ts
// Linha 102 — envolver em useMemo
const totalValue = useMemo(() => 
  filteredOrders.reduce((s, o) => s + o.preco * o.quantidade, 0),
  [filteredOrders]
);

// Linha 125 — envolver em useMemo
const ordersToExport = useMemo(() => 
  selectedIds.size > 0
    ? filteredOrders.filter(o => selectedIds.has(o.id))
    : filteredOrders,
  [selectedIds, filteredOrders]
);
```

#### 2. Extrair funções de PDF para fora do componente

Mover `generateReportPDF` e `generateProductionSheetPDF` para um arquivo separado `src/lib/pdfGenerators.ts`. Essas funções recebem os dados como parâmetros em vez de capturar closures pesadas. No componente, chamá-las com `useCallback`.

#### 3. Paginação da lista visível

Adicionar `PAGE_SIZE = 50` e estado `page`. Renderizar apenas `visibleOrders.slice(0, page * PAGE_SIZE)` com botão "Carregar mais". Isso limita os nós DOM mesmo quando todos os filtros estão limpos.

#### 4. Extrair card de pedido como `React.memo`

Criar componente `OrderCard` com `React.memo` para que cards não-afetados por uma seleção não re-renderizem.

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/pdfGenerators.ts` | Novo — funções de PDF extraídas |
| `src/pages/ReportsPage.tsx` | Memoizar valores, usar pdfGenerators, paginação, OrderCard memo |

### Detalhes técnicos

- As funções de PDF atualmente ocupam ~500 linhas inline no componente. Cada re-render recria essas funções e captura `allOrders` (potencialmente milhares de pedidos) na closure, causando pressão de memória
- `React.memo` no `OrderCard` compara `order.id`, `isSelected`, e `isAdmin` — evita re-render de cards quando só a seleção de outro card muda
- A paginação reseta para `page = 1` ao aplicar filtros ou escanear

