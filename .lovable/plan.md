

## Eliminação de Limites Fixos — Arquitetura Server-Side Completa

### Visão Geral

Remover o carregamento massivo de pedidos do AuthContext e migrar toda a leitura de dados para queries diretas ao Supabase, com paginação real, queries agregadas e busca por ID.

### Escopo da Mudança

O AuthContext hoje carrega **todos** os pedidos na memória (limitado pelo default de 1000 do Supabase). 21 arquivos consomem `orders`/`allOrders`. A refatoração elimina esse padrão e substitui por queries sob demanda.

---

### Parte 1 — Funções RPC no Supabase (Migration)

Criar funções SQL para queries agregadas que os dashboards precisam, evitando carregar todos os pedidos:

```sql
-- Valor pendente (Entregue/Cobrado), filtrado por vendedor opcionalmente
CREATE FUNCTION get_pending_value(vendor text DEFAULT NULL)
RETURNS numeric ...

-- Contagem de produtos em produção, com filtros
CREATE FUNCTION get_production_counts(product_types text[] DEFAULT NULL, vendors text[] DEFAULT NULL)
RETURNS TABLE(in_production bigint, total bigint) ...

-- Dados de gráfico de vendas agrupados por período
CREATE FUNCTION get_sales_chart(period text, product_filter text DEFAULT 'todos', vendor_filter text DEFAULT 'todos')
RETURNS TABLE(label text, vendas bigint) ...

-- Contagem total de pedidos com filtros (para paginação)
-- Nota: já resolvido pelo count: 'exact' do Supabase
```

### Parte 2 — AuthContext: Remover Estado de Pedidos

**`src/contexts/AuthContext.tsx`**

- Remover `orders`, `allOrders`, `setOrders`, `setAllOrders` e `loadOrders`
- Remover `dbRowToOrder` / `orderToDbRow` — mover para `src/lib/order-logic.ts`
- Manter: `user`, `role`, `isAdmin`, `login`, `logout`, `register`, `updateProfile`, `allProfiles`
- Manter funções de mutação (`addOrder`, `updateOrder`, `updateOrderStatus`, `deleteOrder`, `deleteOrderBatch`) mas sem atualizar estado local — retornar apenas sucesso/falha
- Expor `supabase` helpers ou mover para hooks dedicados

### Parte 3 — Hook `useOrders` para Queries Server-Side

**Novo: `src/hooks/useOrders.ts`**

Hook genérico para buscar pedidos paginados com filtros server-side:

```typescript
function useOrders(filters: OrderFilters, page: number, pageSize: number) {
  // Constrói query Supabase com .range(), .ilike(), .in(), .or()
  // Retorna { data, count, loading, error, refetch }
}
```

Filtros traduzidos para PostgREST:
- `searchQuery` → `.or('numero.ilike.%X%,cliente.ilike.%X%')`
- `filterStatus` → `.in('status', [...])`
- `filterDate/filterDateEnd` → `.gte('data_criacao', ...).lte('data_criacao', ...)`
- `filterProduto` → `.or('tipo_extra.is.null,tipo_extra.in.(...)')` (bota = null)
- `filterVendedor` (inclui lógica Juliana) → `.or('vendedor.eq.X,and(vendedor.eq.Juliana...,cliente.eq.X)')`

### Parte 4 — Hook `useOrderById`

**Novo: `src/hooks/useOrderById.ts`**

```typescript
function useOrderById(id: string) {
  // Busca único pedido por ID diretamente do Supabase
  // Usado por OrderDetailPage, EditOrderPage, EditExtrasPage
}
```

### Parte 5 — ReportsPage: Paginação Server-Side

**`src/pages/ReportsPage.tsx`**

- Usar `useOrders` com filtros da URL e `page` da URL
- `totalPages = Math.ceil(count / PAGE_SIZE)` — sem limite artificial
- Barcode scanner: query direta `supabase.from('orders').select('*').or('numero.eq.X,id.eq.X').single()`
- `totalValue`: query separada `select('preco, quantidade')` com mesmos filtros, sem paginação (ou RPC de soma)
- Lista de vendedores: query `select('vendedor, cliente').order('vendedor')` distinta

### Parte 6 — Dashboards: Queries Agregadas

