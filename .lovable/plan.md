## Objetivo
Transformar a tela de login (`/login`) em uma página dedicada em fundo laranja, sem cabeçalho, exibindo apenas o painel de login. Remover o subtítulo "Acesse sua conta de revendedor".

## Mudanças

### 1. `src/App.tsx` — esconder o Header na rota `/login`
Atualmente `<Header />` é renderizado fora das `<Routes>`, aparecendo em todas as páginas. Vou envolver o Header em um pequeno componente que usa `useLocation` para não renderizar quando `pathname === '/login'`. O `DeployNoticeBanner` e `AdminAssistantFab` também serão ocultados em `/login` (usuário ainda não está logado, faz sentido).

### 2. `src/pages/LoginPage.tsx`
- Trocar o wrapper externo para ocupar a tela inteira com fundo laranja (usando o gradiente/cor primária da marca, ex.: `bg-primary` ou `orange-gradient` já existente no projeto).
- Centralizar o card de login (mantém o card branco/claro atual sobre o fundo laranja para contraste e legibilidade).
- Remover a linha `<p>Acesse sua conta de revendedor</p>`.
- Manter apenas o título "Entrar" (sem subtítulo).
- Garantir `min-h-screen` em vez de `min-h-[80vh]` já que não há mais header.

### 3. Resultado visual
```text
+--------------------------------------------------+
|                                                  |
|              [fundo laranja inteiro]             |
|                                                  |
|          +----------------------------+          |
|          |          [logo]            |          |
|          |          Entrar            |          |
|          |   Nome de Usuário [____]   |          |
|          |   Senha           [____]   |          |
|          |        [ ENTRAR ]          |          |
|          +----------------------------+          |
|                                                  |
+--------------------------------------------------+
```

Sem header, sem banners, sem FAB, sem subtítulo "Acesse sua conta de revendedor".

## Observações
- Após login bem-sucedido, o redirecionamento existente para `/` continua funcionando e o Header volta a aparecer normalmente nas demais rotas.
- Mensagens de erro e o painel de diagnóstico de rede continuam funcionando dentro do card.
