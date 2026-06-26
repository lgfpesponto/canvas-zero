## Diagnóstico

Por que clicar "atualizar na Bagy" não fez nada na Cleidiane:

- O `bagy-status-push` decide o `target_status` a partir de `orders.status` via `mapPortalStatusToBagy`. O pedido da Cleidiane está em **"Em aberto"**, que **não é mapeado**, então a função grava `bagy_last_sync_error="Status \"Em aberto\" sem mapeamento Bagy"` e não envia nada.
- A `bagy_status_sync_queue` (onde o trigger enfileira `production`) **nunca é drenada** — não existe job/edge function que processe essa fila. A fila hoje é só log.

## Plano

### 1. Trigger detecta tipo de pedido

`bagy_link_orders_after_save` (criado na migration anterior): em vez de sempre enfileirar `production`, decidir:

- `separated` se o pedido é de pronta entrega — `tipo_extra='bota_pronta_entrega'` **e** `extra_detalhes->>'origem_estoque'='true'`.
- `production` caso contrário (ficha).

### 2. Nova edge function `bagy-queue-drain`

Drena `bagy_status_sync_queue` (rows com `processado_em IS NULL`):

- Para cada linha: chama Bagy `PUT /orders/{bagy_order_id}` com `{status: target_status}` (`production` / `separated` / etc.) usando o `BAGY_API_TOKEN`.
- Sucesso → marca `processado_em=now()`, `tentativas+=1`, atualiza `orders.bagy_last_sync_at/status/error=null` para o `orders` cujo `bagy_order_id` bate.
- Erro → grava `erro` na linha, `tentativas+=1`, `processado_em` continua null (até 5 tentativas; depois marca processado pra parar).
- `verify_jwt=false`, autenticação por chave de serviço internamente (faz queries com `SERVICE_ROLE`), aceita POST sem body ou com `{limit: 50}`.

### 3. Disparos automáticos da drenagem

- **Frontend `RanchoChiquePedidosPage`**: ao carregar a página e logo após `confirmOrder` do `OrderPage`/`BagyFichaDialog`, invocar `supabase.functions.invoke('bagy-queue-drain')` (silencioso) — assim o efeito visual de "Aprovado → Em Produção" acontece sem ação manual.
- **Trigger**: após `INSERT` na fila, disparar `pg_net.http_post` para `bagy-queue-drain` (best effort — se `pg_net` não estiver disponível, o frontend já cobre).

### 4. UI

- Remover o texto `Bagy: agora` da linha (linha ~494-498 de `RanchoChiquePedidosPage.tsx`). Manter apenas o badge `ERRO BAGY` (com tooltip) quando houver erro.

### 5. Cleidiane (data fix imediato)

A fila já tem `(50012748, production)` pendente. Após implantar `bagy-queue-drain`, chamar uma vez via tool curl pra empurrar agora e confirmar que vira "Em Produção" na Bagy.

## Detalhes técnicos

- Nova função: `supabase/functions/bagy-queue-drain/index.ts` (Deno, usa `SUPABASE_SERVICE_ROLE_KEY` e `BAGY_API_TOKEN`).
- Migration: recria `bagy_link_orders_after_save` com lógica `separated` vs `production`; tenta adicionar trigger `AFTER INSERT ON bagy_status_sync_queue` que faz `pg_net.http_post` (envolve em `BEGIN...EXCEPTION WHEN OTHERS THEN NULL END` para não quebrar caso `pg_net` não esteja habilitado).
- Edit `RanchoChiquePedidosPage.tsx`: chamar `invoke('bagy-queue-drain')` no `useEffect` de mount e dentro do `onFinished` do `BagyFichaDialog`; remover a label "Bagy: …".
- Edit `OrderPage.tsx` (pós-save Bagy): após setar `bagy_order_id`, chamar `invoke('bagy-queue-drain')` (silencioso) para empurrar imediatamente.

## Fora de escopo

- Reescrever `bagy-status-push` (continua disponível para sync manual baseado em status do portal).
- Mapeamento de SKU, NF, etiqueta.