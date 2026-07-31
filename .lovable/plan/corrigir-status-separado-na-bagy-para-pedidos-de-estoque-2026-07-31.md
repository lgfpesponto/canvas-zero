# Corrigir status "Separado" na Bagy para pedidos de estoque

## O que está acontecendo (verificado)

Quando um pedido de estoque entra pelo webhook da Bagy, o portal grava corretamente uma linha na fila `bagy_status_sync_queue` com `target_status = "separated"` — isso está funcionando (há linhas de hoje, 31/07, para o pedido 50336544 com `processado_em` vazio).

O problema é que **ninguém drena essa fila automaticamente**:

- O cron `bagy-status-push-every-minute` chama a função `bagy-status-push` enviando só `apikey` (anon), **sem header `Authorization`**. A função exige usuário logado e responde **401 Unauthorized** — é exatamente o erro 401 que aparece nos logs. Ou seja, o cron falha todo minuto há tempos.
- Além disso, essa função nem lê a fila: ela só processa `order_ids` enviados no corpo. O corpo do cron é `{}`, então ela sempre retornaria "order_ids vazio".
- Existe a função certa para o trabalho — `bagy-queue-drain`, que lê `bagy_status_sync_queue` pendente e faz o POST de fulfillment (Separado) na Bagy — mas ela **não é chamada por nenhum cron e nem pelo webhook**, e não está declarada em `supabase/config.toml`.

Resultado: o "Separado" só chega na Bagy quando alguém clica manualmente no botão de sincronizar no portal (por isso os `processado_em` batem com horários avulsos).

## O que será feito

1. **Proteger e habilitar `bagy-queue-drain`**
   - Aceitar chamadas de cron via header `x-cron-secret` (mesmo padrão já usado por `bagy-stock-sync` / `bagy-stock-reconcile`) ou via service role; sem isso, negar.
   - Declarar `[functions.bagy-queue-drain] verify_jwt = false` no `config.toml` e fazer o deploy.

2. **Trocar o cron**
   - Remover/atualizar o job `bagy-status-push-every-minute` para chamar `bagy-queue-drain` a cada minuto, com `x-cron-secret` vindo de `internal_config` (igual aos outros jobs). Assim a fila passa a ser drenada sozinha.

3. **Empurrar na hora da criação**
   - No `bagy-webhook`, logo após enfileirar o `separated`, disparar `bagy-queue-drain` (chamada service-role, sem bloquear o webhook em caso de erro) — o mesmo padrão já usado para `bagy-stock-sync`. Assim o pedido vira "Separado" na Bagy em segundos, sem esperar o cron.

4. **Reprocessar o pendente**
   - Rodar a drenagem uma vez para o que está preso hoje (pedido 50336544 e qualquer outro com `processado_em` nulo) e conferir na Bagy que ficou "Separado".

## Detalhes técnicos

- Arquivos: `supabase/functions/bagy-queue-drain/index.ts` (auth por cron secret), `supabase/functions/bagy-webhook/index.ts` (disparo pós-enfileiramento), `supabase/config.toml` (verify_jwt).
- Migração: atualizar o job pg_cron (`cron.unschedule` do job 1 + `cron.schedule` novo apontando para `bagy-queue-drain`).
- A dedupe da Bagy continua garantida: o POST de fulfillment é idempotente (409/422 tratados como "já existe") e a fila marca `processado_em` com limite de 5 tentativas.
- Nenhuma mudança na lógica de baixa de estoque ou de preços.
