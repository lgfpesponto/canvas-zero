Diagnóstico encontrado:
- O webhook da Bagy chegou corretamente e retornou 200.
- O item do pedido veio sem `sku` e sem `reference` no payload da Bagy; veio apenas `product_id` e `variation_id`. Por isso o portal gravou os itens como `sem_mapeamento` e não baixou o estoque local.
- A tentativa de atualização manual gerou fila pendente no portal, mas a chamada automática para `bagy-stock-sync` ficou/voltou como 401 em algumas execuções; o item mais recente continua pendente sem ser enviado.
- O SKU pode estar certo dentro da Bagy, mas o webhook não está entregando esse SKU no pedido. Então o portal precisa resolver melhor o SKU usando `variation_id/product_id` pela API Bagy e registrar logs mais claros.

Plano de correção:
1. Melhorar o `bagy-webhook`
   - Quando o item vier sem `sku/reference`, buscar o SKU na API da Bagy usando `variation_id` e `product_id`.
   - Tornar a leitura mais tolerante aos formatos da Bagy (`data`, `data.items`, `data.variations`, `result`, campos `sku`, `reference`, `code`).
   - Registrar no log quando a resolução de SKU falhar, incluindo `variation_id/product_id`, sem depender de screenshots.

2. Corrigir o disparo da sincronização manual
   - Ajustar as chamadas frontend que hoje chamam `bagy-stock-sync` com corpo vazio para enviarem o produto específico quando possível.
   - No botão/ajuste manual, chamar `retry_produto_id` para reenfileirar e drenar exatamente o SKU alterado.
   - Manter autorização para ações privilegiadas, mas evitar que uma chamada vazia falhe silenciosamente e deixe fila pendente.

3. Melhorar `bagy-stock-sync`
   - Adicionar logs por SKU mostrando: SKU processado, saldo enviado, `variation_id` usado, endpoint de busca/PUT e erro HTTP da Bagy quando houver.
   - Se o `bagy_variation_id` cacheado estiver errado ou o PUT falhar com 404, limpar o cache e tentar redescobrir pelo SKU antes de desistir.
   - Marcar corretamente produto e fila como `ok`, `erro` ou `nao_encontrado_na_bagy`.

4. Preservar diagnóstico
   - Alterar a relação da fila `bagy_stock_sync_queue` para não apagar o histórico automaticamente quando um produto de estoque for excluído, preservando erro/SKU/saldo para auditoria.

5. Validar com teste real
   - Reprocessar o pedido/webhook recente ou simular o mesmo payload salvo.
   - Rodar `bagy-stock-sync` para o produto pendente.
   - Conferir no banco e nos logs se o produto ficou `ok` e se o saldo enviado para Bagy foi o saldo atual do portal.

Resultado esperado:
- Compra na Bagy com produto de SKU correspondente baixa o estoque no portal.
- Ajuste manual no portal envia o novo saldo para a Bagy.
- Se falhar, o card do produto e os logs mostram exatamente se foi token, endpoint, SKU não encontrado, `variation_id` inválido ou resposta recusada pela Bagy.