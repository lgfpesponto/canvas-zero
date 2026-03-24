

## Problem

The recent orders created by Fernanda selecting other vendedores (Larissa, Denise, Samuel) still have `user_id = Fernanda's ID` instead of the vendedor's ID. This is confirmed by the database query:

```text
numero | vendedor                  | user_id (profile)
60334  | Samuel Silva Plácido      | Fernanda ADM
30014  | Larissa Silva             | Fernanda ADM  
30013  | Larissa Silva             | Fernanda ADM
30012  | Larissa Silva             | Fernanda ADM
1887   | Denise Garcia Feliciano   | Fernanda ADM
```

The code fix is already in place in `AuthContext.tsx`. These orders were likely created before the latest build deployed.

## Solution

Run a data migration to reassign all mismatched orders to the correct vendedor's profile, exactly as we did before:

```sql
UPDATE orders o
SET user_id = p.id
FROM profiles p
WHERE o.vendedor = p.nome_completo
  AND o.user_id != p.id;
```

This will fix all 5 recent orders (and any others that may be mismatched). No code changes needed -- the `addOrder` function already has the correct logic for future orders.

## What this changes
- Orders 60334, 30014, 30013, 30012, 1887 will be reassigned to their respective vendedores
- Vendedores (Larissa, Samuel, Denise) will see these orders in their portal
- Admins (Fernanda, Juliana) continue seeing ALL orders via admin RLS policies

