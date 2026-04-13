
-- Add categoria_id to ficha_campos (nullable for backward compat)
ALTER TABLE public.ficha_campos
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.ficha_categorias(id) ON DELETE SET NULL;

-- Add campo_id to ficha_variacoes (nullable for backward compat)
ALTER TABLE public.ficha_variacoes
  ADD COLUMN IF NOT EXISTS campo_id uuid REFERENCES public.ficha_campos(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ficha_campos_categoria_id ON public.ficha_campos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ficha_variacoes_campo_id ON public.ficha_variacoes(campo_id);
