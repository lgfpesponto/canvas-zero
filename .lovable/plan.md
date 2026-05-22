# Corrigir preço das Gravatas Pronta Entrega (R$ 30)

## Diagnóstico

As gravatas tipo "Pronta Entrega" estão indo para o banco com `preco = 0`. Confirmado: das 16 gravatas Pronta Entrega cadastradas, 15 estão com R$ 0 (incluindo as 3 mais recentes — GRAVATA93/94/95 de 21/05).

Causa raiz: o `OrderDetailPage.tsx` tem um `switch` **local** de extras (`computeExtraTotal` na linha ~432 e `extraPriceItems` na linha ~830) que **não tem o `case 'gravata_pronta_entrega'`** (nem `'regata_pronta_entrega'`). Como o detalhe mostra R$ 0 na composição e o cálculo local é usado para validações de exibição, o pedido sai com preço errado e o ajuste do banco não acontece para esses casos.

A biblioteca canônica (`src/lib/recomputeOrderPrice.ts`) já tem a regra certa (`gravata_pronta_entrega → 30`). Por isso a auto-correção do detalhe **funcionaria** se rodasse — mas como esses pedidos são lançados e movidos direto para Entregue, ninguém abre o detalhe.

## O que vai mudar

### 1. `src/pages/OrderDetailPage.tsx` (frontend)
Adicionar os 2 cases que faltam nos dois `switch` locais:
- `computeExtraTotal` (~ linha 457): `case 'gravata_pronta_entrega': t += 30; break;` e `case 'regata_pronta_entrega': t += 50; break;`
- `extraPriceItems` (~ linha 865): `['Gravata Pronta Entrega', 30]` e `['Regata Pronta Entrega', 50]`

Resultado: composição passa a mostrar R$ 30 (gravata) / R$ 50 (regata), e a auto-correção do preço grava o valor certo automaticamente quando alguém abre o detalhe.

### 2. Backfill SQL (migration)
Corrigir os pedidos antigos para não precisar abrir um a um:

```sql
UPDATE public.orders
SET preco = 30,
    preco_migrado_v2 = true,
    alteracoes = COALESCE(alteracoes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
      'usuario','Sistema',
      'descricao','Correção automática: Gravata Pronta Entrega = R$ 30',
      'afetouValor', true
    ))
WHERE tipo_extra = 'gravata_pronta_entrega' AND COALESCE(preco,0) = 0;

UPDATE public.orders
SET preco = 50, preco_migrado_v2 = true, alteracoes = ... (mesmo padrão)
WHERE tipo_extra = 'regata_pronta_entrega' AND COALESCE(preco,0) = 0;
```

15 pedidos de gravata serão atualizados. Regatas serão verificadas no mesmo passo.

## Validação

- GRAVATA93, GRAVATA94, GRAVATA95 e todas as anteriores (GRAVATA2-9, 30025, 30027, 30033) ficam com `preco = 30`.
- Abrir o detalhe de uma gravata mostra "Gravata Pronta Entrega — R$ 30,00" na composição.
- Novas vendas continuam saindo a R$ 30 (já está certo no `ExtrasPage`).
- Relatórios financeiros (Cobrança) passam a somar corretamente as gravatas pronta entrega.

## Fora de escopo

- Não mexer no `ExtrasPage` (já calcula 30 corretamente no `calcPrice`).
- Não mexer na lib `recomputeOrderPrice` (já está certa).
