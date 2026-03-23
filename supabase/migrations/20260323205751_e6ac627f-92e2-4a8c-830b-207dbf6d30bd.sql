CREATE POLICY "Admins can insert orders for any user"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));