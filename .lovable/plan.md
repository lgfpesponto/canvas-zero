
## Diagnóstico objetivo

**Do I know what the issue is? Sim.**

O backend está aceitando a autenticação da Fernanda, mas o frontend ainda está tratando a sessão como “não pronta”. Por isso parece que “entrou no backend mas não entrou no sistema”.

### O que confirma isso
- Os logs de auth mostram **refresh/login com sucesso** para `fernanda@7estrivos.app`.
- Então o problema **não é senha errada** nem Auth do Supabase fora do ar.
- No código atual, `isLoggedIn` depende de `!!user` em `AuthContext.tsx`.
- Só que `user` só é preenchido **depois** de buscar `profiles` + `user_roles`.
- E o `loading` é desligado no `finally` do `getSession()`, mesmo que o `loadProfile()` ainda não tenha terminado.
- Resultado: a sessão já existe no Supabase, mas a UI ainda vê `user = null` e renderiza como deslogado.

## Problema exato no código

### 1. Race condition no auth
Em `src/contexts/AuthContext.tsx`:
- o listener de auth dispara `loadProfile(session.user.id)` em `setTimeout`
- `getSession()` também chama `loadProfile()`
- mas `setLoading(false)` acontece antes de garantir que o profile terminou de carregar

Isso permite este cenário:

```text
Supabase restaura sessão -> token válido
loading vira false
user ainda é null por alguns instantes
UI entende "não logado"
dashboard/login/header mostram estado errado
```

### 2. Telas ainda dependem só de `isLoggedIn`
Várias páginas ainda fazem:

- `if (!isLoggedIn) ...`
- ou redirecionam/renderizam antes de esperar o auth realmente estabilizar

Arquivos com esse padrão:
- `src/pages/ReportsPage.tsx`
- `src/pages/OrderPage.tsx`
- `src/pages/BeltOrderPage.tsx`
- `src/pages/DraftsPage.tsx`
- `src/pages/TrackOrderPage.tsx`
- `src/pages/DynamicOrderPage.tsx`
- `src/pages/Index.tsx`
- `src/components/Header.tsx`

Então o login pode até funcionar no backend, mas a interface continua como visitante.

### 3. Problema secundário já identificado
Ainda existe risco de divergência entre:
- `profiles.nome_usuario`
- e o email/login real do Auth (`username@7estrivos.app`)

Isso não explica sozinho o sintoma atual, mas continua sendo parte da correção para evitar novos bloqueios.

## Plano de correção

### 1. Corrigir o estado de prontidão do auth
Arquivo: `src/contexts/AuthContext.tsx`

Vou ajustar para:
- separar **sessão restaurada** de **perfil carregado**
- só finalizar `loading` quando o fluxo inteiro terminar
- impedir chamadas concorrentes de `loadProfile`
- manter o usuário autenticado baseado na sessão válida, sem “piscar” para deslogado no meio

### 2. Proteger a UI enquanto o auth não está pronto
Arquivos:
- `src/components/Header.tsx`
- `src/pages/Index.tsx`
- `src/pages/ReportsPage.tsx`
- `src/pages/OrderPage.tsx`
- `src/pages/BeltOrderPage.tsx`
- `src/pages/DraftsPage.tsx`
- `src/pages/TrackOrderPage.tsx`
- `src/pages/DynamicOrderPage.tsx`

Vou fazer essas telas:
- esperarem `loading === false`
- exibirem “Carregando...” em vez de assumir logout
- só redirecionarem/renderizarem conteúdo de visitante depois que o auth estiver realmente resolvido

### 3. Manter login e username sincronizados
Arquivos:
- `src/pages/UsersManagementPage.tsx`
- `supabase/functions/update-user-credentials/index.ts`

Vou manter a sincronização entre:
- username exibido
- email real do Supabase Auth
- sanitização única do login

Assim evitamos casos em que o usuário digita o login “certo na tela”, mas o Auth espera outro.

### 4. Melhorar diagnóstico do login
Arquivos:
- `src/contexts/AuthContext.tsx`
- `src/pages/LoginPage.tsx`

Vou melhorar para:
- diferenciar credencial inválida, timeout e falha de rede
- registrar erros úteis no console
- evitar sensação de “travou” quando o token entrou mas o perfil ainda não carregou

## Resultado esperado

Depois da correção:
- quando o backend renovar/aceitar a sessão, a UI vai acompanhar corretamente
- a Fernanda não ficará com “login válido no backend” e “fora do sistema” no frontend
- páginas não vão mais mostrar estado de visitante durante a restauração da sessão
- o fluxo de login ficará consistente em refresh, aba nova e retorno ao sistema

## Validação que farei na execução
- login da Fernanda com credencial válida
- refresh da página com sessão ativa
- retorno para `/` após autenticar
- abertura de páginas protegidas sem cair em falso logout
- teste com usuário admin_producao e vendedor
- verificação do fluxo publicado, não só preview

## Detalhes técnicos
A causa principal não parece ser “autenticação recusada”, e sim **frontend liberando a renderização cedo demais**. O Supabase aceita a sessão, mas o app ainda não terminou de reconstruir `user`, `role` e permissões quando a interface decide o que mostrar.
