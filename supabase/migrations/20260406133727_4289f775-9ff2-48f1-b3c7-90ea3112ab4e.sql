
CREATE TABLE public.deleted_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid,
  dismissed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.deleted_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deleted orders" ON public.deleted_orders
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert deleted orders" ON public.deleted_orders
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update deleted orders" ON public.deleted_orders
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete deleted orders" ON public.deleted_orders
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
