

## Estoque Gravata: Abater para todos + Editar/Excluir (Admin)

### Problema atual

1. **RLS bloqueia abatimento**: A policy de UPDATE na `gravata_stock` só permite admins. Quando um revendedor compra, o `update({ quantidade: quantidade - 1 })` falha silenciosamente.
2. **Painel de estoque**: Admins só podem adicionar estoque, não editar quantidade existente nem excluir variações.

### Alterações

#### 1. Migração SQL — Permitir qualquer autenticado decrementar estoque

Criar uma função `security definer` que decrementa o estoque de forma segura (qualquer usuário autenticado pode chamar):

```sql
CREATE OR REPLACE FUNCTION public.decrement_stock(stock_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE gravata_stock
  SET quantidade = quantidade - 1
  WHERE id = stock_id AND quantidade > 0;
END;
$$;
```

Isso evita dar permissão de UPDATE geral a todos — apenas a função controlada pode decrementar.

#### 2. `src/pages/ExtrasPage.tsx` — Usar RPC para decrementar

Na linha 222, trocar:
```ts
await supabase.from('gravata_stock').update(...)
```
por:
```ts
await supabase.rpc('decrement_stock', { stock_id: selectedStockId });
```

Após o decremento, chamar `fetchStock()` para atualizar a lista local.

#### 3. `src/pages/ExtrasPage.tsx` — Editar/Excluir no painel de estoque (admin)

No dialog "Organizar Estoque", para cada item na lista de estoque atual (linhas 603-608), adicionar:
- **Botão editar** (ícone lápis): abre inline um Input para alterar a quantidade, com botão Salvar → `supabase.from('gravata_stock').update({ quantidade }).eq('id', item.id)`
- **Botão excluir** (ícone lixeira): confirma e executa `supabase.from('gravata_stock').delete().eq('id', item.id)`

Ambos chamam `fetchStock()` após a operação.

#### 4. Tipos TypeScript

Adicionar `decrement_stock` ao `types.ts` (será regenerado automaticamente pela migração).

### Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Função `decrement_stock` |
| `src/pages/ExtrasPage.tsx` | RPC para decrementar, botões editar/excluir no painel admin |

