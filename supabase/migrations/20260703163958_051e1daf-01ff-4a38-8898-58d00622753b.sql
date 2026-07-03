ALTER TABLE public.order_templates
  ADD COLUMN IF NOT EXISTS tipo TEXT;

UPDATE public.order_templates
SET tipo = CASE
  WHEN (form_data->>'__tipo') = 'cinto' THEN 'cinto'
  ELSE 'bota'
END
WHERE tipo IS NULL;

ALTER TABLE public.order_templates
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN tipo SET DEFAULT 'bota';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_templates_tipo_check'
  ) THEN
    ALTER TABLE public.order_templates
      ADD CONSTRAINT order_templates_tipo_check CHECK (tipo IN ('bota','cinto'));
  END IF;
END $$;