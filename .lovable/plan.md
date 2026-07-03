## Objetivo
O card "Pendente" (vendedor) e "A Receber" (admin master) deve somar apenas pedidos com status **"Cobrado"** — não mais Conferido + Cobrado.

## Alteração
Migration atualizando a função `public.get_pending_value(vendor text)`:

```sql
CREATE OR REPLACE FUNCTION public.get_pending_value(vendor text DEFAULT NULL)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(COALESCE(preco, 0)), 0)
  FROM orders
  WHERE status = 'Cobrado'
    AND (vendor IS NULL OR vendedor = vendor);
$$;
```

## Impacto
- `VendedorDashboard` e `AdminDashboard` já chamam essa RPC — refletem automaticamente.
- Pedidos apenas Conferidos deixam de aparecer no valor pendente.
- Nenhum código de frontend precisa mudar.

## Fora de escopo
Financeiro > A Pagar/Receber, comissões, outras métricas.