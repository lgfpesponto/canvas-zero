## Objetivo

`orders.preco` passa a ser **a única fonte de verdade**, sempre coerente com a última alteração — seja edição manual do pedido, aplicação de desconto/acréscimo, ou mudança em uma regra global (ex.: admin reajusta preço de um bordado). Sem recálculo contínuo no cliente, sem fila passiva, sem drenador rodando em background.

## Princípio

> Preço só é recalculado **no momento exato em que algo muda**. Depois disso, é só leitura. Pedidos, relatórios, PDFs e financeiro leem `orders.preco` direto, sem nunca recalcular na hora.

## Os 3 gatilhos de recálculo (e só esses)

### 1. Edição do próprio pedido
Quando o pedido é criado, editado, recebe desconto/acréscimo, ou tem qualquer campo da composição alterado:
- O frontend calcula o total final usando `computeTotalToSave` (já existe).
- Grava em `orders.preco` na mesma transação do save.
- Marca `preco_regra_versao = <versão atual da régua>`.

Isso já acontece hoje — vamos só garantir 100% dos caminhos (criação, edição, desconto, mudança de quantidade, troca de bordado, etc.).

### 2. Mudança em uma regra global de preço
Quando o admin altera um preço em `ficha_variacoes` (ex.: bordado "Cruz" passa de R$ 80 para R$ 90) ou em `custom_options`:
- Um trigger no banco incrementa `system_flags.preco_regra_versao` (número global, ex.: 47 → 48).
- Marca todos os pedidos afetados (que usam aquela variação) com `preco_regra_versao = NULL` ou `< 48`.
- **Um job de reconciliação** roda automaticamente (descrito abaixo) e regrava o `preco` desses pedidos específicos.

### 3. Mudança em uma constante hardcoded do código (raro)
Quando você mudar `STRASS_PRECO` ou `getCorSolaPrecoContextual` no código:
- O deploy bumpa um **número de versão de código** (`CODE_PRICE_RULES_VERSION` em `recomputeOrderPrice.ts`).
- O job de reconciliação trata pedidos com versão antiga e regrava.

## Substituindo o `preco_migrado_v2` (boolean) por `preco_regra_versao` (número)

```text
ANTES: preco_migrado_v2 = true/false  (binário, não detecta mudança nova)
DEPOIS: preco_regra_versao = 48       (sabe exatamente quando ficou desatualizado)
```

Vantagens:
- Mudou bordado X de preço → bumpa versão → todos os pedidos com versão antiga viram candidatos automáticos.
- Um pedido recém-salvo já nasce com a versão atual — nunca entra na fila à toa.
- Auditável: dá pra ver "esse pedido foi calculado com a régua versão 47, e agora estamos na 48 — por isso ele será reconciliado".

## Onde o recálculo acontece

**Não no cliente.** Não em background no browser. Não toda vez que alguém loga.

Em vez disso:
- **Edge Function `reconciliar-precos`** (Supabase) que roda só quando necessário:
  - Disparada por trigger SQL quando uma regra muda (via `pg_net` ou pg_cron).
  - Ou por botão manual no admin (mantém o `RecalcPrecosRunner` como fallback).
- Processa os pedidos em lote no servidor, sem depender de nenhum usuário estar logado.
- Usa exatamente a mesma função `computeTotalToSave` (porta para Deno, ou expõe via RPC SQL).

## Arquitetura final

```text
┌──────────────────────────────────────────────────────────────┐
│ EDIÇÃO DE PEDIDO                                             │
│   save() → computeTotalToSave() → UPDATE preco, regra_versao │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ ADMIN MUDA PREÇO DE UMA VARIAÇÃO                             │
│   UPDATE ficha_variacoes SET preco_adicional = X             │
│         ↓ trigger                                            │
│   bump system_flags.preco_regra_versao                       │
│         ↓                                                    │
│   marca pedidos afetados (preco_regra_versao = NULL)         │
│         ↓ pg_net invoca                                      │
│   edge function reconciliar-precos roda em lote no servidor  │
│         ↓                                                    │
│   UPDATE orders SET preco = recalc, regra_versao = atual     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ LEITURA (listagens, PDFs, financeiro, dashboard)             │
│   SELECT preco FROM orders   ← ponto final, sem cálculo      │
└──────────────────────────────────────────────────────────────┘
```

## O que sai do projeto

- `src/components/PrecoAutoBackfill.tsx` — drenador global automático (não precisa mais)
- `src/lib/precoBackfillQueue.ts` — fila passiva client-side
- `src/hooks/usePrecoBackfillBackground.ts` — plug em telas
- `src/lib/recomputePricesBatch.ts` — recompute antes do PDF (vira desnecessário)
- Auto-correção do `OrderDetailPage` ao abrir (vira desnecessária)

`RecalcPrecosRunner` continua existindo só como botão de emergência admin.

## O que entra

```text
Banco:
  - coluna orders.preco_regra_versao integer
  - tabela system_flags row 'preco_regra_versao' (contador global)
  - trigger em ficha_variacoes / custom_options que bumpa versão e marca pedidos
  - função SQL identificar_pedidos_afetados(variacao_id) — quais pedidos usam aquela variação
  - chamada pg_net pra invocar edge function

Edge function:
  - supabase/functions/reconciliar-precos/index.ts
  - lê pedidos com regra_versao desatualizada, recalcula e grava
  - paginado, idempotente

Frontend:
  - save de pedido: garantir que SEMPRE grava preco + regra_versao
  - remover plugs de backfill listados acima
  - admin de variações: ao salvar, mostra toast "X pedidos serão reconciliados em segundo plano"
```

## Migração inicial (one-shot)

1. Roda a edge function uma vez sobre TODOS os pedidos existentes para popular `preco` corretamente e setar `preco_regra_versao = 1`.
2. A partir daí, o fluxo automático toma conta.

## Detalhes técnicos

- **Identificar pedidos afetados por mudança em variação**: matching por nome + categoria nos campos `bordado_cano`, `couro_gaspea`, etc. Função SQL faz `WHERE bordado_cano LIKE '%nome%' OR ...`.
- **Edge function em Deno**: precisa portar `recomputeOrderPrice.ts` (TS puro, sem deps do React) — roda igual no Deno.
- **Idempotência**: edge function só atualiza se `regra_versao < atual`. Se rodar 2x, segunda vez é no-op.
- **Performance**: lote de 500 pedidos por invocação, paginação por cursor.
- **Constantes hardcoded**: bumpar `CODE_PRICE_RULES_VERSION` manualmente quando alterar preço no código — disciplina simples.

## Resultado

- Zero recálculo durante uso normal do portal.
- Admin muda preço de bordado → segundos depois, todos os pedidos relevantes já estão com preço novo.
- Relatório de Cobrança da Denise: o número que aparece é o que foi salvo na última alteração do pedido. Se bate ou não com a conta manual, é uma questão de auditoria pontual — não de "o sistema está sempre desatualizado".
- Carga de leitura (PDFs, dashboard) fica trivialmente rápida.
