-- Fix 1: Restrict profiles INSERT to authenticated users only
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Fix 2: Restrict user_roles to prevent privilege escalation
-- The existing "Admins can manage roles" ALL policy already covers admin access
-- We need to ensure non-admin users cannot INSERT/UPDATE
-- Drop and recreate with explicit restrictions
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

CREATE POLICY "Admins can select all roles" ON user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));