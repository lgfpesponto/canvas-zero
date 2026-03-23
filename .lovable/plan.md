

## Fix: Orders created by admin appear in the selected vendor's portal

### Problem
When an admin creates an order selecting a vendedor, the order is saved with `user_id = admin's ID`. The vendedor can't see it because RLS filters by `user_id = auth.uid()`.

### Changes

#### 1. Code: `src/contexts/AuthContext.tsx` — `addOrder` function (line ~585)

Before building `dbRow`, if the user is admin and the `vendedor` name differs from the admin's own name, look up the vendedor's profile ID by `nome_completo` and use it as `user_id`:

```typescript
let targetUserId = user.id;
if (isAdmin && rest.vendedor && rest.vendedor !== user.nomeCompleto) {
  const { data: vendorProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('nome_completo', rest.vendedor)
    .maybeSingle();
  if (vendorProfile) {
    targetUserId = vendorProfile.id;
  }
}
const dbRow = orderToDbRow(newOrder, targetUserId);
```

#### 2. Database migration: Allow admins to INSERT orders for any user

Current INSERT policy only allows `auth.uid() = user_id`. Add:

```sql
CREATE POLICY "Admins can insert orders for any user"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

#### 3. Data migration: Reassign existing orders to correct vendors

Update all existing orders so `user_id` matches the vendedor's profile:

```sql
UPDATE orders o
SET user_id = p.id
FROM profiles p
WHERE o.vendedor = p.nome_completo
  AND o.user_id != p.id;
```

This runs once to fix all historical orders. Admins (7estrivos, fernanda) retain full visibility via the existing "Admins can view all orders" RLS policy -- no change needed there.

### What stays the same
- Admin users (7estrivos, fernanda) continue seeing ALL orders via admin RLS policies
- Fernanda keeps her specialized dashboard with limited reports
- Juliana (7estrivos) keeps full dashboard with alert orders and all reports
- Vendedores see only their own orders

