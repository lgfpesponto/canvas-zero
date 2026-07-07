## Ajustes na Observação de Entrega

### 1. Editor visível só para `admin_producao`
- `src/pages/OrderDetailPage.tsx`: mudar a condição do bloco "OBSERVAÇÃO DE ENTREGA" (textarea + botão Salvar) para renderizar apenas quando `role === 'admin_producao'`.
- `admin_master` e vendedores continuam vendo somente a linha na "Composição do Pedido".

### 2. Exibir autor + data na composição
- `src/pages/OrderDetailPage.tsx`: na linha "OBSERVAÇÃO DE ENTREGA" dentro da Composição do Pedido, acrescentar `— por {observacaoEntregaPor} em {DD/MM/AAAA HH:mm}` ao lado (ou logo abaixo) do texto, formatando `observacaoEntregaEm` em pt-BR.
- Mesma info aparece para vendedores e admin_master (o admin_producao também vê, já que a composição é comum).

### 3. Registrar cada salvamento no histórico de alterações
- Migration nova ajustando a RPC `registrar_observacao_entrega`:
  - Após atualizar `orders.observacao_entrega/_por/_em`, fazer `UPDATE orders SET alteracoes = alteracoes || jsonb_build_object(...)` adicionando um item com:
    - `campo`: `'Observação de entrega'`
    - `de`: valor anterior (ou vazio)
    - `para`: novo texto
    - `por`: nome do autor (via `current_user_nome_completo()`)
    - `em`: `now()`
  - Continua inserindo em `order_notificacoes` (sino) como já faz.
- Assim cada save vira uma nova entrada em "Histórico de Alterações", preservando os anteriores.

### PDFs / Notificações
- Sem mudanças: PDFs de Expedição/Cobrança já mostram a última observação; notificações continuam pelo mesmo caminho.

### Fora de escopo
- Editar/excluir entradas antigas do histórico.
- Permitir vendedor escrever observação de entrega.
