INSERT INTO public.ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ativo, ordem)
SELECT c.categoria_id, c.id, 'Não tem', 0, true, 0
FROM public.ficha_campos c
WHERE c.slug = 'area_metal'
  AND NOT EXISTS (
    SELECT 1 FROM public.ficha_variacoes v WHERE v.campo_id = c.id AND v.nome = 'Não tem'
  );