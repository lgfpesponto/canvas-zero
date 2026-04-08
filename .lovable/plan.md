

## Implementar RBAC completo com 4 roles (incluindo vendedor_comissao)

### Migração SQL

Adicionar 4 novos valores ao enum `app_role` e criar função helper `is_any_admin()`:

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_producao';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor_comissao';
```

Criar função `is_any_admin()`:
```sql
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_master', 'admin_producao')
  )
$$;
```

Migrar dados existentes (via insert tool):
- `7estrivos` → `admin_master`
- `fernanda` → `admin_producao`
- `site` → `vendedor_comissao`
- Demais `user` → `vendedor`

Atualizar todas as RLS policies que usam `has_role(auth.uid(), 'admin')` para usar `is_any_admin(auth.uid())` nas tabelas: `orders`, `profiles`, `deleted_orders`, `custom_options`, `gravata_stock`, `user_roles`.

---

### AuthContext (`src/contexts/AuthContext.tsx`)

1. Adicionar `role` ao tipo `User`:
```typescript
role: 'admin_master' | 'admin_producao' | 'vendedor' | 'vendedor_comissao';
```

2. Em `loadProfile`, carregar role específica:
```typescript
const userRole = roles?.[0]?.role || 'vendedor';
const isAdminFlag = userRole === 'admin_master' || userRole === 'admin_producao';
```

3. Derivar `isFernanda` da role: `user?.role === 'admin_producao'`

4. Exportar `role` no contexto para uso nos componentes.

---

### Dashboard routing (`src/pages/Index.tsx`)

- Substituir `isJuliana = user?.nomeUsuario === '7estrivos'` por `user?.role === 'admin_master'`
- Substituir `isFernanda` por `user?.role === 'admin_producao'`
- Manter roteamento: `admin_producao` → FernandaDashboard, `admin_master` → AdminDashboard, `vendedor`/`vendedor_comissao` → VendedorDashboard

---

### VendedorDashboard (`src/components/dashboard/VendedorDashboard.tsx`)

- Substituir `isSiteUser = user?.nomeUsuario === 'site'` por `user?.role === 'vendedor_comissao'`
- CommissionPanel visível apenas para `vendedor_comissao`
- "Pendente" oculto para `vendedor_comissao`

---

### AdminDashboard (`src/components/dashboard/AdminDashboard.tsx`)

- Substituir `user?.nomeUsuario === '7estrivos'` por `user?.role === 'admin_master'` (alertas, pedidos apagados, storage)
- Receber `isAdminMaster` como prop em vez de `isJuliana`

---

### Header (`src/components/Header.tsx`)

- Substituir `isJuliana = user?.nomeUsuario === '7estrivos'` por `user?.role === 'admin_master'`

---

### OrderDetailPage (`src/pages/OrderDetailPage.tsx`)

- Substituir `order.vendedor === 'Rancho Chique'` por verificação via role: admins veem cliente apenas se o pedido é de um `vendedor_comissao` (manter lógica existente ou usar role do pedido)
- Como o pedido não carrega role, manter a verificação por vendedor name para visibilidade do cliente pelo admin, mas o vendedor `vendedor_comissao` sempre vê seu próprio cliente

---

### OrderPage, BeltOrderPage, ExtrasPage

- Substituir `isFernanda = user?.nomeUsuario === 'fernanda'` por `user?.role === 'admin_producao'`
- Lógica: admin_producao precisa selecionar vendedor (não pode ser ele mesmo)

---

### UsersManagementPage (`src/pages/UsersManagementPage.tsx`)

1. Adicionar dropdown de Role nos dialogs de criação e edição com opções:
   - `admin_master`, `admin_producao`, `vendedor`, `vendedor_comissao`
2. Na criação, enviar `role` para edge function `create-user`
3. Na edição, atualizar `user_roles` via Supabase
4. Exibir coluna "Cargo" na tabela de usuários
5. Carregar roles junto com profiles (join ou query separada)

---

### Edge function `create-user` (`supabase/functions/create-user/index.ts`)

- Aceitar parâmetro `role` no body (default: `'vendedor'`)
- Inserir o valor recebido em `user_roles` em vez de hardcoded `'user'`
- Validar que o valor é um dos 4 permitidos
- Atualizar `has_role` check para aceitar `admin_master` ou `admin_producao`

---

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| Migration SQL | Enum + `is_any_admin()` + RLS policies |
| Data migration (insert) | Migrar roles existentes |
| `src/contexts/AuthContext.tsx` | User.role, loadProfile, derivar isFernanda |
| `src/pages/Index.tsx` | Substituir isJuliana/isFernanda por role |
| `src/components/dashboard/AdminDashboard.tsx` | isJuliana → isAdminMaster prop |
| `src/components/dashboard/VendedorDashboard.tsx` | isSiteUser → role === 'vendedor_comissao' |
| `src/components/Header.tsx` | isJuliana → role check |
| `src/pages/OrderPage.tsx` | isFernanda → role check |
| `src/pages/BeltOrderPage.tsx` | isFernanda → role check |
| `src/pages/ExtrasPage.tsx` | isFernandaUser → role check |
| `src/pages/OrderDetailPage.tsx` | Cliente visibility via role |
| `src/pages/ReportsPage.tsx` | isFernanda → role check |
| `src/pages/UsersManagementPage.tsx` | Dropdown de role, coluna na tabela |
| `supabase/functions/create-user/index.ts` | Aceitar parâmetro role |

