## Problema

A aba **COMPROVANTES** no Header só aparece quando o `role` é exatamente `vendedor` ou `vendedor_comissao`. Mas a maioria dos vendedores no banco está com `role = NULL` em `user_roles` (Denise, Fabiana, Larissa, Maria Gabriela, Rafael, Samuel, Revendedor Demo) — eles são "vendedor padrão" sem linha em `user_roles`. Por isso o menu nunca aparece para eles.

Confirmação via SQL:

```
Denise / Fabiana / Larissa / Gabi / Rafael / Samuel / Demo → role NULL
Mariana Ribeiro → vendedor
Rancho Chique  → vendedor_comissao
Stefany / Juliana / Igor → admin_master
Fernanda / Mariana ADM → admin_producao
Neto / Debora → bordado
```

## Correção

Em `src/hooks/useFinanceiroSaldoAccess.ts`, trocar a regra de `canSeeComprovantesView`:

- **Antes:** `isLoggedIn && vendedorName && (role === 'vendedor' || role === 'vendedor_comissao')`
- **Depois:** `isLoggedIn && vendedorName && !['admin_master','admin_producao','bordado'].includes(role)` — ou seja, qualquer usuário logado que **não** seja admin master, admin produção ou bordado vê a aba (cobre `vendedor`, `vendedor_comissao` e `null`).

O Header já esconde a aba para `admin_master` (`!isAdminMaster`), então admin master continua sem ver. Admin produção e bordado ficam de fora pela nova regra.

Nenhuma mudança em RLS, banco ou no `RevendedorSaldoPage` — a página já valida acesso pelo mesmo hook e o `vendedor` salvo é sempre o `nome_completo` do usuário logado.

## Observação sobre Stefany

Stefany hoje está como `admin_master` no banco (não como vendedora). Por isso o menu "COMPROVANTES" continua não aparecendo para ela mesmo após o ajuste — admin master usa a aba `Financeiro › Saldo do Vendedor` direto. Se quiser que ela teste como vendedora, precisa mudar o `role` dela em `user_roles` (ou usar outro login de vendedor real, ex.: `denise`, `larissa`, `gabi`).
