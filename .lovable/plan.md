

## Restringir exclusões apenas ao admin_master (Juliana)

### Problema

Hoje várias políticas RLS e checagens de UI permitem que **qualquer admin** (`admin_master` + `admin_producao`) apague registros via `is_any_admin(auth.uid())`. Você quer que **só a Juliana** (`admin_master`, login `7estrivos`) consiga apagar qualquer coisa.

### Investigação realizada

Olhando o schema atual, as seguintes políticas de **DELETE** usam `is_any_admin()` e precisam virar `has_role(auth.uid(), 'admin_master')`:

| Tabela | Política DELETE atual |
|---|---|
| `orders` | `Admins can delete orders` → is_any_admin |
| `deleted_orders` | `Admins can delete deleted orders` → is_any_admin |
| `custom_options` | `Admins can delete` → is_any_admin |
| `ficha_tipos` | `Admins can delete ficha_tipos` → is_any_admin |
| `ficha_categorias` | `Admins can delete ficha_categorias` → is_any_admin |
| `ficha_campos` | `Admins can delete ficha_campos` → is_any_admin |
| `ficha_variacoes` | `Admins can delete ficha_variacoes` → is_any_admin |
| `ficha_workflow` | `Admins can delete ficha_workflow` → is_any_admin |
| `status_etapas` | `Admins can delete status_etapas` → is_any_admin |
| `gravata_stock` | `Admins can delete stock` → is_any_admin |
| `user_roles` | `Admins can delete roles` → is_any_admin |

`profiles` já não permite DELETE pra ninguém — fica como está. `financeiro_*` já é só `admin_master`. `verification_codes` é só do próprio usuário. `order_templates` é só do dono — pessoal, fica.

### Mudanças

**1. Migration SQL** — recriar todas as políticas DELETE acima trocando `is_any_admin(auth.uid())` por `has_role(auth.uid(), 'admin_master'::app_role)`:

```sql
-- exemplo (replicar para as 11 tabelas)
DROP POLICY "Admins can delete orders" ON public.orders;
CREATE POLICY "Only admin_master can delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));
```

Depois disso, mesmo que o frontend mande um DELETE como `admin_producao`, o banco bloqueia. Essa é a camada **forte** de segurança.

**2. Camada de UI** (esconder botões pra `admin_producao`)

Vou inspecionar e ajustar (procurando por `onDelete`, `handleDelete`, ícones `Trash2`, `useDelete*` em):
- `src/pages/AdminConfigPage.tsx` — desativar/excluir fichas
- `src/pages/AdminConfigFichaPage.tsx` — excluir categorias/campos/variações
- `src/pages/UsersManagementPage.tsx` — excluir usuários (já passa pela edge function `delete-user`)
- `src/pages/ReportsPage.tsx` / `OrderDetailPage.tsx` — exclusão em massa de pedidos
- `src/components/admin/FichaBuilder.tsx`
- Componentes de financeiro (já é só admin_master, ok)

Padrão que vou usar:
```tsx
const canDelete = user?.role === 'admin_master';
{canDelete && <Button onClick={onDelete}><Trash2 /></Button>}
```

Pra `admin_producao` o botão de lixeira simplesmente não aparece, evitando frustração ("cliquei e deu erro").

**3. Edge function `delete-user`** — adicionar checagem manual no início:
```ts
// só admin_master pode chamar
const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', callerId);
if (!roles?.some(r => r.role === 'admin_master')) {
  return new Response('Forbidden', { status: 403 });
}
```

### O que NÃO mexo

- Políticas SELECT/INSERT/UPDATE — `admin_producao` continua com acesso normal pra ler, criar e editar.
- `profiles` (já bloqueado pra DELETE).
- `financeiro_*` (já é só admin_master).
- `order_templates` (cada um apaga o próprio).
- `verification_codes` (cada um apaga os próprios).
- Função `is_any_admin` — continua existindo pra outras checagens não-DELETE.

### Considerações importantes

- **Cuidado com cascatas**: hoje `useDeleteCategoria` (em `useAdminConfig.ts`) faz `delete from ficha_variacoes` antes de `delete from ficha_categorias`. Como ambas só serão permitidas pra admin_master, segue funcionando — mas pra admin_producao vai falhar silenciosamente. Por isso a camada UI (esconder botão) é essencial.
- **Pedidos cancelados (`Cancelado`)**: a regra de "data preservation" se mantém — admin_producao continua podendo **mover pra Cancelado** (UPDATE), mas só Juliana pode **DELETAR de fato**.
- **Bulk delete de pedidos**: hoje qualquer admin pode fazer no `OrderDetailPage`/`ReportsPage`. Vou esconder o botão pra admin_producao.

### Validação (você faz depois)

1. Logar como Fernanda (`admin_producao`) → tentar excluir uma ficha/pedido/usuário → botão de lixeira não aparece em lugar nenhum.
2. Logar como Juliana (`admin_master` / `7estrivos`) → continua com todos os botões de exclusão funcionando normalmente.
3. Tentar `DELETE` direto via SQL como admin_producao (cenário de segurança) → bloqueado pelo RLS.

### Pergunta

Tem algum caso específico onde admin_producao **precisa** apagar (ex: algum status, algum dado de produção)? Pelo que entendi, **nada** — só Juliana. Confirma?

Aprovar pra eu implementar a migration + ajustes de UI.

