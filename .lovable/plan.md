

## Organização e filtro por scanner na página "Meus Pedidos"

### Alterações

**Arquivo**: `src/pages/ReportsPage.tsx`

#### 1. Ordenação automática por número do pedido (decrescente) + data

Na `filteredOrders` (linha 76-90), adicionar `.sort()` após o `.filter()`:
- Ordenar por número do pedido (extrair parte numérica com `parseInt`) em ordem **decrescente** (maior primeiro = mais recente)
- Critério secundário: `dataCriacao` decrescente

Nota: o usuário pediu "do menor para o maior" mas o exemplo mostra 103, 102, 101, 100 — que é decrescente. Seguirei o exemplo (decrescente).

#### 2. Scanner como filtro automático na lista

Atualmente o `handleScan` (linhas 128-154) seleciona o pedido mas não filtra a lista.

Alterações:
- Adicionar state `scanFilterId` (string | null)
- No `handleScan` (admin): além de adicionar ao `selectedIds`, setar `scanFilterId = match.id` para filtrar a lista mostrando apenas esse pedido
- Na `filteredOrders`: quando `scanFilterId` estiver setado, adicionar filtro `o.id === scanFilterId` — mas apenas como override visual temporário
- Melhor abordagem: aplicar `scanFilterId` como filtro pós-`filteredOrders`:
  - Criar `visibleOrders = scanFilterId ? filteredOrders.filter(o => o.id === scanFilterId) : filteredOrders`
  - Usar `visibleOrders` para renderização da lista e contagem visual
  - Manter `filteredOrders` para seleção bulk e export (preservar seleções anteriores)
- Ao escanear novo pedido: o `scanFilterId` muda para o novo, mas as seleções anteriores permanecem no `selectedIds`
- Limpar `scanFilterId` quando: usuário fecha scanner, aplica filtros manualmente, ou limpa busca — para voltar a ver todos

#### Resumo

| O quê | Como |
|-------|------|
| Ordenação | `.sort()` no `filteredOrders` por número desc + data desc |
| Scanner filtra | Novo state `scanFilterId`, `visibleOrders` derivado, lista renderiza `visibleOrders` |
| Seleções persistem | `selectedIds` não é afetado pelo `scanFilterId` |
| Reset filtro scanner | Fechar scanner ou aplicar filtros manuais limpa `scanFilterId` |

