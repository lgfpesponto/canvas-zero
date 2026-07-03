## Diagnóstico

A vendedora Maria Gabriela não tem linha na tabela `user_roles` (confirmado no banco: `role = null`). O `AuthContext` deixa `user.role` como `undefined` nesse caso, então minha checagem `user?.role === 'vendedor' || 'vendedor_comissao'` retorna `false` e o botão "Gerar Grade" não aparece.

Vários vendedores no sistema podem estar nessa situação (usuários antigos sem role explícita em `user_roles`).

## Correção

Trocar a checagem restritiva por uma checagem por exclusão: qualquer usuário não-admin que esteja em `/pedido` é vendedor comum e pode gerar grade.

**Arquivo:** `src/pages/OrderPage.tsx` (linha ~188)

```ts
// antes
const isVendedorComum = !isAdmin && (user?.role === 'vendedor' || user?.role === 'vendedor_comissao');

// depois
const isVendedorComum = !isAdmin && user?.role !== 'bordado' && user?.role !== 'montagem';
```

Isso cobre:
- vendedores com role `'vendedor'` ou `'vendedor_comissao'` no banco.
- vendedores legados sem linha em `user_roles` (role undefined).
- Exclui bordado e montagem (que não acessam essa página, mas fica seguro por defesa).
- `admin_producao` e `admin_master` continuam no fluxo antigo (fallback Estoque/Juliana).

## Fora de escopo

Nada mais muda — layout, submit, dialog e Cliente opcional permanecem exatamente como já implementado.