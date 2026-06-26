## Problema

1. **Pedido novo (17824773741752 / bagy_order_id 50013262) sumiu**: chegaram dois webhooks (`order.approved` e `order.created`) mas o `payload.status` veio `null` e `payment_status` `null`. O webhook rejeitou com `status_nao_aprovado:open` e o pedido nem foi gravado em `bagy_pedidos`. Quando o webhook seguinte de aprovação chegar (com status preenchido), também não vai aparecer porque nunca foi salvo o registro inicial.

2. **Cleidiane (50012748) com SKU correto não casa**: o item tem `sku=CLEIDIANE-39` e existe o template rascunho com `tamanhos_skus=[{tamanho:"39", sku:"CLEIDIANE-39"}]`. O SQL `@>` casa, mas o `.contains()` do supabase-js no edge function não está achando — provavelmente por como o PostgREST recebe o array. Resultado: item fica `sem_mapeamento`.

3. **Política atual** "só salvar se aprovado" deixa pedidos invisíveis enquanto não viram aprovados. O usuário quer que **todos** entrem e sejam atualizados conforme mudam de status, com as ações (baixa de estoque, criar pedido portal, enfileirar separated) só disparando quando vira aprovado.

## Plano (Fase 20)

### 1. `supabase/functions/bagy-webhook/index.ts` — sempre ingerir, agir só se aprovado

- Remover o early-return `status_nao_aprovado`. Em vez disso:
  - **Sempre** fazer upsert em `bagy_pedidos` com o `status_bagy` atual (mesmo `open`, `pending`, `cancelled`, etc.), atualizando `status_bagy_anterior` para detectar transição.
  - **Sempre** regravar `bagy_pedido_itens` com a classificação (sku, tamanho, template_id, estoque_produto_id, status).
  - Calcular `isApproved` igual hoje (status logístico aprovado OU payment_status aprovado OU evento em `APPROVED_EVENTS`).
  - Só rodar o bloco "criar pedido portal + comprar estoque + enfileirar separated" quando `isApproved` e `!pedidoExistente?.order_id_portal` (continua sendo `isFirstTimeApproved`).
  - Quando o pedido já existia como não-aprovado e agora chegou aprovado, esse mesmo caminho roda naturalmente (porque `order_id_portal` ainda é null).
- Definir `flag` mesmo nos não-aprovados: `aguardando_aprovacao` quando `!isApproved`, mantendo `aguardando_mapeamento` / `aguardando_ficha` / `pedido_criado` quando aprovado.
- Manter o log incoming + processed do `bagy_webhook_log` para todos.

### 2. Corrigir match de SKU em template (`tamanhos_skus`)

Substituir o `.contains("tamanhos_skus", [{ sku: skuPattern }])` (que não está acertando) por uma RPC determinística:

- Criar função `public.find_template_by_sku(_sku text)` (security definer) que faz:
  ```sql
  SELECT id FROM public.order_templates
  WHERE sku ILIKE _sku
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements(COALESCE(tamanhos_skus,'[]'::jsonb)) e
       WHERE lower(e->>'sku') = lower(_sku)
     )
  LIMIT 1;
  ```
  Grant EXECUTE para `service_role` (e `authenticated` se útil).
- No webhook, trocar as duas tentativas (root + contains) por uma única chamada `supabase.rpc('find_template_by_sku', { _sku: skuRaw })`.

### 3. Auto-reprocesso quando vira aprovado

Hoje, se a Bagy mandar primeiro `order.created` (status=open) e depois `order.approved`, o segundo webhook entra normal e roda o caminho aprovado. Com a mudança do item 1 isso passa a funcionar de ponta a ponta automaticamente: o `order.created` cria a linha em `bagy_pedidos` com `flag=aguardando_aprovacao`, e o `order.approved` seguinte (idempotência por payload_hash não bloqueia porque o hash é diferente) detecta `order_id_portal=null` + `isApproved=true` e cria o pedido portal.

Pequeno ajuste: também tratar o caso "o segundo webhook é idêntico ao primeiro mas o status mudou na Bagy" enfileirando um refetch via `bagy-reprocess` quando detectarmos `status_bagy_anterior != status_bagy` e `isApproved && !order_id_portal`. (Na prática a Bagy manda payloads diferentes, então o caminho normal já cobre.)

### 4. Reprocessar pedidos perdidos / travados

- Disparar `bagy-reprocess` com `webhook_log_ids` para os 4 logs `order.approved`/`order.created` do pedido **50013262** (Texana Florência) que foram rejeitados.
- Disparar `bagy-reprocess` para **50012748** (Cleidiane) depois do deploy, para reaplicar o match de template via nova RPC e gerar o pedido portal.

### 5. UI `PedidosBagyPage` — banner

Adicionar contagem de pedidos com `flag='aguardando_aprovacao'` no banner amarelo (texto: "X pedido(s) aguardando aprovação da Bagy — sem ação necessária, virá automaticamente."). Filtro existente de status continua funcionando.

## Fora do escopo

- Mexer em `bagy-stock-sync`, em `comprar_estoque_bagy`, nas RLS de `bagy_pedidos`/`bagy_pedido_itens` ou em qualquer regra de negócio de produção.
- Reverter estoque automaticamente em cancelamento (segue manual, como hoje).

## Validação após deploy

1. Confirmar que o pedido **17824773741752** aparece em `/rancho-chique/pedidos` com status correto.
2. Confirmar que o pedido **Cleidiane** sai de `aguardando_mapeamento` e vira `pedido_criado` (ou `aguardando_ficha` se SKU não estiver no estoque), com `order_id_portal` preenchido.
3. Inspecionar `bagy_webhook_log` para garantir que nenhum log novo tem `erro: status_nao_aprovado`.