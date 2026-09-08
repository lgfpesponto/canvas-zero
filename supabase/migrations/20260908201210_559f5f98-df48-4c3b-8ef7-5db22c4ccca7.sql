DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

CREATE POLICY "Users can update own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id OR vendedor = public.current_user_nome_completo())
  AND status = 'Em aberto'
)
WITH CHECK (
  (auth.uid() = user_id OR vendedor = public.current_user_nome_completo())
  AND status = 'Em aberto'
);