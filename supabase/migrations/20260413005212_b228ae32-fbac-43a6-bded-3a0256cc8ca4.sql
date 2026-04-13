
ALTER TABLE public.ficha_campos DROP CONSTRAINT ficha_campos_tipo_check;
ALTER TABLE public.ficha_campos ADD CONSTRAINT ficha_campos_tipo_check
  CHECK (tipo = ANY (ARRAY['texto','selecao','multipla','checkbox','numero','textarea']));
