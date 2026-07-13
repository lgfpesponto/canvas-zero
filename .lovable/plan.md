## Sincronização em tempo real — sem depender de abrir o portal

Sim, hoje já funciona **sem precisar ninguém abrir o portal**, mas com latências diferentes dependendo do caminho. Abaixo o estado atual e o que ajustar para ficar **o mais rápido possível** em todos os cenários.

### Cenários e latência atual


| Evento                                            | Como sincroniza hoje                                                                                  | Latência                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| Venda de vendedor A → afeta estoque do vendedor B | Trigger no DB enfileira em `bagy_stock_sync_queue` → worker envia PUT p/ Bagy                         | Depende do worker (ver abaixo) |
| Venda no site Bagy → baixa estoque do Portal      | Webhook Bagy → função `bagy-webhook` baixa via `comprar_estoque_bagy` com `skip_bagy_push` (não ecoa) | Segundos                       |
| Ajuste manual de estoque (admin)                  | Trigger enfileira → worker envia p/ Bagy                                                              | Depende do worker              |
| Divergência silenciosa (drift)                    | Cron `bagy-stock-reconcile` a cada 15 min                                                             | Até 15 min                     |


Tudo roda **server-side** (triggers do Postgres + edge functions + cron `pg_cron`). Ninguém precisa ter o portal aberto.

### Gargalo atual: o "worker" da fila

Hoje quando uma venda muda estoque, a linha entra em `bagy_stock_sync_queue`, mas o **envio pra Bagy** só acontece quando:

- alguém abre a tela de Gestão e clica algo que dispara o worker, **ou**
- o cron roda.

Preciso confirmar isso lendo o código do worker, mas se for esse o caso a "venda de A afeta B" só chega na Bagy no próximo tick do cron — não é instantâneo.

### O que fazer para ficar quase instantâneo

1. **Trigger → dispara edge function imediatamente**
  Trocar (ou somar a) enfileiramento por um `pg_net.http_post` direto dentro do trigger `enfileirar_bagy_stock_sync`, chamando uma edge function `bagy-stock-push` que faz o PUT na Bagy na hora. A fila continua existindo como fallback/retry.
  - Resultado: venda de A afeta B → Bagy em **1–3 segundos**.
2. **Cron do worker da fila a cada 1 minuto** (rede de segurança)
  Já temos `pg_cron`. Adicionar job de 1 min que processa qualquer item que ficou pendente (falha de rede, retry). Hoje reconcile é 15 min — mantemos os 15 min só pra drift real (comparar saldos), e criamos um novo de 1 min só pra **drenar a fila**.
3. **Reconcile de 15 min continua** como está — é a rede de segurança final contra qualquer divergência que escape.
4. **Webhook Bagy → Portal** já é instantâneo, não muda.

### Resumo dos SLAs após ajuste

- Venda / ajuste no Portal → Bagy: **~2 s** (via `pg_net` no trigger) + fallback 1 min + reconcile 15 min
- Venda na Bagy → Portal: **~1 s** (webhook, já existe)
- Nenhum caminho depende de alguém ter o portal aberto.

### Detalhes técnicos

- Nova edge function `bagy-stock-push` (single-item, idempotente): recebe `{sku, saldo}`, faz PUT em `/variations/{id}/stocks` da Bagy, marca item da fila como `sent`.
- Trigger `enfileirar_bagy_stock_sync` passa a: (a) inserir na fila, (b) `perform net.http_post(...)` chamando `bagy-stock-push` com `x-cron-secret`.
- Novo cron `bagy-stock-queue-drain-1min` chama `bagy-stock-push` em modo "drena fila" pra pegar retries.
- Antes de codar preciso ler o worker atual (`supabase/functions/bagy-stock-*`) pra confirmar exatamente onde plugar e não duplicar envio.

Aprova esse caminho? Quando confirmar, saio do plano e implemento.