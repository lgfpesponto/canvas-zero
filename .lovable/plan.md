## Mudanças

**1. `Baixa Site (Despachado)` passa a contar como etapa final**

Atualizar `FINAL_STAGES` em `src/lib/orderDeadline.ts` para incluir `'Baixa Site (Despachado)'`. Pedidos nesse status mostrarão "✓" (prazo atingido) e não acumulam atraso.

Atualizar também os outros pontos que duplicam a lista de status finais para manter consistência:
- `src/pages/ReportsPage.tsx` (constante `FINAL` no fetch de "Apenas atrasados") — usar a constante exportada `FINAL_STAGES` em vez de duplicar a lista.
- `src/components/dashboard/AdminDashboard.tsx` (constante `FINAL_STAGES` local no fetch de "Pedidos em Alerta") — idem, importar de `orderDeadline.ts`.

**2. Pedidos com vendedor "Estoque" não têm prazo**

Em `getOrderDeadlineInfo` (`src/lib/orderDeadline.ts`):
- Adicionar parâmetro opcional `vendedor` na assinatura.
- Detectar `isNoDeadline = vendedor.toLowerCase() === 'estoque'`.
- Quando verdadeiro: retornar `daysLeft: 0`, `daysOverdue: 0`, `isOverdue: false`, `tone: 'muted'`, `label: '—'`, `shortLabel: '—'`.
- Acrescentar `isNoDeadline: boolean` na interface `DeadlineInfo`.

Excluir Estoque também dos fetchs:
- "Apenas atrasados" (ReportsPage): adicionar `.neq('vendedor', 'Estoque')` na query.
- "Pedidos em Alerta" (AdminDashboard): mesmo filtro.

**3. UI tone "muted"**

Onde o `tone` é mapeado para classes (provavelmente `OrderCard.tsx` e `SoladoBoard.tsx` / `OrderDetailPage.tsx`), mapear `'muted'` para uma cor neutra (ex.: `text-muted-foreground`). Verificar e ajustar os call-sites.

## Arquivos editados

- `src/lib/orderDeadline.ts` (lógica central + nova constante e tone)
- `src/pages/ReportsPage.tsx` (usar `FINAL_STAGES`, excluir Estoque)
- `src/components/dashboard/AdminDashboard.tsx` (usar `FINAL_STAGES`, excluir Estoque)
- Componentes que usam `tone` para estilizar (ajuste do `'muted'`)

Sem mudanças no banco.
