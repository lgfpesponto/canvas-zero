## Fix: Bagy webhook respondendo 401 antes de entrar na função

### Diagnóstico

- `bagy_webhook_log` vazio e `bagy_pedidos` zero → nenhuma chamada da Bagy chegou no handler.
- Logs da edge `bagy-webhook` só mostram `boot`, nenhuma execução.
- Teste `POST /functions/v1/bagy-webhook` sem header `Authorization` → `401 {"error":"invalid_token"}`.
- A Bagy não manda `Authorization` (autentica via `?token=...` na query), então toda chamada dela está sendo barrada pelo gateway do Supabase antes de virar request da função. Resultado: webhook configurado certinho na Bagy, mas nada cai aqui.
- O `supabase/config.toml` já tem `verify_jwt = false`, só que o deploy atual não está honrando isso — provavelmente porque a função foi deployada antes de o flag ter sido salvo, ou o config não foi reaplicado.

### O que vou fazer

1. **Redeployar `bagy-webhook` e `bagy-webhook-info`** forçando a aplicação do `verify_jwt=false`. (Os dois precisam, porque o `info` também é chamado do front sem necessariamente passar JWT em alguns paths.)
2. **Testar de novo via curl sem Authorization** → esperar `400/200` (resposta da própria função, não mais 401 do gateway).
3. **Pedir pra Bagy reenviar o pedido** (geralmente o painel tem "Reenviar webhook" no histórico do pedido; senão, basta mudar o status do pedido pra qualquer outro e voltar — isso costuma redisparar).
4. **Confirmar no portal** que o pedido apareceu em `/rancho-chique/pedidos` e em `bagy_webhook_log`.

### Sem mudança de código

Só redeploy + teste. Se mesmo após o redeploy o 401 persistir, aí vou:
- Adicionar verificação `verify_jwt=false` explícita também via metadata da função (algumas versões do Supabase exigem que esteja na seção certa do toml).
- Como fallback, mudar a função pra aceitar a chamada Bagy via header customizado e divulgar a nova URL.

### Mensagem final pra você

Quando terminar te aviso o resultado do curl. Se voltar 200/400 (não 401), você reenvia o pedido na Bagy e ele aparece aqui.
