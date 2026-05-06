# Novo status: "Aguardando Sola"

Adicionar status "Aguardando Sola" no fluxo de produção de **botas**, espelhando o comportamento de "Aguardando Couro".

## Comportamento

- **Posição**: próxima do Corte. Pode-se entrar a partir de **Corte** (mesmo lugar de onde se entra em "Aguardando Couro") e voltar para **Corte**.
- **Escopo**: somente botas (`PRODUCTION_STATUSES` / `PRODUCTION_STATUSES_USER`). Cinto e extras não recebem.
- **Contagem em produção**: NÃO entra em `PRODUCTION_STATUSES_IN_PROD` (fica parado, igual "Aguardando").

## Arquivos a alterar

1. **`src/lib/order-logic.ts`**
   - Adicionar `"Aguardando Sola"` em `PRODUCTION_STATUSES` e `PRODUCTION_STATUSES_USER`, logo após `"Aguardando Couro"`.
   - **NÃO** adicionar em `PRODUCTION_STATUSES_IN_PROD`.

2. **`src/lib/statusTransitions.ts`**
   - Em `PRODUCTION_FLOW`: incluir `'Aguardando Sola'` como destino válido a partir de `'Corte'` e adicionar entrada `'Aguardando Sola': ['Corte']`.
   - Repetir o mesmo nos blocos secundários (linhas ~87-88) onde existe a duplicata para botas.

3. **`src/lib/pdfGenerators.ts`** (linha 700, ordem do filtro de status no PDF de produção)
   - Inserir `'Aguardando Sola'` após `'Aguardando Couro'` para manter ordenação.

## Fora de escopo

- Sem mudança em RLS / banco (status é texto livre na coluna `orders.status`).
- Sem alteração em cinto, extras, comissão ou financeiro.
- Sem novo relatório/board específico — aparece nas listagens existentes filtrando por status.
