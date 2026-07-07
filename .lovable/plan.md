## Objetivo

Criar campo "Observação de Entrega" preenchido por admins de produção, exibido para vendedores/admin_master na Composição do Pedido e nos PDFs de Expedição/Cobrança, com notificação automática ao vendedor.

## Mudanças

### 1. Banco (migration)
- Adicionar coluna `observacao_entrega text` (nullable) em `public.orders`.
- Adicionar coluna `observacao_entrega_por text` e `observacao_entrega_em timestamptz` para auditoria (opcional mas útil).
- Criar RPC `registrar_observacao_entrega(_order_id uuid, _texto text)` SECURITY DEFINER que:
  - valida role do caller (`admin_producao` ou `admin_master`);
  - grava as três colunas em `orders`;
  - se `_texto` não vazio E vendedor válido (≠ vazio/'Estoque'), insere em `order_notificacoes` com descrição `Nova observação de entrega: "<texto>"` — **sem** o filtro de status Entregue/Cobrado/Pago da RPC existente, para funcionar em qualquer etapa.

### 2. `src/pages/OrderDetailPage.tsx`
- Novo bloco "Observação de Entrega" logo **abaixo das informações base** (após o card com Número/Vendedor/Data/Prazo, antes de "Detalhes da Bota"):
  - Se `role === 'admin_producao'` ou `'admin_master'`: textarea editável + botão "Salvar" que chama a RPC; visível em qualquer status do pedido.
  - Se vendedor/outros: bloco não aparece aqui (só na Composição).
- Dentro do card "Composição do Pedido" (após subtotal / desconto / total), renderizar linha "Observação de Entrega: <texto>" quando `observacao_entrega` estiver preenchida — visível para admin_master e vendedores. Admin_producao vê no editor de cima; opcionalmente também aqui como confirmação.

### 3. Tipo `Order` e mapeamento
- `src/contexts/AuthContext.tsx`: adicionar `observacaoEntrega?: string` (e campos de auditoria) em `Order`.
- `src/lib/order-logic.ts` (`dbRowToOrder`): mapear `row.observacao_entrega` → `observacaoEntrega`.

### 4. PDFs de Expedição e Cobrança
- `src/components/SpecializedReports.tsx` (PDF Expedição): dentro da coluna "COMPOSIÇÃO", após listar os itens, adicionar linha extra `Obs. entrega: <texto>` quando presente.
- `src/lib/cobrancaPdf.ts` (PDF Cobrança): mesma inclusão na coluna "COMPOSIÇÃO".
- Espelho na tela do OrderDetail (`mirrorPriceItems`, se usado) segue automaticamente por já renderizar a mesma seção.

### 5. Sino de notificações
- Nenhuma mudança de frontend necessária: o hook `useNotificacoes` já lê `order_notificacoes` e reage via Realtime. A nova RPC insere a notificação que aparece no sino do vendedor.

## Fora de escopo

- Histórico de edições da observação (guardaremos apenas o último autor/data).
- Edição da observação por vendedores (só admin_producao/admin_master).
- Alteração da RPC `registrar_alteracoes_pos_entrega` existente.

## Detalhes técnicos

- Coluna nova preserva pedidos existentes (default NULL).
- Não precisa `GRANT` extra: `orders` já tem grants; a RPC é `SECURITY DEFINER` e faz o insert em `order_notificacoes` (que bloqueia insert direto por RLS, por isso precisa ser via RPC).
- A RPC ignora o filtro de status para atender ao requisito "independente do progresso".
- O texto exibido na Composição usa o mesmo estilo tipográfico das linhas existentes (label bold, valor regular), sem alterar totais.
