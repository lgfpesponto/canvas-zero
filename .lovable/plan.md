

## Plano: Finalizar Interface do Módulo de Configurações

### Situação Atual

Tudo já foi implementado na mensagem anterior:
- **Rotas**: `/admin/configuracoes`, `/admin/configuracoes/:slug`, `/admin/configuracoes/:slug/:categoriaId` já existem no `App.tsx`
- **Páginas**: `AdminConfigPage`, `AdminConfigFichaPage`, `AdminConfigVariacoesPage` já existem com framer-motion, caixa baixa, ícones Lucide, entrada em massa, switches, etc.
- **Hooks**: `useAdminConfig.ts` com todos os CRUD (queries + mutations) já conectados ao Supabase
- **Banco**: Tabelas `ficha_tipos`, `ficha_categorias`, `ficha_variacoes`, `status_etapas`, `ficha_workflow` com RLS e seed data

### O que falta

Apenas **1 item**: adicionar o link "CONFIGURAÇÕES" no menu do Header para usuários admin.

### Implementação

**Arquivo**: `src/components/Header.tsx`

Adicionar na lista `navItems` (quando `isAdmin` é true):
```typescript
{ label: 'CONFIGURAÇÕES', path: '/admin/configuracoes' }
```

Isso fará o link aparecer no menu (desktop e mobile) apenas para `admin_master` e `admin_producao`.

