## Problema

Quando o usuário `montagem` entra, ele vê o **dashboard normal de vendedor** (Header + menu + lista de pedidos) em vez do portal `/montagem`. A causa raiz é uma combinação de três pontos no código atual:

1. **`LoginPage.handleSubmit`** chama `navigate('/')` imediatamente após `result === 'ok'`, antes do `role` hidratar. Aí o `Index` monta com `role = null`, cai no branch padrão (`VendedorDashboard`) e renderiza o dashboard de vendedor. Quando o `role` finalmente vira `montagem`, o `ChromeWrapper` até redireciona — mas o usuário já viu (e continua vendo, dependendo do timing) a tela errada.
2. **`Index.tsx`** redireciona `bordado` para `/bordado`, mas **não redireciona `montagem`** para `/montagem`. Então mesmo com role correto, se algo renderizar o `Index` antes do `ChromeWrapper` agir, aparece o conteúdo de vendedor.
3. **`UsersManagementPage`** não inclui `montagem` em `ROLE_OPTIONS`. Quando o admin abre o usuário Montagem para editar, o `<select>` cai no primeiro valor (provavelmente `vendedor`) e, se salvar sem perceber, **troca o role no banco para vendedor** — o que explicaria perfeitamente o sintoma se o admin tiver aberto/salvado esse cadastro.

## O que vai ser feito

### 1. `src/pages/LoginPage.tsx`
- Tirar o `navigate('/')` imediato no `result === 'ok'`. Deixar apenas o `useEffect` que já dispara `navigate(destinationForRole(role))` quando `role` hidrata. Assim quem é `montagem` vai direto pro portal, sem flash de vendedor.

### 2. `src/pages/Index.tsx`
- Adicionar redirect explícito: `if (role === 'montagem') return <Navigate to="/montagem" replace />;` logo abaixo do redirect de `bordado`. Defesa em profundidade caso alguém aterrisse em `/`.

### 3. `src/pages/UsersManagementPage.tsx`
- Adicionar `{ value: 'montagem', label: 'Montagem (portal restrito)' }` ao `ROLE_OPTIONS`. Com isso o admin consegue:
  - Criar/editar usuários com role `montagem` sem o select silenciosamente cair em `vendedor`.
  - Ver corretamente o role atual do usuário Montagem na listagem.
- **Verificar e corrigir o role atual do usuário `montagem@7estrivos.app`** caso ele esteja em outro role no banco (uma checagem rápida via `supabase--read_query` antes de declarar resolvido).

### 4. `src/App.tsx` (`ChromeWrapper`)
- Pequeno hardening: enquanto `loading` do AuthContext for `true`, **não renderizar nada** dentro de `ChromeWrapper` (retornar um placeholder vazio). Isso elimina qualquer flash de dashboard de vendedor enquanto o `role` ainda está hidratando.

## Fora de escopo
- Não vou mexer no `MontagemPortalPage`, no fluxo do scanner, nas RPCs nem nos PDFs — o portal em si já está como solicitado; o bug é só de roteamento/seleção de role.

## Validação
- Logar com `montagem` / `montagem123` e confirmar que vai direto pra `/montagem`, sem Header e sem ver o dashboard de vendedor.
- Abrir o usuário Montagem em `/usuarios` como admin_master e confirmar que o select mostra "Montagem (portal restrito)" selecionado.
