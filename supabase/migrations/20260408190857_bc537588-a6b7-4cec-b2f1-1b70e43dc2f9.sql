-- 1. Remove user INSERT policy on verification_codes (codes must only be created by edge functions via service role)
DROP POLICY IF EXISTS "Users can insert own codes" ON public.verification_codes;

-- 2. Fix profiles INSERT policy - replace overly permissive one with owner-scoped
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());