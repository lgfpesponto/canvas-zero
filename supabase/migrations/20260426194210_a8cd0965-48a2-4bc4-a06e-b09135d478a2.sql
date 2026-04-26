ALTER TABLE public.order_templates
  ADD COLUMN IF NOT EXISTS sent_by uuid,
  ADD COLUMN IF NOT EXISTS sent_by_name text,
  ADD COLUMN IF NOT EXISTS seen boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Users can insert own templates" ON public.order_templates;

CREATE POLICY "Users can insert templates own or sent"
  ON public.order_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = sent_by
  );

CREATE INDEX IF NOT EXISTS idx_order_templates_user_seen
  ON public.order_templates (user_id, seen);