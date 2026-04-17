
## Diagnóstico

Do I know what the issue is? Sim, com boa precisão.

O sistema não parece estar “caído” no Supabase/Auth. As evidências apontam para um problema de autenticação no frontend e possível divergência entre o login exibido no cadastro e o login real salvo no Auth.

### O que encontrei
- Os logs de Auth mostram `/token` e `/user` respondendo com sucesso; então o backend de autenticação está funcionando.
- O horário “13:10” que apareceu antes está em UTC/log do Supabase, não no horário local de Brasília. Então isso não prova login fantasma; foi interpretação de fuso.
- Em `src/contexts/AuthContext.tsx`, a inicialização está frágil:
  - `getSession()` roda antes de registrar `onAuthStateChange`
  - o callback chama função async sem controle de readiness
  - `isLoggedIn` depende de `!!user`, mas várias telas não esperam `loading`
- Isso pode gerar estado inconsistente: sessão existe, mas o app ainda não carregou o profile/role e parece “travado” ou deslogado.
- Há um segundo problema importante no fluxo de usuários:
  - o login usa `${username}@7estrivos.app`
  - mas ao editar usuário em `UsersManagementPage.tsx`, altera só `profiles.nome_usuario`
  - não existe sincronização do email real em `auth.users`
  - então o “usuário” mostrado na tela pode não ser mais o login real
- Também existe inconsistência de normalização:
  - login sanitiza mais agressivamente
  - create-user sanitiza diferente
  - isso pode quebrar logins dependendo do nome de usuário

## Plano de correção

### 1. Fortalecer a inicialização da autenticação
Arquivos: `src/contexts/AuthContext.tsx`

Vou ajustar para:
- registrar `onAuthStateChange` antes de `getSession()`
- tratar a autenticação com um estado explícito de readiness
- evitar `await` direto dentro do callback do `onAuthStateChange`
- processar corretamente `INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED` e `SIGNED_OUT`
- só liberar `loading=false` quando a restauração da sessão/profile terminar

Objetivo: impedir condição de corrida na subida do app.

### 2. Proteger a navegação enquanto o auth ainda está carregando
Arquivos principais:
- `src/pages/LoginPage.tsx`
- `src/pages/ProfilePage.tsx`
- telas que redirecionam com base em `isLoggedIn`/`user`

Vou fazer as telas esperarem o auth estar pronto antes de:
- redirecionar para `/login`
- renderizar estado de “deslogado”
- navegar logo após o submit do login

Objetivo: evitar falsa sensação de travamento ou logout logo após autenticar.

### 3. Corrigir a divergência entre username do perfil e login real
Arquivos:
- `src/pages/UsersManagementPage.tsx`
- edge functions de gestão de usuário

Vou alinhar o fluxo para que, ao alterar nome de usuário:
- o login real no Supabase Auth também seja atualizado
- a mesma regra de sanitização seja usada em criar, editar e logar

Se durante a execução eu confirmar que a Fernanda está com `profiles.nome_usuario` diferente do email/login real do Auth, corrijo isso também.

### 4. Corrigir reset/admin de senha
Arquivos:
- `supabase/functions/update-user-password/index.ts`
- possivelmente `delete-user/index.ts` pelo mesmo padrão

Hoje a validação usa `has_role(..., 'admin')`, o que pode bloquear admins válidos como `admin_master`.
Vou trocar para a checagem administrativa correta já usada no restante do projeto (`is_any_admin`).

Objetivo: garantir que redefinição de senha funcione de verdade para teste e suporte.

### 5. Melhorar o feedback do login
Arquivos:
- `src/contexts/AuthContext.tsx`
- `src/pages/LoginPage.tsx`

Vou ajustar para:
- distinguir credencial inválida vs falha de rede vs timeout
- evitar botão preso em “ENTRANDO...”
- registrar erro útil no console quando houver falha real

## Resultado esperado
Depois dessas mudanças:
- o login não deve mais ficar em estado inconsistente
- páginas não devem parecer “carregando infinito” por corrida de sessão/profile
- o usuário exibido no cadastro vai bater com o login real
- redefinir senha da Fernanda passará a ser confiável
- o problema deixa de depender de cache/localStorage corrompido para “funcionar”

## Validação que farei na execução
- testar login da Fernanda com credencial válida
- testar refresh da página com sessão já ativa
- testar logout/login novamente
- testar edição de username e confirmar que o novo login funciona
- testar reset de senha via gerenciamento de usuários
- verificar o fluxo completo no preview e no publicado

## Detalhes técnicos
Arquivos mais suspeitos e que serão corrigidos:
- `src/contexts/AuthContext.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/ProfilePage.tsx`
- `src/pages/UsersManagementPage.tsx`
- `supabase/functions/update-user-password/index.ts`

Não vejo necessidade de migration no banco para essa correção; o problema está na camada de auth/session e sincronização com Supabase Auth.
