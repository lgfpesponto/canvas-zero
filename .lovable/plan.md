## Diagnóstico

O `PUT /orders/{id}` com `{"status":"production"}` que estamos enviando devolve **HTTP 200 silenciosamente sem mudar nada** na Bagy — por isso a Cleidiane segue "Aprovado" lá, embora a fila local marque "processado".

O caminho correto na API Dooca/Bagy é o **workflow de fulfillment**:

| Avanço pretendido | Endpoint correto |
|---|---|
| Em Produção / Separado (passo 2) | `POST /orders/{id}/fulfillment` (cria status `attended`) |
| Faturado | `PUT /orders/{id}/fulfillment/invoiced` + `{nfe_number, nfe_series, nfe_token}` |
| Despachado | `PUT /orders/{id}/fulfillment/shipped` + `{shipping_code, ...}` |
| Entregue | `PUT /orders/{id}/fulfillment/delivered` |
| Cancelado | `PUT /orders/{id}` com `{"status":"canceled"}` |

Na Bagy/Dooca "Em Produção" e "Separado" são o **mesmo** estado de fulfillment (`attended`) — a Bagy só muda o rótulo no painel dela conforme a origem do produto. Internamente nosso `status_bagy` segue `production` / `separated` para os filtros locais.

## O que vou fazer

### 1. Corrigir `bagy-queue-drain` para usar fulfillment
- `production` ou `separated` → `POST /orders/{id}/fulfillment` (idempotente: se já existe fulfillment, trata como sucesso).
- `invoiced` → `PUT /orders/{id}/fulfillment/invoiced` com NF da própria linha da fila.
- `shipped` → `PUT /orders/{id}/fulfillment/shipped` com `shipping_code`/`tracking_url`.
- `delivered` → `PUT /orders/{id}/fulfillment/delivered`.
- `canceled` → `PUT /orders/{id}` com `{status:"canceled"}`.
- Grava erros na coluna correta `ultimo_erro` (estava tentando `erro`, que não existe — por isso nenhum erro aparecia).

### 2. Corrigir `bagy-status-push` (botão "Atualizar na Bagy")
Mesma lógica. Mantém o auto-promote para `shipped`/`invoiced` quando há tracking/NF.

### 3. Reenfileirar a Cleidiane
Re-enfileirar `production` e rodar o drain corrigido. Conferir no painel Bagy.

### 4. Backfill dos pedidos antigos da Bagy (com ou sem SKU mapeado)

Nova edge function `bagy-backfill-ativos`:
- Lista da Bagy via `GET /orders` paginado, filtrando os **ativos no giro** — `payment_status=approved` e `fulfillment_status` ≠ `invoiced`/`shipped`/`delivered`, e `status` ≠ `canceled`/`archived`.
- Para cada pedido:
  - Faz upsert em `bagy_pedidos` + `bagy_pedido_itens` reutilizando a rotina do webhook.
  - Tenta linkar a um pedido do portal pelo `numero` (`RC-<bagy_code>`); se existir, grava `bagy_pedidos.order_id_portal` e `orders.bagy_order_id`.
  - **Mesmo sem SKU mapeado**, marca local `status_bagy='production'` (ou `'separated'` se for produto de pronta entrega) e `situacao_interna='pedido_criado'` — o que importa é refletir que já está no giro.
  - Enfileira `production`/`separated` em `bagy_status_sync_queue` para o drain corrigido empurrar pra Bagy.
- Botão "Importar pedidos ativos da Bagy" na página `/rancho-chique/pedidos` (admin_master/admin_producao) chama a função e mostra contagem.

### 5. Sem alterações no frontend além do botão
O auto-drain a cada montagem da página e após geração de ficha já existe.

## Detalhes técnicos

- `bagy-queue-drain` lê `tracking_code`, `tracking_url`, `nf_numero` direto da linha da fila.
- "Fulfillment já existe" detectado por HTTP 422/409 ou texto "already" → tratado como sucesso idempotente.
- `bagy-backfill-ativos` requer role `admin_master` ou `admin_producao` (mesmo padrão do `bagy-status-push`).

## Fora de escopo
- Mapeamento de SKU dos pedidos "SEM MAPEAMENTO".
- Geração de NF / etiqueta.
