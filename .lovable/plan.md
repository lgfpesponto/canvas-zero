# Limpeza dos estornos automáticos + blindagem futura

## Contexto

Hoje (19/05) o trigger `trg_orders_estorno_baixa_on_value_change` disparou **107 estornos automáticos** em 4 revendedoras (Denise 14, Fabiana 4, Larissa 4, Rafael 85) porque a alteração da regra Florência (R$ 25→30) mexeu no `preco` de pedidos já baixados. À noite, na baixa automática (22:36), os mesmos pedidos foram rebaixados com o valor inflado. Depois congelei o preço, então hoje os pedidos voltaram ao valor antigo no banco — mas as baixas no histórico ficaram com R$ 5 a mais cada, gerando o buraco no saldo.

## O que será feito

### 1. Migration — limpar e reescrever os movimentos de hoje

Para cada estorno automático criado hoje (`tipo='estorno'` + descrição `Estorno automático: valor/vendedor do pedido alterado`):

1. Localizar a baixa correspondente criada às 22:36 (mesmo `order_id`, `tipo='baixa_pedido'`, descrição `Baixa automática de pedido cobrado`).
2. Ajustar `valor_pedido` em `revendedor_baixas_pedido` e `valor`/`saldo_posterior` do movimento de baixa para o valor atual do pedido (já congelado).
3. Apagar o movimento de estorno.
4. Recalcular `saldo_anterior` e `saldo_posterior` de **todos** os movimentos de cada revendedora afetada (em ordem cronológica) para manter consistência da sequência.

Resultado: histórico fica como se a alteração de preço nunca tivesse mexido na baixa. Saldo final bate.

### 2. Blindar o trigger para pedidos congelados

Atualizar `trg_orders_estorno_baixa_on_value_change`:

```sql
IF NEW.preco_congelado = true THEN
  RETURN NEW;  -- pedido travado, não estorna por mudança de preço
END IF;
```

Pedidos com `preco_congelado=true` ficam imunes a estornos automáticos por alteração de regra. Mudança manual de vendedor continua disparando (essa é legítima).

### 3. Sem mudança de UI ou de código frontend

Operação puramente de banco. Nenhum arquivo do app precisa ser tocado.

## Detalhes técnicos

- Os 107 estornos têm timestamp entre `2026-05-19 12:18:11` e `12:18:21` e descrição exata `Estorno automático: valor/vendedor do pedido alterado` — fácil de filtrar com segurança.
- As baixas correspondentes têm `created_at='2026-05-19 22:36:14.346789+00'`. O par é casado por `(vendedor, order_id)`.
- Revendedoras afetadas: Denise, Fabiana, Larissa, Rafael. O recálculo de saldo é feito apenas para essas 4.
- Idempotência: query filtra por descrição exata e data, não há risco de mexer em estornos manuais ou de outros dias.
- A função `trg_orders_estorno_baixa_on_value_change` recebe um `CREATE OR REPLACE` adicionando só a guarda do flag no início.

## Riscos / mitigação

- **Risco**: recalcular saldo_anterior/posterior em série pode entrar em conflito com novos movimentos chegando no mesmo segundo. **Mitigação**: tudo em uma única transação com `LOCK TABLE revendedor_saldo_movimentos IN EXCLUSIVE MODE`.
- **Risco**: pedido que foi estornado mas ainda não foi rebaixado (sem par em 22:36). **Mitigação**: nesse caso só apaga o estorno e mantém a `revendedor_baixas_pedido` original — mas vou verificar antes de rodar se isso acontece, e se sim, recriar a baixa com valor antigo.
- Sem migrations destrutivas em schema; apenas DML + replace da função.
