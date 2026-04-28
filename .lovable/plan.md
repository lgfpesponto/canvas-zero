## Notificar vendedor em TODA alteração do pedido

Hoje o sino só notifica o vendedor quando o pedido já está em **Entregue**, **Cobrado** ou **Pago**. A pedido, vamos passar a notificar **qualquer alteração**, em qualquer status (exceto criação inicial e mudanças feitas pelo próprio vendedor).

### O que muda

**1. Backend (RPC `registrar_alteracoes_pos_entrega`)**
- Remover o filtro que bloqueia status diferentes de Entregue/Cobrado/Pago.
- Manter as outras proteções:
  - Pedido precisa ter vendedor válido (não vazio, não "Estoque").
  - Não notifica o próprio autor da alteração: se `auth.uid()` for o user_id do vendedor do pedido, não insere (evita o vendedor receber notificação das próprias edições).
- Renomear conceitualmente (mantendo o nome da função pra não quebrar chamadas) — ela passa a ser "registrar alterações do pedido" de forma geral.
- O campo `status_no_momento` continua gravando o status atual do pedido na hora da alteração — útil pro vendedor entender o contexto.

**2. Frontend (`AuthContext.tsx`, função `updateOrder`)**
- Remover a condição `['Entregue', 'Cobrado', 'Pago'].includes(current.status)` — passa a chamar a RPC para qualquer status quando houver `changes.length > 0`.

**3. Sino (`NotificacoesBell.tsx`)**
- Sem mudanças visuais. O sino já lista qualquer notificação que chegar via Realtime; vai automaticamente exibir as novas.
- A linha "Status: X" no item já mostra o status do momento da alteração — fica claro pro vendedor.

**4. Memória do projeto**
- Atualizar `mem://features/notificacoes/sino-vendedor` removendo a restrição de "entregue/cobrado/pago" — agora notifica qualquer alteração.

### O que NÃO muda
- Admins continuam sem receber sino (regra atual mantida).
- Vendedor "Estoque" continua sem notificações.
- Notificações de pedidos sem vendedor continuam sendo ignoradas.
- Criação do pedido NÃO gera notificação (só `updateOrder` chama a RPC; o insert inicial não passa por lá).

### Observação
Pedidos com muitas micro-edições vão gerar mais notificações que antes. Se quiser, depois posso adicionar um agrupamento (ex: "3 alterações no pedido X") — mas por enquanto fica 1 notificação por alteração, igual ao comportamento atual pós-entrega.