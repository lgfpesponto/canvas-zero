# Tornar "Aguardando" e "Cancelado" status que sempre exigem justificativa

## Comportamento atual
- Hoje só pede confirmação + justificativa quando `next` está numa posição **anterior** a `current` na ordem canônica.
- "Aguardando" e "Cancelado" não são etapas de fluxo — são estados fora de linha.
- "Cancelado" já tem uma checagem isolada que exige `progressObservacao` preenchido, mas não passa pelos modais de 2 passos nem grava prefixo no histórico.

## Comportamento desejado
Sempre que um pedido for movido **para** "Aguardando" **ou** "Cancelado" (a partir de qualquer etapa diferente), o sistema deve abrir o mesmo fluxo de 2 passos já existente:

1. **Modal de confirmação** mostrando desde quando o pedido está na etapa atual.
2. **Modal de justificativa obrigatória** (mín. 5 caracteres), gravada no histórico com prefixo apropriado:
   - `[PAUSA]` quando o destino for "Aguardando".
   - `[CANCELAMENTO]` quando o destino for "Cancelado".
   - `[RETROCESSO]` quando for regressão comum na ordem canônica.

## Mudanças técnicas

### `src/lib/statusRegression.ts`
- Adicionar `PAUSE_STATUSES = ['Aguardando']` e `CANCEL_STATUSES = ['Cancelado']`.
- Nova função `requiresJustification(current, next)` retornando:
  - `'cancel'` quando `next ∈ CANCEL_STATUSES` e `current !== next`
  - `'pause'` quando `next ∈ PAUSE_STATUSES` e `current !== next`
  - `'regression'` quando `isStatusRegression(current, next)` é verdadeiro
  - `null` caso contrário
- Manter `isStatusRegression` como está (ela ignora "Cancelado" — comportamento mantido para não duplicar com a regra nova).

### `src/pages/ReportsPage.tsx`
- Em `handleBulkProgressUpdate`:
  - Remover o early-return atual que exige `progressObservacao` para "Cancelado" (passa a ser tratado pelo modal).
  - Trocar `isStatusRegression(...)` por `requiresJustification(...)` e guardar o `kind` (`'pause' | 'cancel' | 'regression'`) em cada item.
- Modais (`showRegressionConfirmModal` / `showRegressionModal`) passam a renderizar título e textos conforme o `kind`:
  - **Pausa**: "Pausar pedido?" / "Pedido #XXXX está em [Etapa] desde [data/hora]. Confirma pausa em 'Aguardando'?"
  - **Cancelamento**: "Cancelar pedido?" / "Pedido #XXXX está em [Etapa] desde [data/hora]. Confirma cancelamento?"
  - **Regressão**: textos atuais ("Voltar etapa?").
  - Se a seleção misturar tipos, listar cada item com seu rótulo.
- `handleConfirmRegression` → renomear para `handleConfirmJustification`. Por item, escolher o prefixo (`[PAUSA]`, `[CANCELAMENTO]`, `[RETROCESSO]`) ao montar a observação.

### Memória
- Atualizar `mem://features/orders/status-regression-guard.md` documentando que "Aguardando" e "Cancelado" sempre disparam o fluxo de 2 passos, com prefixos `[PAUSA]` e `[CANCELAMENTO]`.
- Cruzar com `mem://features/orders/cancellation-status.md` para manter as regras coerentes (motivo obrigatório continua valendo, agora capturado pelo modal).

## Fora de escopo
- Listas separadas para cintos/extras (fica para depois).
- Movimentos laterais entre Pespontos/Bordados continuam sem aviso.
