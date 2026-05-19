## Contexto

O preço do bordado **Florência** (cano) foi alterado de **R$ 25 → R$ 30**. Como o sistema recalcula `orders.preco` automaticamente (frontend + edge `reconciliar-precos` + `recomputePricesBatch`) sempre que a regra muda, **1.037 pedidos antigos** (criados antes de 18/05/2026) que tinham Florência no cano já foram (ou serão) inflados em R$ 5 por unidade — gerando divergência com os PDFs/cobranças já fechados.

A regra é: pedidos antes de 18/05 ficam com o preço antigo; só os novos seguem a nova tabela.

## Solução

Criar um mecanismo de **congelamento de preço por pedido** (genérico, serve para qualquer mudança futura), e aplicá-lo retroativamente nos pedidos afetados.

### 1. Migration: nova coluna `preco_congelado`

```sql
ALTER TABLE orders ADD COLUMN preco_congelado boolean NOT NULL DEFAULT false;
CREATE INDEX idx_orders_preco_congelado ON orders(preco_congelado) WHERE preco_congelado = true;
```

Quando `preco_congelado = true`, nenhuma rotina de recálculo toca em `preco`.

### 2. Ajustar o recálculo para respeitar o flag

Três pontos:

- **`src/lib/recomputePricesBatch.ts`** — pular o update se `o.precoCongelado === true`.
- **`supabase/functions/reconciliar-precos/index.ts`** — no SELECT filtrar `preco_congelado = false`, e mesmo nos que entrarem, não escrever `preco` se o flag for true (apenas atualizar `preco_regra_versao` para sair da fila).
- **`src/lib/recomputeOrderPrice.ts` / `priceCache.ts`** — quando o pedido está congelado, exibição do detalhe continua mostrando `order.preco` armazenado em vez de recomputar (evita o card "Preço unit." piscar 30 quando o gravado é 25).
- Tipagem em `AuthContext` (`Order.precoCongelado?: boolean`).

### 3. Correção retroativa (script único)

Para todo pedido com `created_at < '2026-05-18'` E `bordado_cano ILIKE '%Florência%'`:

```
novo_preco = preco_atual − (5 × quantidade × ocorrências_florencia_no_cano)
preco_congelado = true
preco_regra_versao = 6
```

Executado via migration (UPDATE em massa, idempotente — se já estiver congelado, pula). Afeta ~1.037 pedidos.

Pedidos criados a partir de 18/05 ficam intocados (seguem regra nova R$ 30).

### 4. UI (mínima)

No detalhe do pedido, mostrar um badge discreto **"Preço congelado"** quando o flag estiver ativo, para o admin entender por que aquele pedido não acompanha a tabela atual. (Sem ação de toggle por enquanto — congelamento é só via correção.)

## Pontos para confirmar antes de implementar

1. **Corte exato**: pedidos `created_at < '2026-05-18 00:00 BRT'` (ou seja, ≤ 17/05 23:59) — confirma?
2. **Só cano**: a alteração foi só em **Florência cano** (R$ 25→30)? Florência gáspea (R$15) e taloneira (R$10) ficam fora?
3. **Outros bordados/itens alterados na mesma leva**: foi só Florência ou tem mais variações que precisam do mesmo tratamento?
4. **Pedidos cancelados/deletados**: aplicar o congelamento neles também (para histórico bater) ou ignorar?

Assim que confirmar, executo migration + edits.