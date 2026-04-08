

## Implementar RBAC com roles admin_master, admin_producao, vendedor

### Contexto atual

- A tabela `user_roles` já existe com enum `app_role` (valores: `admin`, `user`)
- O AuthContext carrega roles da tabela `user_roles` e define `isAdmin` (boolean)
- Verificações por nome fixo (`isFernanda`, `isJuliana`, `nomeUsuario === '7estrivos'`) controlam dashboards e funcionalidades
- Usuários atuais: `7estrivos` (role admin), `fernanda` (role admin), demais (role user)

### Importante: roles ficam na tabela `user_roles` (não em `profiles`)

Per boas práticas de segurança, roles são mantidos na tabela separada `user_roles` com a função `has_role()` já existente.

---

### Parte 1 — Migração do banco de dados

1. Adicionar novos valores ao enum `app_role`:
```sql
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin_master';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin_producao';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vendedor';
```

2. Migrar roles existentes:
   - `7estrivos`: `admin` → `admin_master`
   - `fernanda`: `admin` → `admin_producao`
   - Todos com `user` → `vendedor`

```sql
UPDATE user_roles SET role = 'admin_master' WHERE user_id = (SELECT id FROM profiles WHERE nome_usuario = '7estrivos');
UPDATE user_roles SET role = 'admin_producao' WHERE user_id = (SELECT id FROM profiles WHERE nome_usuario = 'fernanda');
UPDATE user_roles SET role = 'vendedor' WHERE role = 'user';
```

---

### Parte 2 — AuthContext

1. Adicionar `role` ao tipo `User`:
```typescript
export interface User {
  // ...existente
  role: 'admin_master' | 'admin_producao' | 'vendedor';
}
```

2. Em `loadProfile`, carregar a role específica do `user_roles`:
```typescript
const userRole = roles?.[0]?.role || 'vendedor';
const isAdminFlag = userRole === 'admin_master' || userRole === 'admin_producao';
```

3. Substituir `isFernanda` derivado:
```typescript
const isFernanda = user?.role === 'admin_producao';
```

4. Manter `isAdmin` como `true` para `admin_master` e `admin_producao` (ambos veem todos os pedidos via RLS).

---

### Parte 3 — Gestão de Usuários (UsersManagementPage)

1. Adicionar campo de seleção de Role nos dialogs de criação e edição:
   - Dropdown com opções: `admin_master`, `admin_producao`, `vendedor`
   - Na criação, enviar a role para a edge function `create-user`
   - Na edição, atualizar diretamente na tabela `user_roles`

2. Exibir coluna "Role" na tabela de usuários (carregar de `user_roles` junto com `profiles`)

3. Atualizar edge function `create-user` para aceitar parâmetro `role` e inserir o valor correto em `user_roles`

---

### Parte 4 — Substituir verificações por nome nos dashboards

| Verificação atual | Nova verificação |
|---|---|
| `user?.nomeUsuario === '7estrivos'` | `user?.role === 'admin_master'` |
| `user?.nomeUsuario === 'fernanda'` / `isFernanda` | `user?.role === 'admin_producao'` |
| `isJuliana` | `user?.role === 'admin_master'` |
| `isAdmin` | `user?.role === 'admin_master' \|\| user?.role === 'admin_producao'` |

**Arquivos afetados:**
- `src/pages/Index.tsx` — `isJuliana`, `isFernanda`, roteamento de dashboards
- `src/components/dashboard/AdminDashboard.tsx` — `isJuliana`, alertas, pedidos apagados, storage
- `src/components/Header.tsx` — `isJuliana` (storage warning)
- `src/pages/OrderPage.tsx` — `isFernanda` (seleção de vendedor)
- `src/pages/ExtrasPage.tsx` — `isFernandaUser`
- `src/pages/BeltOrderPage.tsx` — se usar `isFernanda`
- `src/pages/OrderDetailPage.tsx` — desconto só para `admin_master`
- `src/pages/ReportsPage.tsx` — `isFernanda`
- `src/contexts/AuthContext.tsx` — derivar `isFernanda` da role

---

### Parte 5 — RLS (sem mudanças necessárias)

As policies RLS atuais usam `has_role(auth.uid(), 'admin')`. Precisamos atualizar para aceitar `admin_master` e `admin_producao`:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean ...
-- mantém igual
```

Mas como as policies usam `has_role(uid, 'admin')` e os novos roles são diferentes, precisamos atualizar as policies para:
```sql
has_role(auth.uid(), 'admin_master') OR has_role(auth.uid(), 'admin_producao')
```

Ou criar uma função helper `is_any_admin()`:
```sql
CREATE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role IN ('admin_master', 'admin_producao')
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

E atualizar todas as RLS policies para usar `is_any_admin(auth.uid())`.

---

### Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| Migration SQL | Enum + dados + função `is_any_admin` + policies |
| `src/contexts/AuthContext.tsx` | User.role, loadProfile, derivar isFernanda |
| `src/pages/Index.tsx` | Substituir isJuliana/isFernanda por role checks |
| `src/components/dashboard/AdminDashboard.tsx` | Substituir isJuliana por role check |
| `src/components/Header.tsx` | Substituir isJuliana por role check |
| `src/pages/OrderPage.tsx` | Substituir isFernanda por role check |
| `src/pages/ExtrasPage.tsx` | Substituir isFernandaUser por role check |
| `src/pages/OrderDetailPage.tsx` | Substituir nome check por role check |
| `src/pages/ReportsPage.tsx` | Substituir isFernanda por role check |
| `src/pages/UsersManagementPage.tsx` | Dropdown de role, coluna role na tabela |
| `supabase/functions/create-user/index.ts` | Aceitar parâmetro role |

