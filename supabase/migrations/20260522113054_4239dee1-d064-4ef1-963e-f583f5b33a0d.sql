CREATE TABLE public.admin_assistant_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_assistant_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select planos"
  ON public.admin_assistant_planos FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "admin_master insert planos"
  ON public.admin_assistant_planos FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "admin_master update planos"
  ON public.admin_assistant_planos FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "admin_master delete planos"
  ON public.admin_assistant_planos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE OR REPLACE FUNCTION public.touch_admin_assistant_planos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_admin_assistant_planos
  BEFORE UPDATE ON public.admin_assistant_planos
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_admin_assistant_planos();

CREATE INDEX idx_admin_assistant_planos_created_by ON public.admin_assistant_planos(created_by);
CREATE INDEX idx_admin_assistant_planos_updated_at ON public.admin_assistant_planos(updated_at DESC);