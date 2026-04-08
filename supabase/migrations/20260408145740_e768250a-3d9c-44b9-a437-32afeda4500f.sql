
-- Create is_any_admin helper function using text comparison
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin_master', 'admin_producao', 'admin')
  )
$$;

-- Update RLS policies on orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert orders for any user" ON public.orders;
CREATE POLICY "Admins can insert orders for any user" ON public.orders FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));

-- Update RLS policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));

-- Update RLS policies on deleted_orders
DROP POLICY IF EXISTS "Admins can view deleted orders" ON public.deleted_orders;
CREATE POLICY "Admins can view deleted orders" ON public.deleted_orders FOR SELECT TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert deleted orders" ON public.deleted_orders;
CREATE POLICY "Admins can insert deleted orders" ON public.deleted_orders FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update deleted orders" ON public.deleted_orders;
CREATE POLICY "Admins can update deleted orders" ON public.deleted_orders FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete deleted orders" ON public.deleted_orders;
CREATE POLICY "Admins can delete deleted orders" ON public.deleted_orders FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- Update RLS policies on custom_options
DROP POLICY IF EXISTS "Admins can insert" ON public.custom_options;
CREATE POLICY "Admins can insert" ON public.custom_options FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update" ON public.custom_options;
CREATE POLICY "Admins can update" ON public.custom_options FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete" ON public.custom_options;
CREATE POLICY "Admins can delete" ON public.custom_options FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- Update RLS policies on gravata_stock
DROP POLICY IF EXISTS "Admins can insert stock" ON public.gravata_stock;
CREATE POLICY "Admins can insert stock" ON public.gravata_stock FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update stock" ON public.gravata_stock;
CREATE POLICY "Admins can update stock" ON public.gravata_stock FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete stock" ON public.gravata_stock;
CREATE POLICY "Admins can delete stock" ON public.gravata_stock FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- Update RLS policies on user_roles
DROP POLICY IF EXISTS "Admins can select all roles" ON public.user_roles;
CREATE POLICY "Admins can select all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));
