## Objetivo
Transformar o fluxo "Solicitação de ajuste de preço" numa verdadeira aprovação/recusa integrada, com preview inline, aviso visual na lista, e ações OK/X funcionando de todos os pontos.

## 1. Backend (migração Supabase)

Criar/atualizar RPCs — mantendo `marcar_ajuste_visto` só como legado se necessário:

- **`aprovar_ajuste_solicitacao(_solicitacao_id uuid)`** (`SECURITY DEFINER`, só `admin_master`):
  1. Lê a solicitação (`desconto_solicitado`, `motivo`, `order_id`).
  2. Bloqueia se já não estiver `pendente`.
  3. Aplica no pedido igual ao botão "Aplicar Desconto":
     - `desconto = COALESCE(desconto,0) + desconto_solicitado`
     - `desconto_justificativa = motivo` (append se já houver)
     - Recalcula `preco = subtotal_atual − novo_desconto` (usar valor já em `preco` + delta, mesma lógica do frontend: `preco_novo = preco_atual − desconto_solicitado`).
     - Registra evento no `order_status_changes` / histórico como "Desconto aplicado via solicitação".
  4. Marca solicitação `status='aprovado'`, `decidido_por`, `decidido_em`.
  5. Insere `order_notificacoes` para o vendedor: tipo `ajuste_aprovado`, mensagem "Seu ajuste de R$ X foi aplicado — motivo: …".
- **`recusar_ajuste_solicitacao(_solicitacao_id uuid, _resposta text default null)`** (`SECURITY DEFINER`, só `admin_master`):
  1. Marca `status='negado'`, `resposta_admin`, `decidido_por`, `decidido_em`.
  2. Insere `order_notificacoes` para o vendedor: tipo `ajuste_negado`.
- `GRANT EXECUTE ... TO authenticated` em ambas.

Corrigir também a chamada atual `marcar_ajuste_visto({_id})` → passa a não ser usada; remover do frontend (parâmetro real é `_solicitacao_id`, causa do erro atual "Could not find the function public.marcar_ajuste_visto(_id)").

## 2. Frontend

### 2.1 `AjusteValorSolicitacao.tsx` (no detalhe do pedido)
- Substituir botão único **OK** por dois botões: **✓ Aprovar** (verde) e **✗ Recusar** (vermelho), lado a lado, quando `isAdminMaster && status='pendente'`.
- Aprovar → chama `aprovar_ajuste_solicitacao`. Recusar → chama `recusar_ajuste_solicitacao` (com prompt opcional de motivo curto).
- Após ação, esconder o bloco (a solicitação sai da composição pois já foi resolvida) e recarregar o pedido para mostrar o novo desconto já aplicado na linha "Desconto".
- Remover completamente o estado "visto" da UI (aprovado/negado já cobrem).

### 2.2 `SolicitacoesAjustePage.tsx`
- Trocar coluna "Ações" para dois botões: **OK** (aprova) + **X** (recusa), mesma lógica.
- Ao clicar no **número do pedido**: em vez de `<Link>`, expandir uma linha abaixo com **preview inline** do pedido (composição resumida: itens da composição, subtotal, total, observação de entrega). Um segundo clique fecha. Estado local `expandedId`. Reaproveitar as helpers `getOrderFinalValue` / `priceItems` já usadas no detalhe (extrair componente `OrderPreviewInline` a partir da seção de composição do `OrderDetailPage`, ou renderização simplificada usando `useOrderById`).
- Manter link externo pequeno "abrir pedido" como ícone secundário.
- Tabs `Pendentes / Aprovadas / Recusadas / Todas` (renomeando "Vistas").

### 2.3 Dashboard (`AdminDashboard.tsx`)
- No card amarelo "Solicitações de ajuste de valor", em vez de só link "Revisar", listar as pendentes (compactas): vendedor + nº + desconto + motivo + botões **OK / X** inline. Mesma RPC. Sem sair do dashboard.
- Manter link para a página completa.

### 2.4 Indicador na lista de pedidos (admin master)
- Adicionar prop `showAjustePendenteTag?: boolean` em `OrderCard.tsx`; quando true e o pedido tiver solicitação pendente → mostra ícone `DollarSign` amarelo ao lado do número.
- Em `ReportsPage.tsx`, buscar (uma vez, com o dataset já carregado) o `Set<order_id>` de solicitações pendentes (`select order_id from order_ajuste_solicitacoes where status='pendente'`) e passar para o card via prop derivada `order.temAjustePendente`.
- Só para `admin_master`.

### 2.5 Notificações (sino do vendedor)
- Adicionar rótulos `ajuste_aprovado` e `ajuste_negado` em `NotificacoesBell.tsx` (ícone + texto).

## 3. Detalhes técnicos

- Composição atual grava `preco` = TOTAL FINAL. A RPC de aprovar deve fazer `UPDATE orders SET desconto = desconto + _desc, desconto_justificativa = COALESCE(desconto_justificativa || E'\n','') || 'Solicitação aprovada: ' || motivo, preco = GREATEST(preco - _desc, 0)`.
- Bloquear preço final negativo: RPC retorna erro se `preco - _desc < 0`; frontend mostra toast.
- Realtime: as páginas já recarregam manualmente após ação; não precisa canal novo.

## 4. Correção imediata do erro reportado
O toast "Could not find the function public.marcar_ajuste_visto(_id)" acontece porque o frontend passa `_id` e a função espera `_solicitacao_id`. Ao substituir a chamada por `aprovar_ajuste_solicitacao({_solicitacao_id: id})` / `recusar_ajuste_solicitacao(...)`, o erro desaparece.

## Fora de escopo
- Não alterar edge functions.
- Não mudar RLS de `orders`.
- Não mexer em outras notificações existentes.
