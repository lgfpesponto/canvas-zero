## Objetivo

Tornar a movimentação de status dos **produtos extras** (bota pronta entrega, gravata pronta entrega, kit faca, regata, etc — qualquer pedido com `tipoExtra` definido **diferente de `'cinto'`**) flexível até "Expedição", mas **estrita** a partir dali.

## Regras novas (apenas para `tipoExtra && tipoExtra !== 'cinto'`)

**Avanço livre** (qualquer ordem, sem justificativa) entre:
- Em aberto, Produzindo, Expedição

**Avanço obrigatório em sequência** (sem pular etapas):
- Expedição → Entregue → Conferido → Cobrado → Pago

**Retrocesso** em qualquer ponto da régua extras (incluindo Expedição → Em aberto, Cobrado → Entregue, etc.):
- Sempre permitido, mas exige **justificativa obrigatória** (mesmo modal já usado pelas botas).

**Aguardando / Cancelado**: continuam acessíveis de qualquer etapa (sem mudança).

## O que NÃO muda

- **Botas** (`tipoExtra` ausente): fluxo canônico atual de `statusTransitions.ts` permanece intacto.
- **Cintos** (`tipoExtra === 'cinto'`): comportamento atual permanece (BELT_STATUSES já é exibido na UI; transições não são restringidas via `FLOW`).
- Modal de justificativa existente em `ReportsPage.tsx` (passos 1 e 2) já cobre regressão — vai funcionar automaticamente quando `requiresJustification` retornar `'regression'`.

## Arquivos

### 1) `src/lib/statusTransitions.ts`
- Estender `TransitionContext` com `tipoExtra?: string | null`.
- Novo helper interno `isPureExtra(ctx)` = `!!ctx?.tipoExtra && ctx.tipoExtra !== 'cinto'`.
- Definir mapa `EXTRAS_FLOW`:
  ```
  Em aberto:   [Produzindo, Expedição]
  Produzindo:  [Em aberto, Expedição]
  Expedição:   [Entregue]
  Entregue:    [Conferido]
  Conferido:   [Cobrado]
  Cobrado:     [Pago]
  Pago:        []
  ```
- Em `getAllowedNextStatuses` e `isTransitionAllowed`: se `isPureExtra`, usar `EXTRAS_FLOW` no lugar de `FLOW`.
- Manter `ALWAYS_AVAILABLE` (Aguardando/Cancelado) e a regra "saindo de Aguardando/Cancelado, qualquer destino é válido" — tudo dentro do universo de extras (Em aberto, Produzindo, Expedição, Entregue, Conferido, Cobrado, Pago).

### 2) `src/lib/statusRegression.ts`
- Adicionar `EXTRAS_STATUS_ORDER = ['Em aberto','Produzindo','Expedição','Entregue','Conferido','Cobrado','Pago']`.
- Estender `isStatusRegression` e `requiresJustification` para receber opcional `tipoExtra`. Quando `isPureExtra`, usar `EXTRAS_STATUS_ORDER` para detectar regressão. Trecho **Em aberto ↔ Produzindo ↔ Expedição** considera-se "lateral" (não regressão), pois o usuário liberou trânsito livre nesse trio.
  - Implementação: definir `EXTRAS_FREE_TRIO = new Set(['Em aberto','Produzindo','Expedição'])`; se ambos estão no trio, **não é regressão**.
  - Se `current` está em estágio posterior a `next` na ordem extras (ex.: Cobrado → Entregue, Expedição → Em aberto, Entregue → Expedição), é regressão e exige justificativa.

### 3) `src/contexts/AuthContext.tsx`
- No `updateOrderStatus`, incluir `tipo_extra` no select e passar `tipoExtra: currentRow.tipo_extra` no `ctx` de `isTransitionAllowed`.

### 4) `src/pages/ReportsPage.tsx`
- Passar `tipoExtra` para `isTransitionAllowed` e para `requiresJustification` em todos os call-sites (filtragem da lista quando 1 pedido extra puro selecionado, detecção de transições com trava).
- Quando `selectedOrders.length === 1 && o.tipoExtra && o.tipoExtra !== 'cinto'`, filtrar `EXTRAS_STATUSES` por `isTransitionAllowed`.

### 5) Memória
- Atualizar `mem://features/orders/status-transitions-flow` adicionando seção "Extras" com a nova régua.

## Resultado prático

- Bota Pronta Entrega em "Em aberto" → pode ir direto para "Expedição" sem passar por "Produzindo".
- Mesma bota em "Expedição" → só vai para "Entregue" (próxima sequencial). Se tentar pular pra "Cobrado", bloqueia com toast.
- Voltar de "Expedição" para "Em aberto" → exige justificativa via modal.
- Cintos e botas: zero impacto.