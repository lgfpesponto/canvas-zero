

## Redirecionar edição de pedido para página de detalhes

### Problema

No `EditOrderPage.tsx`, após salvar um pedido editado, o usuário é redirecionado para `/relatorios` (linha 504). O ideal é ir para `/pedido/${id}` — a página de detalhes do pedido recém-editado — como já acontece no `EditExtrasPage.tsx`.

### Alteração

**Arquivo: `src/pages/EditOrderPage.tsx` (linha 504)**

Substituir:
```typescript
navigate('/relatorios');
```
Por:
```typescript
navigate(`/pedido/${id}`);
```

A variável `id` já existe no componente (vem de `useParams`). O toast continua aparecendo durante a transição pois o Sonner persiste entre rotas. A `OrderDetailPage` faz fetch dos dados ao montar, então as alterações recém-salvas já estarão refletidas.

### Nenhuma outra alteração necessária

- O `EditExtrasPage.tsx` já redireciona corretamente para `/pedido/${order.id}`
- O toast persiste entre navegações (Sonner global)
- A `OrderDetailPage` busca dados frescos do Supabase ao carregar

