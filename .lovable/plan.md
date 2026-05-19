## Objetivo

Quando o admin ligar o switch **Baixa automática**, processar imediatamente as baixas pendentes — sem precisar esperar uma nova entrada de saldo ou edição de pedido para o trigger disparar.

## Comportamento hoje

- Ligar a flag `baixa_automatica_ativa` apenas salva o valor em `system_flags`.
- A função `tentar_baixa_automatica(vendedor)` só é chamada quando: um novo comprovante é aprovado, um pedido vira "Cobrado", ou um estorno acontece.
- Resultado: vendedores que já estavam com pedidos Cobrado e saldo suficiente continuam pendentes até algum evento disparar o trigger.

## Mudança proposta

### 1. Nova RPC `processar_baixas_automaticas_geral()` (migration)

- `SECURITY DEFINER`, restrita a `admin_master` (raise se não for).
- Verifica se a flag está ligada; se não, retorna 0.
- Seleciona vendedores distintos que tenham pelo menos um pedido `Cobrado` sem baixa (`orders.status = 'Cobrado'` e sem registro em `revendedor_baixas_pedido`).
- Para cada vendedor, chama `tentar_baixa_automatica(vendedor, auth.uid())`.
- Retorna JSON: `{ vendedores_processados, pedidos_baixados }`.

### 2. Frontend — `FinanceiroSaldoRevendedor.tsx`

- Em `handleToggleBaixaAuto(next)`, depois de `baixaAuto.update(next)`:
  - Se `next === true` e `r.ok`: chamar a nova RPC, mostrar toast com `pedidos_baixados` e disparar `load()` para atualizar saldos/pendências.
  - Se zero baixadas: toast neutro ("Nenhum pedido elegível no momento").

### 3. Helper em `src/lib/revendedorSaldo.ts`

- `processarBaixasAutomaticasGeral()` que invoca a RPC e retorna o JSON tipado.

## Detalhes técnicos

- Não altera a função `tentar_baixa_automatica` existente — ela já respeita a flag e a ordem cronológica dos pedidos.
- A RPC global é só um "kick" manual disparado ao religar o switch (e poderia ser reaproveitada por um botão futuro tipo "Processar agora").
- Como `tentar_baixa_automatica` faz INSERT em `revendedor_saldo_movimentos`, os triggers de notificação ao vendedor (sino) continuam funcionando.

## Resumo do diff

- `supabase/migrations/<timestamp>_processar_baixas_automaticas_geral.sql` — nova função.
- `src/lib/revendedorSaldo.ts` — novo helper.
- `src/components/financeiro/saldo/FinanceiroSaldoRevendedor.tsx` — chamar helper ao ligar a flag + toast com resultado.