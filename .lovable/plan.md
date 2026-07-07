# Pendente = soma dos pedidos em "Cobrado" (sem descontar saldo)

## Regra final

- **Pendente exibido** para cada vendedor = soma de `preco × quantidade` dos pedidos com `status = 'Cobrado'`. Ponto. Não desconta saldo, não desconta baixa antiga, não faz mágica.
- **Saldo** continua sendo o que já é: comprovantes − baixas + estornos + ajustes. R$40 da Denise fica intocado.
- **Baixa automática** continua funcionando igual: quando entra comprovante novo, soma no saldo e a rotina tenta cobrir pedidos em Cobrado; se cobre um, pedido vira Pago e cria baixa; sobra fica no saldo pra próxima.

## Caso Denise (o que consertar agora)

Existem **11 pedidos** dela em `status='Cobrado'` que **já têm registro em `revendedor_baixas_pedido`** (R$ 3.720 pelo preço atual). Essas baixas são "fantasmas" — o pedido voltou pra Cobrado depois de já ter sido pago uma vez, mas o registro da baixa ficou lá. É por causa delas que o pendente aparece R$ 4.090 em vez de R$ 7.810.

Para deixar consistente com a regra ("Cobrado = pendente puro"), a data-fix é:

**Opção A (recomendada):** apagar as 11 baixas fantasmas da Denise. Motivo: se o pedido está em Cobrado, ele não foi pago — não pode existir baixa pra ele. O saldo dela vai continuar R$40 (as baixas apagadas não geram estorno; foram inválidas desde o começo). Pendente passa a mostrar R$ 7.810 corretamente.

Fazer o mesmo varredura em **todos os vendedores**: apagar qualquer `revendedor_baixas_pedido` cujo pedido esteja em status diferente de `Pago`.

## Mudanças no código

### 1. Cálculo do pendente
Em `src/lib/revendedorSaldo.ts` (e onde mais o "pendente" for calculado), garantir que a fonte é: `SELECT SUM(preco*quantidade) FROM orders WHERE vendedor=? AND status='Cobrado'`. Sem cruzar com baixas.

### 2. Trigger preventivo
Quando um pedido sai de `Pago` para qualquer outro status (via `updateOrderStatus`), apagar automaticamente a `revendedor_baixas_pedido` correspondente. Assim não se cria mais baixa fantasma no futuro.
Local: nova função DB `limpar_baixa_ao_sair_de_pago()` + trigger em `orders` (AFTER UPDATE OF status).

### 3. Cancelamento de pedido Pago (regra do turno anterior, mantida)
Continua valendo: cancelar um pedido que estava em `Pago` gera movimento `estorno` no valor da baixa antes de a trigger acima apagar o registro. Ou seja, o vendedor recupera o valor como saldo.
Sequência dentro de `updateOrderStatus`: se novo status = `Cancelado` e status atual = `Pago` e existe baixa → inserir movimento `estorno` primeiro, aí trigger apaga a baixa. Cancelar de `Cobrado` (sem baixa) apenas zera o pedido, nada a estornar.

### 4. Ajuste de preço em pedido Pago
Continua igual ao acordado: desconto vira `estorno` (saldo), acréscimo vira nova entrada em `revendedor_baixas_pedido` + movimento `baixa_pedido` pela diferença.

## Migration de correção (será enviada para aprovação separada)

```sql
-- 1. apaga baixas fantasmas (pedido não está em Pago)
DELETE FROM revendedor_baixas_pedido b
USING orders o
WHERE b.order_id = o.id AND o.status <> 'Pago';

-- 2. trigger preventiva
CREATE FUNCTION limpar_baixa_ao_sair_de_pago() ...
CREATE TRIGGER ...
```

Antes de rodar, te mostro a lista completa (vendedor, número do pedido, valor) do que vai ser apagado — nada é executado sem tua confirmação.

## Fora de escopo

- Não mexo em saldo, comprovantes ou movimentos da Denise além do que o item 1 do fix já resolve (R$40 continua).
- Não altero a UI da tela de saldo — só a fonte de dados.
- Não mexo em pedidos Pago sem baixa (histórico antigo).
