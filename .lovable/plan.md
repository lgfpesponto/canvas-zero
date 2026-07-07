## Objetivo

Garantir que todo pedido ERRO apareça para o vendedor responsável pelo pedido original (não para quem registrou o erro) e para os admins, e confirmar a numeração incremental ERRO / ERRO2 / ERRO3…

## Mudanças

### 1. `src/components/orders/RegistrarErroDialog.tsx`
No `payload` do novo pedido ERRO, atribuir o vendedor do pedido original em vez do usuário logado:

- Remover o bloco `if (user?.id) payload.user_id = user.id;`
- Manter `payload.user_id = originalRow.user_id` (já vem do spread de `originalRow`, então basta não sobrescrever).
- Garantir que campos de atribuição de vendedor usados na listagem (`vendedor`, `vendedor_id`, `vendedor_nome`, se existirem no schema) também venham do original — já herdados pelo spread; apenas não sobrescrever.
- Registrar no `historico` quem foi o autor da ação ("registrado por {usuarioNome}") mantendo o vendedor responsável = original.

### 2. Numeração ERRO / ERRO2 / ERRO3
A função `nextFreeErroNumero` já testa `ERRO`, `ERRO2`…`ERRO20` e devolve o primeiro livre. Nenhuma mudança de lógica; apenas confirmar no plano que múltiplos erros do mesmo pedido geram sufixos incrementais automaticamente.

### 3. Hook `useLinkedErro`
Hoje retorna apenas 1 ERRO (`.limit(1)`). Como agora podem existir vários (ERRO2, ERRO3…), ajustar para retornar a lista completa:

- Alterar retorno para `linked: { id, numero }[]`
- Remover `.limit(1)` e `.maybeSingle()`, usar `.order('created_at', { ascending: true })`

### 4. Consumidores de `useLinkedErro`
Atualizar os locais que hoje leem `linked` como objeto único (provavelmente `OrderDetailPage.tsx` e talvez o card) para iterar sobre a lista e mostrar todos os ERROs vinculados (ex: badges "ERRO", "ERRO2"…). Manter mesmo estilo visual atual.

## Fora de escopo

- Regras de RLS: as policies existentes de `orders` já liberam leitura ao vendedor dono (`user_id`) e admins; como agora `user_id` = vendedor original, a visibilidade fica correta sem mexer em RLS.
- Notificações no sino: não alterar nesta rodada (pode ser feito depois se o usuário pedir).

## Detalhes técnicos

- Não sobrescrever `user_id` no payload é suficiente porque `payload = { ...originalRow }` já traz o `user_id` do vendedor responsável.
- A auditoria de "quem criou o ERRO" fica preservada no `historico[0].usuario` e nas `alteracoes[0].usuario`.
