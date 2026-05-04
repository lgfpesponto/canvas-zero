## Objetivo

Hoje o texto "PRAZO X DIAS ÚTEIS" exibido no detalhe do pedido (e em algumas telas de criação) ainda usa fórmulas antigas (`cinto = 5`, extra = `1`, bota = `15`). Os novos prazos foram movidos para `getTotalBizDays()` em `src/lib/orderDeadline.ts`. Falta sincronizar a UI e a gravação inicial em `diasRestantes` para usarem a mesma fonte.

## Mudanças

1. **`src/pages/OrderDetailPage.tsx`** (linha 161)
   - Trocar a fórmula local por `getTotalBizDays(order)`, importado de `@/lib/orderDeadline`.
   - Resultado: o cabeçalho "PRAZO X DIAS ÚTEIS" passa a refletir 20du (bota/cinto), 1/2/4/5/7/20du (extras conforme tipo) e Bota PE 1du+maior extra.

2. **`src/contexts/AuthContext.tsx`** (linha 492)
   - Substituir `const totalBizDays = rest.tipoExtra === 'cinto' ? 5 : rest.tipoExtra ? 1 : 15;` por `getTotalBizDays(rest)`.
   - Garante que `diasRestantes` salvo em novos pedidos reflita o lead time correto desde a criação.

3. **`src/pages/OrderPage.tsx`** (linha 1572) e **`src/pages/EditOrderPage.tsx`** (linha 736)
   - Texto fixo "Prazo de Produção: 15 dias úteis" — atualizar para "20 dias úteis" (bota encomenda).

## Detalhes técnicos

- `getTotalBizDays` já retorna 20 para `cinto` e bota, e cobre todos os extras inclusive `bota_pronta_entrega` (1 + max extra embutido).
- Não há mudança em RLS, banco ou cálculos de prazo restante — só está sendo unificada a fonte do "lead time total" exibido.
- O label "Aguardando bota" do carimbo vinculado continua independente (já funciona via `getOrderDeadlineInfo`).

## Fora do escopo

- Não alterar PDFs (já usam `getOrderDeadlineInfo` ou não exibem lead time fixo).
- Não retroativar `diasRestantes` em pedidos antigos (campo é apenas snapshot inicial; cálculo dinâmico é feito por `getOrderDeadlineInfo`).
