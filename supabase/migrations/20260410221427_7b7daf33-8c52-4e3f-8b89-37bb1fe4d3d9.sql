
-- New table for dynamic form fields
CREATE TABLE public.ficha_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tipo_id uuid REFERENCES public.ficha_tipos(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  slug text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('texto', 'selecao', 'multipla', 'checkbox')),
  obrigatorio boolean DEFAULT false,
  ordem int DEFAULT 0,
  opcoes jsonb DEFAULT '[]',
  vinculo text,
  desc_condicional boolean DEFAULT false,
  ativo boolean DEFAULT true,
  UNIQUE(ficha_tipo_id, slug)
);

ALTER TABLE public.ficha_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ficha_campos"
  ON public.ficha_campos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert ficha_campos"
  ON public.ficha_campos FOR INSERT
  TO authenticated WITH CHECK (is_any_admin(auth.uid()));

CREATE POLICY "Admins can update ficha_campos"
  ON public.ficha_campos FOR UPDATE
  TO authenticated USING (is_any_admin(auth.uid()));

CREATE POLICY "Admins can delete ficha_campos"
  ON public.ficha_campos FOR DELETE
  TO authenticated USING (is_any_admin(auth.uid()));

-- Add columns to ficha_tipos
ALTER TABLE public.ficha_tipos
  ADD COLUMN IF NOT EXISTS tipo_ficha text DEFAULT 'classica',
  ADD COLUMN IF NOT EXISTS campos_nativos boolean DEFAULT true;

-- Mark existing fichas as classica
UPDATE public.ficha_tipos SET tipo_ficha = 'classica' WHERE tipo_ficha IS NULL;
