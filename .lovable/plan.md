# Plano: Recortes na composição/espelho + Fim do "preço congelado" + Ajuste Florência

## 1. Mostrar Recortes na Composição e no Espelho

Hoje o valor dos recortes (ficha_variacoes em `recorte_cano/gaspea/taloneira`) entra no **total** do pedido, mas não aparece como linha na Composição do Pedido nem no Espelho da Ficha.

- **`src/pages/OrderDetailPage.tsx`** (priceItems da Composição): adicionar 3 linhas após Glitter/Laser, usando `findFichaPrice('recorte_cano', recorteCano)` etc., exibindo `"Recorte Cano: <nome>"` quando preço > 0.
- **`src/pages/OrderPage.tsx`** (mirrorPriceItems do Espelho): mesmas 3 linhas usando `findPrice(..., 'recorte_cano', [])`.
- **`src/pages/OrderPage.tsx`** (mirrorGrouped, categoria "Laser e Recortes"): incluir labels `Recorte Cano/Gáspea/Taloneira` + `Cor do Recorte`.

Nenhuma mudança no cálculo do total — só exibição.

## 2. Ajuste de R$5 nos pedidos antigos com Florência (cano)

A virada Florência R$25 → R$30 foi em **19/05/2026**. Pedidos com `bordado_cano = 'Florência'` criados **antes** dessa data ficarão com `desconto = 5` e justificativa registrada, para que o total final caia em R$5 e fique alinhado com o que seria o preço novo.

Migration:
- Atualiza `orders` onde:
  - `bordado_cano = 'Florência'`
  - `data_criacao < '2026-05-19'`
  - `COALESCE(desconto, 0) = 0` (não sobrescreve descontos existentes)
  - `status <> 'Cancelado'`
- Seta `desconto = 5`, `desconto_justificativa = 'Preço da Florência alterado em 19/05/2026 — ajuste de R$5'` e adiciona entrada em `alteracoes` para rastreabilidade.

## 3. Fim do sistema "Preço Congelado"

Hoje pedidos têm `preco_congelado = true` por padrão, o que impede o recompute automático quando regras mudam — gerando inconsistência entre Composição (regras atuais) e Total/Relatório (preço travado).

Mudanças:
- **Migration**:
  - `UPDATE orders SET preco_congelado = false` em todos os pedidos não cancelados.
  - `ALTER COLUMN preco_congelado SET DEFAULT false`.
  - Marcar `preco_regra_versao = NULL` em todos pedidos descongelados para entrar na fila de reconciliação.
- **Código**: remover badge/aviso "Preço congelado de R$X" da Composição (OrderDetailPage), tirar o gate `if (preco_congelado) return` do trigger `trg_orders_estorno_baixa_on_value_change` (DB) e do `recomputePricesBatch` / `recomputeOrderPrice` no client. Remover botões/toggle de congelar.
- Coluna **permanece no schema** (segurança/auditoria), mas inerte.

## 4. Detalhes técnicos

```text
Arquivos tocados (código):
  src/pages/OrderDetailPage.tsx   — priceItems + remover badge "preço congelado"
  src/pages/OrderPage.tsx         — mirrorPriceItems + mirrorGrouped recortes
  src/pages/EditOrderPage.tsx     — remover lógica/UI de preco_congelado
  src/pages/EditExtrasPage.tsx    — idem
  src/pages/EditBeltPage.tsx      — idem
  src/lib/recomputeOrderPrice.ts  — remover gate preco_congelado
  src/lib/recomputePricesBatch.ts — idem
  src/lib/precoBackfillQueue.ts   — idem
  src/components/PrecoAutoBackfill.tsx — idem
  src/contexts/AuthContext.tsx    — limpar flags se houver

Migrations (2):
  1) Desconto Florência (UPDATE em orders).
  2) Descongelar pedidos + alterar DEFAULT + ajustar trigger.

Sem mudanças em RLS ou em outros relatórios.
```

## 5. Validação

- Pedido **23614** após migração: Composição deve listar todos os itens (incluindo Florência cano R$30 e Florão Trad R$5) somando R$330; subtotal R$335 − desconto R$5 = total R$330. Sem badge "preço congelado".
- Pedido **E0123614** (novo, 20/05): já está em R$310, não recebe desconto.
- Pedidos com recorte preenchido: linha do recorte aparece tanto na Composição quanto no Espelho.
