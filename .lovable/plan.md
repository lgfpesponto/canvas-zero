## Objetivo

Para o **admin_master**, mover "Usuários" e "Gestão" para dentro de **Configurações** (`/admin/configuracoes`) como abas, junto com "ficha de produção", "extras", "progresso de produção" e "relatórios". Remover esses dois itens do header (somente para admin_master).

## Alterações

### 1. `src/pages/AdminConfigPage.tsx`
- Adicionar 2 novas abas no `<TabsList>`, **visíveis apenas para `role === 'admin_master'`**:
  - `usuarios` (ícone `Users`)
  - `gestao` (ícone `Activity` — já importado)
- Adicionar `<TabsContent value="usuarios">` que renderiza `<UsersManagementInner />` e `<TabsContent value="gestao">` que renderiza `<GestaoInner />`.
- Manter as abas existentes (fichas, extras, progresso, relatórios) inalteradas.

### 2. Refatorar páginas em componentes embutidos
- `src/pages/UsersManagementPage.tsx`: extrair o conteúdo (toda a UI a partir do `return`) para um componente exportado `UsersManagementInner` no mesmo arquivo. A página continua existindo (renderiza o inner com o mesmo guard de auth) para retrocompatibilidade da rota `/usuarios`.
- `src/pages/GestaoPage.tsx`: idem — exportar `GestaoInner`. Página `/admin/gestao` continua funcionando.
- Remover do inner os wrappers `min-h-screen px-... py-...` redundantes (o AdminConfigPage já provê padding) e o título principal duplicado, mantendo apenas o conteúdo funcional.

### 3. `src/components/Header.tsx`
- Quando `role === 'admin_master'`, **remover** os links "USUÁRIOS" e "GESTÃO" do menu (eles passam a viver dentro de "CONFIGURAÇÕES").
- Para `admin_producao`, manter "USUÁRIOS" como hoje (ele não tem acesso a Gestão e continua sem ver a aba dentro de Configurações).
- "CONFIGURAÇÕES" continua aparecendo para ambos admins.

### 4. Rotas
- Manter `/usuarios` e `/admin/gestao` no `App.tsx` (sem mudança) — apenas deixam de estar no menu do admin_master, mas continuam acessíveis via deep link e via as novas abas (que internamente apenas renderizam o conteúdo, sem navegar).

## Notas técnicas
- `AdminConfigPage` já tem guard que permite `admin_master` e `admin_producao`. As novas abas serão renderizadas condicionalmente: `{user.role === 'admin_master' && <TabsTrigger value="usuarios">…}`.
- `TabsList` usa `overflow-x-auto`, então 6 abas cabem bem.
- Não há mudanças de banco, RLS, RPC ou edge functions.

## Arquivos alterados
- `src/pages/AdminConfigPage.tsx`
- `src/pages/UsersManagementPage.tsx` (export adicional `UsersManagementInner`)
- `src/pages/GestaoPage.tsx` (export adicional `GestaoInner`)
- `src/components/Header.tsx`
