
CREATE OR REPLACE FUNCTION public.get_user_full_name(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT nome_completo FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

DROP POLICY IF EXISTS "Users read own orders or admin reads all" ON public.orders;
CREATE POLICY "Users read own orders or admin reads all" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR vendedor = public.get_user_full_name(auth.uid())
  );
