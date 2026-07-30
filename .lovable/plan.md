## Corrigir sincronização Bagy com o novo token

**Atenção:** o token foi colado no chat, ou seja, ficou registrado no histórico da conversa. Recomendo, depois que a sincronização voltar a funcionar, resetar o token na Bagy mais uma vez e me avisar para eu atualizar pelo formulário seguro (sem colar no chat).

Passos:

1. Salvar o novo token no secret `BAGY_API_TOKEN` do projeto (valor já fornecido).
2. Republicar as funções que usam o token: `bagy-stock-sync`, `bagy-webhook`, `bagy-status-push`, `bagy-stock-reconcile`, `bagy-queue-drain`, `bagy-reprocess`.
3. Fazer uma chamada de teste em `bagy-stock-sync` e confirmar que a resposta não é mais `401 Token inválido`.
4. Reprocessar a fila pendente (`retry_unsynced`) para drenar os 59 produtos travados.
5. Conferir no banco quantos ficaram `ok` e separar os que realmente não existem na Bagy (`nao_encontrado_na_bagy`), listando esses para você cadastrar lá.

Ao final eu informo o resultado da sincronização por SKU.