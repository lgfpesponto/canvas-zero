# Bug: Gravata Pronta Entrega aparece com R$ 0,00

## Diagnóstico

Confirmei no banco que pedidos recentes de **Gravata Pronta Entrega** (30131, 30132, 30133) estão com `preco = 0`, enquanto o 30134 está com `preco = 30`. Todos têm `preco_regra_versao = 11` (já reconciliados) e `preco_congelado = false`.

Causa raiz: o `computeExtraTotal` da **edge function `supabase/functions/reconciliar-precos/index.ts`** (linhas 301–339) está incompleto. O `switch` inclui `gravata_country` mas **não** `gravata_pronta_entrega` nem `regata_pronta_entrega`. Como o reconciliador roda em background depois do insert, ele lê o pedido, cai no `default` (retorna 0) e sobrescreve o `preco` do banco com 0.

O frontend (`src/lib/recomputeOrderPrice.ts`) está correto — tem os dois cases retornando R$ 30 e R$ 50. A divergência é só na edge function.

## Plano

1. **Adicionar os cases faltantes** em `supabase/functions/reconciliar-precos/index.ts` (espelhar exatamente o frontend):
   - `case 'gravata_pronta_entrega': t += 30; break;`
   - `case 'regata_pronta_entrega': t += 50; break;`

2. **Migration de reparo** — recalcular `preco` dos pedidos já zerados pelo bug:
   ```sql
   UPDATE public.orders
   SET preco = 30, preco_regra_versao = NULL
   WHERE tipo_extra = 'gravata_pronta_entrega' AND preco = 0;

   UPDATE public.orders
   SET preco = 50, preco_regra_versao = NULL
   WHERE tipo_extra = 'regata_pronta_entrega' AND preco = 0;
   ```
   Zerar `preco_regra_versao` força o reconciliador (já corrigido) a revisitar e confirmar.

3. **Validar**: após deploy, conferir `SELECT numero, preco FROM orders WHERE numero IN ('30131','30132','30133','30134')` — todos devem ficar em 30.

## Escopo

- Arquivos: `supabase/functions/reconciliar-precos/index.ts` + 1 migration.
- Sem mudanças de UI. Sem mexer em `recomputeOrderPrice.ts` (já está certo).
