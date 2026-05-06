# Corrigir Assistente IA — erro `userClient.auth.getClaims is not a function`

## Problema
A edge function `admin-assistant` está retornando 500 em **toda** mensagem enviada ao Assistente. A IA nunca responde — o erro aparece como balão cinza no chat:

> `userClient.auth.getClaims is not a function`

## Causa
Em `supabase/functions/admin-assistant/index.ts` (linha 499) o código chama:

```ts
userClient.auth.getClaims(token)
```

Esse método **não existe** no `@supabase/supabase-js@2.45.0` usado pela função. Foi provavelmente confundido com `getUser(jwt)`. Resultado: a função quebra antes mesmo de chamar a IA.

## Correção
Trocar a validação do token para `auth.getUser(token)`, que é o método oficial da SDK e devolve `data.user.id` (equivalente ao `sub` do JWT).

```ts
const { data: userData, error: userErr } = await userClient.auth.getUser(token);
if (userErr || !userData?.user) {
  return 401 "Token inválido";
}
const userId = userData.user.id;
```

O restante do fluxo (checagem de `has_role` admin_master, chamada ao Lovable AI Gateway, tools) continua igual.

## Arquivos alterados
- `supabase/functions/admin-assistant/index.ts` — apenas o bloco de validação de token (linhas ~498-505).

## Validação
1. Após deploy automático, abrir o chat do assistente em `/financeiro?tab=saldo`.
2. Enviar uma pergunta simples ("oi").
3. Confirmar que a IA responde normalmente (sem balão de erro cinza).
4. Conferir os logs da edge function para garantir que não há mais 500.

Sem mudanças de banco, RLS ou frontend.
