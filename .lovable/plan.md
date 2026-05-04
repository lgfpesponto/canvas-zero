## Problema

Voltar uma bota pronta entrega de **Expedição → Em aberto** (ou Expedição → Produzindo) está sendo permitido sem pedir justificativa. Causa: hoje as três etapas formam um "trio livre" (`EXTRAS_FREE_TRIO = {Em aberto, Produzindo, Expedição}`) em `src/lib/statusRegression.ts`, então qualquer transição entre elas — inclusive retrocessos — é considerada não-regressão.

## Regra correta

- **Livres (sem justificativa)**: Em aberto ↔ Produzindo, e avanços Em aberto/Produzindo → Expedição.
- **Retrocesso (exige justificativa)**: Expedição → Em aberto, Expedição → Produzindo, e qualquer outro retrocesso já existente (Entregue → Expedição, Cobrado → Entregue, Pago → Cobrado, etc.).

## Arquivos alterados

### `src/lib/statusRegression.ts`
- Substituir `EXTRAS_FREE_TRIO` por `EXTRAS_FREE_PAIR = {Em aberto, Produzindo}`.
- Em `isStatusRegression` (ramo `isPureExtra`):
  - Se ambos current/next ∈ `EXTRAS_FREE_PAIR` → não é regressão.
  - Se current ∈ `EXTRAS_FREE_PAIR` e next === 'Expedição' → não é regressão (avanço).
  - Caso contrário → comparar índices em `EXTRAS_STATUS_ORDER` (Expedição → Em aberto/Produzindo passa a ser regressão).

### `mem://features/orders/status-transitions-flow`
- Atualizar a seção Extras: trocar "trio livre" por "par livre Em aberto ↔ Produzindo + avanço livre p/ Expedição; voltar de Expedição exige justificativa".

## Resultado

Selecionar "Em aberto" ou "Produzindo" para um pedido extra que está em "Expedição" passa a abrir o modal de justificativa antes de salvar, e o motivo fica registrado no histórico. Cintos e botas não são afetados.