**`src/components/dashboard/AdminDashboard.tsx`**
- `financialData` → RPC `get_pending_value`
- `produtosProducao/totalProducao` → RPC `get_production_counts`
- `chartData` → RPC `get_sales_chart`
- `solaCouro/Rustica/ViraColorida` → queries diretas com filtros `.ilike('solado', ...)`
- `SpecializedReports` → recebe dados via query própria (já usa `allOrders` internamente)

**`src/components/dashboard/VendedorDashboard.tsx`**
- Mesma abordagem: RPCs para métricas, query direta para gráfico

**`src/components/dashboard/FernandaDashboard.tsx`**
- Queries diretas para `solaCouro`, `solaRustica`, `viraColorida`
- `SpecializedReports` → refatorar para buscar seus próprios dados

### Parte 7 — SpecializedReports: Autossuficiente

**`src/components/SpecializedReports.tsx`**

- Substituir `useAuth().allOrders` por query direta ao Supabase
- Cada relatório busca apenas os pedidos relevantes (ex: status in produção, tipo_extra específico)
- Filtros de vendedor e progresso aplicados na query

### Parte 8 — TrackOrderPage + ProfilePage

- `TrackOrderPage`: query paginada dos pedidos do usuário (RLS filtra automaticamente)
- `ProfilePage`: query agregada para estatísticas do usuário

### Parte 9 — Barcode Scanner (ReportsPage)

- `handleScan`: query direta `supabase.from('orders').select('*').eq('numero', code).maybeSingle()`
- Se não encontrar por numero, tentar por `id`
- Resultado instantâneo, sem dependência de cache local

### Parte 10 — Exportação em Lotes

- Para PDF/Excel sem seleção manual: iterar com `.range()` em lotes de 500
- Acumular resultados e gerar arquivo após completar
- Mostrar progresso ao usuário

---

### Sequência de Implementação

1. Migration SQL (RPCs agregadas)
2. Mover `dbRowToOrder`/`orderToDbRow` para `order-logic.ts`
3. Criar `useOrders`, `useOrderById`
4. Refatorar `ReportsPage` (maior impacto)
5. Refatorar `OrderDetailPage`, `EditOrderPage`, `EditExtrasPage`
6. Refatorar Dashboards (Admin, Vendedor, Fernanda)
7. Refatorar `SpecializedReports`, `TrackOrderPage`, `ProfilePage`
8. Limpar AuthContext (remover `orders`/`allOrders`)
9. Testes de integração

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Nova — RPCs agregadas |
| `src/lib/order-logic.ts` | Expandir — receber `dbRowToOrder`/`orderToDbRow` |
| `src/hooks/useOrders.ts` | Novo — query paginada server-side |
| `src/hooks/useOrderById.ts` | Novo — busca por ID |
| `src/contexts/AuthContext.tsx` | Remover `orders`/`allOrders`, simplificar |
| `src/pages/ReportsPage.tsx` | Server-side pagination + scanner direto |
| `src/pages/OrderDetailPage.tsx` | Usar `useOrderById` |
| `src/pages/EditOrderPage.tsx` | Usar `useOrderById` |
| `src/pages/EditExtrasPage.tsx` | Usar `useOrderById` |
| `src/pages/TrackOrderPage.tsx` | Query paginada própria |
| `src/pages/ProfilePage.tsx` | Query agregada |
| `src/pages/PiecesReportPage.tsx` | Query direta |
| `src/components/dashboard/AdminDashboard.tsx` | RPCs + queries diretas |
| `src/components/dashboard/VendedorDashboard.tsx` | RPCs + queries diretas |
| `src/components/dashboard/FernandaDashboard.tsx` | Queries diretas |
| `src/components/SpecializedReports.tsx` | Query própria |
| `src/components/CommissionPanel.tsx` | Receber dados via prop ou query |

### Riscos e Mitigações

- **PostgREST `.or()` complexo** (lógica Juliana): se não funcionar, criar RPC SQL dedicada
- **SpecializedReports** é o componente mais complexo (1556 linhas) — refatorar incrementalmente
- **Mutações** (addOrder, updateOrder, deleteOrder): sem cache local, as páginas precisam de `refetch` após mutação — implementar via callback ou invalidação de query (react-query)

