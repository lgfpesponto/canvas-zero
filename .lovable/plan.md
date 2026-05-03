## Objetivo
Quando um visitante não autenticado acessar a raiz do site (`/`), redirecionar imediatamente para `/login`, sem renderizar o hero/dashboard antes.

## Mudança

### `src/pages/Index.tsx`
- Importar `Navigate` do `react-router-dom`.
- Logo após obter `isLoggedIn` e `authLoading` do `useAuth()`:
  - Enquanto `authLoading === true` → renderizar uma tela em branco (ou um loader minimalista) para não piscar conteúdo.
  - Quando `authLoading === false` e `isLoggedIn === false` → `return <Navigate to="/login" replace />`.
- O restante do componente (hero + dashboards por papel) só será renderizado para usuários já logados.

### Resultado
- Visitante anônimo abre `portal.7estrivos.com.br/` → vai direto para a tela laranja de login, sem flash do dashboard/hero.
- Usuário logado abre `/` → vê o dashboard correspondente ao seu papel normalmente.
- Após login bem-sucedido, o `LoginPage` continua redirecionando para `/`, que agora mostra o dashboard.

## Observações
- O bloco "Faça login para acessar o dashboard" deixa de ser exibido (substituído pelo redirect).
- Nenhuma rota é alterada; só o conteúdo de `Index.tsx`.
