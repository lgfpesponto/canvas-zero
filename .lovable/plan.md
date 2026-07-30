## Objetivo
Atualizar o `BAGY_API_TOKEN` com o novo token informado e revalidar a sincronização de estoque.

## Passos
1. Gravar o novo token no secret `BAGY_API_TOKEN` (substituindo o anterior).
2. Rebind dos secrets e redeploy das edge functions que usam o token: `bagy-stock-sync`, `bagy-webhook`, `bagy-status-push`, `bagy-stock-reconcile`.
3. Disparar a sincronização e conferir a fila `bagy_stock_sync_queue`: confirmar que os itens com `ultimo_erro` HTTP 401 passam a processar com sucesso.
4. Reportar quantos SKUs voltaram ao status `ok` e se sobrou algum erro diferente de 401.

## Observação de segurança
Esse token foi colado no chat, então ele fica registrado no histórico. Depois que a sincronização estiver ok, recomendo resetar mais uma vez na Bagy e me avisar — nesse caso eu peço o valor por um campo de secret seguro, sem passar pelo chat.
