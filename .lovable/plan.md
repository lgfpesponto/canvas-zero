## "Pendente / A Receber" = Conferido + Cobrado, e prazo de produção concluído ao chegar em Conferido

### 1. Atualizar valor pendente nos dashboards (admin_master e vendedor)

**Migration nova:** atualizar a RPC `public.get_pending_value` para somar pedidos em `Conferido` e `Cobrado` (hoje soma `Entregue` e `Cobrado`). Também passa a respeitar o desconto, igual `get_orders_totals`.

```sql
CREATE OR REPLACE FUNCTION public.get_pending_value(vendor text DEFAULT NULL)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(
    GREATEST(COALESCE(preco,0) * COALESCE(quantidade,1) - COALESCE(desconto,0), 0)
  ), 0)
  FROM orders
  WHERE status IN ('Conferido', 'Cobrado')
    AND (vendor IS NULL OR vendedor = vendor);
$$;
```

Como `VendedorDashboard`, `AdminDashboard` e `ProfilePage` já chamam `supabase.rpc('get_pending_value', ...)`, nenhum código no front precisa mudar — o card "Pendente / A Receber" passa a refletir Conferido + Cobrado automaticamente.

### 2. Prazo de produção sempre concluído quando o pedido está em "Conferido"

**Arquivo:** `src/lib/orderDeadline.ts`

Adicionar `'Conferido'` ao array `FINAL_STAGES`:

```ts
export const FINAL_STAGES = ['Baixa Site (Despachado)', 'Expedição', 'Entregue', 'Conferido', 'Cobrado', 'Pago', 'Cancelado'];
```

Isso faz com que:
- `getOrderDeadlineInfo` retorne `isFinal: true`, `label: '✓'`, tone success para qualquer pedido em "Conferido" — ou seja, o prazo de produção aparece como concluído na lista, na busca, no painel e no PDF do detalhe.
- `isAlertOrder` deixe de marcar pedidos "Conferido" como atrasados (consistente, pois já passou pela conferência).
- `hasReachedFinalStage` reconheça "Conferido" como etapa final.

Nenhuma outra parte do sistema precisa de ajuste — a lógica de prazo é centralizada nesse helper.

### Resultado

- Dashboards (vendedor e admin_master) e a página de Perfil mostram em "Pendente / A Receber" a soma dos pedidos em **Conferido + Cobrado**.
- Pedidos em **Conferido** já aparecem com prazo de produção concluído (`✓`) em qualquer tela e PDF.
