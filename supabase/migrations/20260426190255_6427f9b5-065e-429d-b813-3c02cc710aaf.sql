-- Restringir DELETE a admin_master apenas

-- orders
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Only admin_master can delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- deleted_orders
DROP POLICY IF EXISTS "Admins can delete deleted orders" ON public.deleted_orders;
CREATE POLICY "Only admin_master can delete deleted orders"
  ON public.deleted_orders FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- custom_options
DROP POLICY IF EXISTS "Admins can delete" ON public.custom_options;
CREATE POLICY "Only admin_master can delete custom_options"
  ON public.custom_options FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- ficha_tipos
DROP POLICY IF EXISTS "Admins can delete ficha_tipos" ON public.ficha_tipos;
CREATE POLICY "Only admin_master can delete ficha_tipos"
  ON public.ficha_tipos FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- ficha_categorias
DROP POLICY IF EXISTS "Admins can delete ficha_categorias" ON public.ficha_categorias;
CREATE POLICY "Only admin_master can delete ficha_categorias"
  ON public.ficha_categorias FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- ficha_campos
DROP POLICY IF EXISTS "Admins can delete ficha_campos" ON public.ficha_campos;
CREATE POLICY "Only admin_master can delete ficha_campos"
  ON public.ficha_campos FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- ficha_variacoes
DROP POLICY IF EXISTS "Admins can delete ficha_variacoes" ON public.ficha_variacoes;
CREATE POLICY "Only admin_master can delete ficha_variacoes"
  ON public.ficha_variacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- ficha_workflow
DROP POLICY IF EXISTS "Admins can delete ficha_workflow" ON public.ficha_workflow;
CREATE POLICY "Only admin_master can delete ficha_workflow"
  ON public.ficha_workflow FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- status_etapas
DROP POLICY IF EXISTS "Admins can delete status_etapas" ON public.status_etapas;
CREATE POLICY "Only admin_master can delete status_etapas"
  ON public.status_etapas FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- gravata_stock
DROP POLICY IF EXISTS "Admins can delete stock" ON public.gravata_stock;
CREATE POLICY "Only admin_master can delete stock"
  ON public.gravata_stock FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admin_master can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));