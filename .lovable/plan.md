## Objetivo

Três adições pequenas e independentes:

1. Nova etapa **Pesponto Ailton** no progresso de produção (logo após Pesponto 05).
2. Nova etapa **Aguardando Couro** no progresso de produção (logo após Aguardando).
3. Filtro **Conferido / Não conferido** na lista de pedidos (Meus Pedidos / Relatórios), exclusivo para `admin_master`.

---

## Parte 1 — Pesponto Ailton

Posição no fluxo: `... → Pesponto 05 → Pesponto Ailton → Pespontando → ...`

- **Migration**:
  - `UPDATE status_etapas SET ordem = ordem + 1 WHERE ordem >= 14;`
  - `INSERT INTO status_etapas (nome, slug, ordem) VALUES ('Pesponto Ailton', 'pesponto-ailton', 14);`
  - Recriar `get_production_counts` incluindo `'Pesponto Ailton'` na lista de status "em produção".
- **`src/lib/order-logic.ts`**: adicionar `"Pesponto Ailton"` em `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER` e `PRODUCTION_STATUSES_IN_PROD`, sempre depois de `"Pesponto 05"`.
- **`src/components/SpecializedReports.tsx`**: adicionar `'Pesponto Ailton'` em `PESPONTO_STATUSES` para entrar no PDF/relatório de Pesponto.
- **`supabase/functions/admin-assistant/index.ts`**: atualizar a string do prompt com `Pesponto 01-05 / Pesponto Ailton`.
- **`docs/BUSINESS_RULES.md`**: incluir `Pesponto Ailton` na sequência de status de bota.

---

## Parte 2 — Aguardando Couro

Posição no fluxo: `... → Aguardando → Aguardando Couro → Corte → ...`

- **Migration**:
  - `UPDATE status_etapas SET ordem = ordem + 1 WHERE ordem >= 4;` (após "Aguardando", que está em ordem=3).
  - `INSERT INTO status_etapas (nome, slug, ordem) VALUES ('Aguardando Couro', 'aguardando-couro', 4);`
  - Recriar `get_production_counts` incluindo `'Aguardando Couro'` em "em produção".
- **`src/lib/order-logic.ts`**: adicionar `"Aguardando Couro"` em `PRODUCTION_STATUSES`, `PRODUCTION_STATUSES_USER` e `PRODUCTION_STATUSES_IN_PROD`, depois de `"Aguardando"`.
- **`supabase/functions/admin-assistant/index.ts`** e **`docs/BUSINESS_RULES.md`**: refletir a nova etapa na sequência descrita.

> A migration de Pesponto Ailton e a de Aguardando Couro serão feitas em ordem coerente para não colidir nos `ordem`. Faremos primeiro Pesponto Ailton (deslocando a partir de 14) e depois Aguardando Couro (deslocando a partir de 4) — o resultado final é consistente.

---

## Parte 3 — Filtro Conferido / Não conferido (admin_master)

Local: `src/pages/ReportsPage.tsx` (Meus Pedidos / Relatórios). Apenas visível quando `user?.role === 'admin_master'`.

### UI
- Novo controle no painel de filtros (junto a Status / Vendedor / Produto): um seletor com 3 opções:
  - **Todos** (padrão)
  - **Conferidos**
  - **Não conferidos**
- Persistido na URL como `conferido=sim` / `conferido=nao` (omitido quando "Todos").
- Botão **Limpar filtros** já existente também limpa este.

### Estado e persistência
- Novo estado `filterConferido: 'todos' | 'sim' | 'nao'` inicializado a partir de `searchParams.get('conferido')`.
- Incluir no `appliedFilters` e em `syncSearchParams`.

### Filtragem (server-side)
- Estender `OrderFilters` em `src/hooks/useOrders.ts` com o campo opcional `filterConferido?: 'sim' | 'nao'`.
- No `useOrders` (e em `fetchAllFilteredOrders` / `fetchAllFilteredOrderIds`), quando definido:
  - `'sim'` → `query.eq('conferido', true)`
  - `'nao'` → `query.eq('conferido', false)`
- Estender a RPC `get_orders_totals` com novo parâmetro `_conferido text DEFAULT NULL` (`'sim' | 'nao' | null`) e aplicar no `WHERE`. Atualizar a chamada do hook para passar o valor.

### Notas
- Apenas `admin_master` enxerga o controle e a tag "CONFERIDO" — coerente com a memória `pedido conferido (admin_master only)`. Outros papéis ignoram o parâmetro de URL silenciosamente.
- Sem mudanças de RLS (campo `conferido` já é selecionável pelos admins).

---

## Fora do escopo

- Sem mudanças em status de cintos ou extras (BELT_STATUSES / EXTRAS_STATUSES).
- Não migra pedidos antigos para os novos status — admins moverão manualmente quando aplicável.
- Não cria filtro de "Conferido" para vendedores (a tag continua oculta para eles).
