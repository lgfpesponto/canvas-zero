# Plano

## 1. Transferência de modelos para qualquer usuário

**Problema**: Hoje só admins conseguem ver a lista de destinatários ao clicar em "Enviar modelo". Os botões aparecem para todos, mas a busca usa `supabase.from('profiles').select(...)` direto, e a RLS de `profiles` só permite o próprio usuário ler a si mesmo (admins veem todos). Resultado: vendedores comuns ficam presos em "Carregando usuários...".

**Correção**:
- Criar uma função RPC `security definer` `list_profiles_minimal()` que retorna apenas `id`, `nome_completo`, `nome_usuario` de todos os perfis, exceto o do chamador. Isso expõe só o mínimo necessário para o seletor de destinatários, sem abrir a tabela `profiles` para leitura geral.
- Trocar nas três páginas que abrem o diálogo de envio (`OrderPage.tsx`, `BeltOrderPage.tsx`, `ExtrasPage.tsx`) a chamada `supabase.from('profiles').select(...)` dentro de `openSendDialog` por `supabase.rpc('list_profiles_minimal')`.
- Garantir que o botão "Enviar para outro usuário" (ícone Send) e o "Enviar selecionados" continuem visíveis para todos os papéis (já estão; só confirmar que nenhuma condicional `isAdmin` esteja em volta).

A lógica de envio em `useTemplateManagement.sendTemplateToUsers` (insert em `order_templates` com `user_id` do destinatário) já funciona via RLS de insert universal — verificar a policy de INSERT de `order_templates` e, se necessário, ajustar para permitir que qualquer usuário insira em nome de outro (sender_id = auth.uid(), user_id = destinatário). Se a policy atual exigir `auth.uid() = user_id`, mover esse insert para uma função `security definer` `send_template_to_users(...)`.

## 2. "Selecionar todos" deve cobrir todas as páginas filtradas

**Problema**: Em `ReportsPage` (Meus Pedidos / Relatórios) a paginação é server-side (50 por página). `toggleSelectAll` só marca os 50 visíveis na página atual. Usuário espera marcar os 100 (ou N) que correspondem ao filtro inteiro.

**Correção**:
- Criar helper `fetchAllFilteredOrderIds(filters)` em `src/hooks/useOrders.ts` semelhante a `fetchAllFilteredOrders`, mas selecionando apenas `id` (mais leve, em batches de 1000).
- Em `ReportsPage.tsx` reescrever `toggleSelectAll` para:
  - Se já está tudo marcado (`selectedIds.size === serverCount`), limpar.
  - Senão, chamar `fetchAllFilteredOrderIds(appliedFilters)` e setar `selectedIds` com todos os IDs retornados.
  - Mostrar um pequeno estado de loading enquanto busca (spinner no botão).
- Atualizar o indicador visual do botão para comparar com `serverCount` (total filtrado) em vez de `visibleOrders.length`, e o rótulo dinâmico continuar como "Selecionar todos" / "Desmarcar todos".
- Manter `toggleSelect` (item individual) inalterado.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — função `list_profiles_minimal()` e (se necessário) `send_template_to_users()` ou ajuste de policy em `order_templates`.
- `src/pages/OrderPage.tsx` — `openSendDialog` usa RPC.
- `src/pages/BeltOrderPage.tsx` — `openSendDialog` usa RPC.
- `src/pages/ExtrasPage.tsx` — se houver `openSendDialog`, mesma troca.
- `src/hooks/useOrders.ts` — exportar `fetchAllFilteredOrderIds`.
- `src/pages/ReportsPage.tsx` — `toggleSelectAll` async com fetch global.

## Detalhes técnicos

- A RPC `list_profiles_minimal` será `STABLE SECURITY DEFINER SET search_path = public`, retornando `TABLE(id uuid, nome_completo text, nome_usuario text)` com `WHERE id <> auth.uid()` e `ORDER BY nome_completo`.
- `fetchAllFilteredOrderIds` reaproveita exatamente a mesma montagem de filtros do `fetchAllFilteredOrders` (incluindo `mudouParaStatus`), só mudando o `select` para `id`.
- O botão "Selecionar todos" passa a aguardar a Promise; durante isso fica `disabled` para evitar duplo clique.
