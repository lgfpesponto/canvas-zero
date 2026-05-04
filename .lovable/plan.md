## Problema

Hoje, quando um pedido está numa etapa avançada (ex.: Montagem, Expedição), o dropdown "Mudar Progresso de Produção" só lista as etapas **seguintes** do fluxo. As etapas anteriores não aparecem como opção, então o usuário não consegue retroceder mesmo quando a regra de negócio permite (com justificativa registrada).

A causa: `getAllowedNextStatuses` / `isTransitionAllowed` só consideram avanços definidos no `FLOW`/`EXTRAS_FLOW`. O retrocesso é bloqueado antes de chegar em `requiresJustification`, que já saberia pedir o motivo.

## Solução

Permitir que qualquer status anterior do fluxo aplicável seja um destino válido. A justificativa (já implementada em `statusRegression.ts` + modal no `ReportsPage`) cuida do alerta e do registro do motivo no histórico.

### Regras mantidas
- "Aguardando" e "Cancelado" continuam disponíveis em qualquer etapa.
- Restrições de contexto continuam: `Baixa Estoque` só p/ vendedor "Estoque"; `Baixa Site (Despachado)` só p/ não-Estoque.
- Trio livre dos extras (Em aberto / Produzindo / Expedição) continua sem justificativa.
- Retrocesso entre etapas de bota / dentro do bloco sequencial dos extras (Expedição → Em aberto, Pago → Cobrado, etc.) → **abre modal de justificativa**.

## Arquivos alterados

### `src/lib/statusTransitions.ts`
- Em `getAllowedNextStatuses`: além dos destinos do `FLOW`/`EXTRAS_FLOW`, incluir **todas as outras chaves do mesmo flow** (etapas anteriores e laterais), dedupadas. Continua aplicando `applyContextFilter`.
- Em `isTransitionAllowed`: se `next` for uma chave válida do flow aplicável (mesmo que não esteja na lista de avanços de `current`), permitir — desde que passe no `applyContextFilter`. Mantém o bloqueio de `Baixa Estoque` / `Baixa Site (Despachado)` por vendedor.
- `TRANSITION_BLOCKED_MESSAGE` continua existindo para os casos remanescentes (vendedor errado em Baixa Estoque/Site).

### `src/pages/ReportsPage.tsx`
- Nenhuma mudança lógica: o filtro existente `statusList.filter(s => isTransitionAllowed(...))` passará a incluir os retrocessos automaticamente.
- O fluxo `requiresJustification` → `JustificationModal` já existente cuida de pedir o motivo.

### `src/contexts/AuthContext.tsx`
- Sem mudança: `updateOrderStatus` continuará chamando `isTransitionAllowed`; agora aceitará retrocessos. O modal de justificativa em `ReportsPage` é responsável por exigir o motivo antes de chamar `updateOrderStatus`.

### `mem://features/orders/status-transitions-flow`
- Atualizar nota: "Qualquer etapa do mesmo fluxo é destino válido; retrocesso exige justificativa registrada no histórico via modal."

## Resultado esperado

No modal "Mudar Progresso de Produção", para um pedido em Montagem (bota) o dropdown passa a listar Em aberto, Impresso, Corte, Baixa Corte, Pesponto X, Revisão, Expedição, etc. Selecionar uma anterior abre o modal de justificativa antes de salvar; a observação fica registrada no histórico do pedido. Para extras, o mesmo vale para sair de Pago/Cobrado/Conferido/Entregue de volta a etapas anteriores.
