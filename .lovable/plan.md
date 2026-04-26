## Objetivo

Quando um admin (Juliana ou Fernanda) editar qualquer campo de um pedido que já tenha atingido status **Entregue**, **Cobrado** ou **Pago**, o vendedor dono do pedido recebe uma notificação no sino do dashboard. Ao clicar, vai direto para o detalhe do pedido e a notificação some/marca como lida.

---

## 1) Banco de dados (migração)

### Nova tabela `order_notificacoes`
- `id uuid pk default gen_random_uuid()`
- `order_id uuid not null` — referencia o pedido
- `vendedor text not null` — nome completo do vendedor dono no momento da alteração (filtro de leitura)
- `numero text not null` — número do pedido (snapshot, pra exibir mesmo se mudar)
- `descricao text not null` — texto humano da alteração (ex.: "Alterado Cor do Cano de \"Preto\" para \"Marrom\"")
- `status_no_momento text not null` — Entregue/Cobrado/Pago (pra contexto)
- `lida boolean not null default false`
- `lida_em timestamptz`
- `created_at timestamptz not null default now()`
- `created_by uuid` — admin que fez a edição (auditoria)

Índices: `(vendedor, lida, created_at desc)` e `(order_id)`.

### RLS
- **SELECT**: `vendedor = current_user_nome_completo()` OU `is_any_admin(auth.uid())` (admin pode ler pra debug; sino só renderiza se não-admin).
- **UPDATE** (marcar lida): só o próprio dono — `vendedor = current_user_nome_completo()` e somente alterando colunas `lida`/`lida_em` (garantido via RPC `marcar_notificacao_lida`).
- **INSERT**: bloqueado direto (`with check false`) — apenas via RPC SECURITY DEFINER.
- **DELETE**: só `admin_master`.

### RPCs (SECURITY DEFINER, search_path=public)
1. **`registrar_alteracoes_pos_entrega(_order_id uuid, _descricoes text[])`**
   - Lê o pedido; se `status` ∈ ('Entregue','Cobrado','Pago') E `vendedor` não vazio E `vendedor <> 'Estoque'`, insere uma linha por descrição.
   - Caso contrário, não faz nada (no-op silencioso).
   - Chamada pelo client logo após `updateOrder` quando há mudanças.

2. **`marcar_notificacao_lida(_id uuid)`**
   - Valida que `vendedor = current_user_nome_completo()`.
   - Seta `lida=true, lida_em=now()`.

3. **`marcar_todas_notificacoes_lidas()`** (opcional, pra botão "marcar tudo como lido" no popover, se decidirmos manter — mas o gatilho de leitura é "ao clicar", então este fica como apoio).

### Realtime
- `ALTER TABLE order_notificacoes REPLICA IDENTITY FULL;`
- Adicionar à publication `supabase_realtime`.

---

## 2) Frontend

### `src/contexts/AuthContext.tsx` — `updateOrder`
- Após o `supabase.from('orders').update(...)`, se `changes.length > 0` E o pedido (estado **anterior**, já lido em `current`) tinha `status ∈ {Entregue, Cobrado, Pago}`, chamar:
  ```ts
  await supabase.rpc('registrar_alteracoes_pos_entrega', {
    _order_id: id,
    _descricoes: changes.map(c => c.descricao),
  });
  ```
- A RPC ignora se status mudar pra antes de Entregue (por segurança), mas o gate principal é client-side usando `current.status`.
- Não dispara para vendedor "Estoque" (regra já existente de pedido interno).

### Novo hook `src/hooks/useNotificacoes.ts`
- Expõe: `{ notificacoes, naoLidas, loading, marcarLida(id), marcarTodasLidas() }`.
- Lê de `order_notificacoes` filtrado por `vendedor = user.nomeCompleto`, ordenado `created_at desc`, limit 50.
- Subscribe realtime no canal `order_notificacoes` filtrado por vendedor → recarrega/insere ao receber INSERT/UPDATE.
- Não roda para admin (retorna lista vazia).

### Novo componente `src/components/NotificacoesBell.tsx`
- Ícone sino (lucide `Bell`) com badge de contagem `naoLidas` (some quando 0).
- Popover (`@/components/ui/popover`) abre lista das últimas 20:
  - Cada item: `numero` em destaque, `descricao` truncada em 2 linhas, `created_at` relativo ("há 5 min"), bolinha azul se não lida.
  - Ao clicar: chama `marcarLida(id)` e `navigate('/pedido/'+order_id)`.
  - Vazio: mensagem "Nenhuma notificação".
  - Rodapé: link "Marcar todas como lidas" (chama RPC).
- Estilizado com tokens existentes (sem cores hardcoded fora do design system).

### `src/components/Header.tsx`
- Renderizar `<NotificacoesBell />` à esquerda do botão "SAIR" no desktop e dentro do menu mobile.
- Só renderizar para usuários **não-admin** (`!isAdmin`) e logados (escopo definido).

### Comportamento "ao clicar leva ao pedido"
- O Popover do sino fecha ao clicar no item; navegação usa `react-router` `useNavigate`.
- `OrderDetailPage` já existe na rota `/pedido/:id` — sem alteração necessária ali.

---

## 3) Casos cobertos / não cobertos

**Cobertos** (gatilho: edição de campos via `updateOrder`):
- Edições feitas em `EditOrderPage`, `EditExtrasPage`, reatribuição de vendedor, aplicação de desconto em `OrderDetailPage`, qualquer outra chamada a `updateOrder`.

**Não cobertos** (por decisão de escopo):
- Mudança apenas de status (não dispara — só edição de campos).
- Pedidos do vendedor "Estoque".
- Notificação para admins.

---

## 4) Memória (mem://)

Adicionar em `mem://features/notificacoes/sino-vendedor.md`:
- Notificações por edição em `orders.alteracoes` quando status já é Entregue/Cobrado/Pago.
- Tabela `order_notificacoes` com RLS por `current_user_nome_completo()`; INSERT bloqueado, só via RPC `registrar_alteracoes_pos_entrega`.
- Realtime ativo. Sino renderizado apenas para não-admins. "Lida" ao clicar no item.

E referência no `mem://index.md` (sessão Memories).

---

## 5) Riscos / observações

- A captura do estado anterior do pedido para decidir se dispara depende de `current.status` lido **antes** do update. Já está disponível em `updateOrder`.
- O RPC tem checagem redundante do status pra evitar inserções erradas se a chamada vier desatualizada.
- `replica identity full` em `order_notificacoes` é necessário pro realtime entregar UPDATEs (marcar lida) — mas como o feed do vendedor depende mais de INSERTs, mesmo sem isso o sino funciona em tempo real para novas notificações.