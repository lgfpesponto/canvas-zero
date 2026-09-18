# Trava global de sessão: deslogou → tela de login (laranja)

## Problema
O portal corte deslogou sozinho (expiração/renovação de sessão) e, em vez de ir para a tela de login, ficou mostrando a visão de vendedor (menu completo do portal).

Causa confirmada no código: só algumas páginas redirecionam para `/login` quando não há usuário logado (`Index`, `CortePortalPage`, `BordadoPortalPage`). A página de detalhe `/pedido/:id` — que o usuário do corte usa o tempo todo — **não tem essa verificação**. Quando a sessão cai nela, o `role` vira `null`, o `ChromeWrapper` deixa de aplicar o modo "portal restrito" e renderiza o Header completo: é a "visão do vendedor" que apareceu.

## Solução
Uma trava global em um único lugar, valendo para qualquer usuário e qualquer tela:

1. **`src/App.tsx` (`ChromeWrapper`)** — antes de qualquer regra de papel:
   - Se a sessão ainda está carregando (`authLoading`), não renderiza nada (comportamento já existente).
   - Se terminou de carregar e **não há usuário logado**, e a rota não é pública (`/login`, `/rastreio/...`, `/vitrine/...`), redireciona para `/login` — a tela laranja de acesso.
   - Isso vale para todas as rotas privadas (`/corte`, `/pedido/:id`, `/relatorios`, etc.), independente do papel do usuário (corte, bordado, montagem, vendedor, admin).
2. **Robustez do deslogamento** — no `AuthContext`, quando a renovação de sessão falhar de forma definitiva (refresh token inválido/ausente), além de limpar o estado local, chamar `signOut({ scope: 'local' })` para disparar o evento `SIGNED_OUT` e fazer a trava global agir imediatamente (sem depender de recarregar a página).

## Resultado esperado
- Qualquer queda de sessão (expiração, token inválido, logout em outra aba) leva direto à tela laranja de login, em qualquer tela e qualquer papel.
- Nenhum conteúdo do portal (menu, listas, detalhes de pedido) fica visível sem usuário autenticado.
- Rotas públicas (`/rastreio/...`, `/vitrine/...`) continuam acessíveis sem login.

## Detalhes técnicos
- Arquivos: `src/App.tsx` (guarda global no `ChromeWrapper`), `src/contexts/AuthContext.tsx` (forçar `SIGNED_OUT` em falha definitiva de refresh).
- Sem mudanças em banco de dados, permissões ou fluxo de login.
- Validação: simular sessão expirada (limpar storage) estando em `/pedido/:id` e em `/corte` e conferir o redirecionamento para `/login`.
