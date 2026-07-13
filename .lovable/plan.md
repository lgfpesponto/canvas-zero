## Plano: sincronização correta Estoque ↔ Bagy

### Decisão confirmada

- Manter a exclusão de produto de estoque como está: **pode apagar do banco também** (`DELETE` físico em `estoque_produtos`).
- Continuar preservando o rastro em `estoque_ajustes_log` e liberando pedidos vinculados.
- Não vou trocar para `ativo=false`.

### 1. Corrigir a fila real de sincronização com a Bagy

Hoje existem duas filas:

- `estoque_bagy_sync_pendente`: usada para mostrar o botão na tela.
- `bagy_stock_sync_queue`: fila real que a edge function `bagy-stock-sync` processa.

O problema é que o botão e a sincronização não estão totalmente alinhados. Vou padronizar o fluxo para que toda alteração importante do estoque alimente a fila real `bagy_stock_sync_queue`.

A migration vai recriar/ajustar o trigger de `estoque_produtos` para enfileirar na Bagy quando acontecer:

- Produto novo criado no estoque.
- Quantidade aumentada manualmente no portal.
- Quantidade reduzida por venda no portal.
- Quantidade reduzida por pedido importado da Bagy.
- SKU alterado em um produto existente.

O saldo enviado será sempre o saldo atual final do portal (`novo_saldo = estoque_produtos.quantidade`), usando `sku_base` exatamente igual ao SKU da Bagy.

### 2. Corrigir compra de estoque para baixar na Bagy

As RPCs que reduzem estoque já alteram `estoque_produtos.quantidade`:

- `comprar_estoque(...)`
- `comprar_estoque_bagy(...)`
- `ajustar_estoque_manual(...)`

Com o trigger corrigido, qualquer redução/aumento nessas funções vai criar ou atualizar uma entrada pendente na `bagy_stock_sync_queue`.

Resultado esperado:

- Comprou produto de estoque no portal → baixa no portal → entra na fila → baixa na Bagy pelo SKU igual.
- Entrou pedido da Bagy no portal → baixa no portal → mantém o saldo sincronizado.
- Admin adicionou estoque no portal → entra na fila → aumenta/atualiza saldo na Bagy pelo SKU igual.

### 3. Corrigir o botão “Sincronizar com Bagy”

Vou alterar `BagySyncPendingButton.tsx` para não depender só de `estoque_bagy_sync_pendente`.

O botão passará a considerar produtos ativos que estejam:

- `bagy_sync_status` vazio/nulo;
- `bagy_sync_status = 'pendente'`;
- `bagy_sync_status = 'erro'`;
- `bagy_sync_status = 'nao_encontrado_na_bagy'`;
- ou sem `bagy_sync_at`.

Ao clicar, ele vai chamar a edge function com um modo de re-sincronização de pendentes/não sincronizados, para resolver este caso:

1. Produto foi criado no portal.
2. Naquele momento o SKU ainda não existia na Bagy.
3. A Bagy retornou “SKU não encontrado”.
4. Depois o produto foi criado na Bagy com o mesmo SKU.
5. Admin clica em “Sincronizar com Bagy”.
6. A função procura novamente o SKU, encontra, salva `bagy_variation_id` e envia o saldo atual.

### 4. Ajustar a edge function `bagy-stock-sync`

Vou melhorar a função para aceitar um modo tipo `retry_unsynced`/`sync_unsynced`, que reenfileira somente produtos ativos ainda não sincronizados corretamente, sem ficar reenfileirando todos os produtos já OK.

Também vou manter:

- lookup por SKU igual;
- cache em `bagy_variation_id` quando encontrar;
- atualização de `bagy_sync_status`, `bagy_sync_erro` e `bagy_sync_at`;
- limite de lote seguro.

### 5. Evitar falso “Sincronizado com Bagy”

A tela de estoque já foi ajustada parcialmente para só mostrar como sincronizado quando:

- todos os tamanhos têm `bagy_sync_status = 'ok'`;
- e todos têm `bagy_sync_at` preenchido.

Vou manter essa regra.

### 6. Verificações

Depois da implementação, vou validar:

- se o trigger enfileira compra, criação e ajuste manual;
- se o botão aparece para itens pendentes/erro/não encontrados;
- se o botão tenta novamente SKU que antes não existia na Bagy;
- se o delete continua físico no banco;
- se a edge function não marca a fila auxiliar como sincronizada quando houve erro.

### Arquivos/recursos que serão alterados

- Migration Supabase para trigger/fila/RPCs relacionadas.
- `supabase/functions/bagy-stock-sync/index.ts`
- `src/components/estoque/BagySyncPendingButton.tsx`
- Possivelmente pequenos ajustes em `src/pages/EstoquePage.tsx` apenas se necessário para o estado visual da sincronização.
