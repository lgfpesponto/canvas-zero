DO $$
DECLARE
  v_tipo uuid;
  v_next int;
  v_snap jsonb;
BEGIN
  SELECT id INTO v_tipo FROM public.ficha_tipos WHERE slug = 'bota' LIMIT 1;
  IF v_tipo IS NULL THEN RAISE NOTICE 'tipo bota nao encontrado'; RETURN; END IF;

  SELECT COALESCE(MAX(versao), 0) + 1 INTO v_next FROM public.ficha_versoes WHERE ficha_tipo_id = v_tipo;

  SELECT jsonb_build_object(
    'categorias', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.ordem) FROM public.ficha_categorias c WHERE c.ficha_tipo_id = v_tipo), '[]'::jsonb),
    'campos', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.ordem) FROM public.ficha_campos f WHERE f.ficha_tipo_id = v_tipo), '[]'::jsonb),
    'variacoes', COALESCE((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.ordem) FROM public.ficha_variacoes v JOIN public.ficha_categorias c2 ON c2.id = v.categoria_id WHERE c2.ficha_tipo_id = v_tipo), '[]'::jsonb),
    'ficha_tipo', (SELECT jsonb_build_object('id', t.id, 'slug', t.slug, 'lead_time_dias', t.lead_time_dias) FROM public.ficha_tipos t WHERE t.id = v_tipo)
  ) INTO v_snap;

  UPDATE public.ficha_versoes SET ativa = false WHERE ficha_tipo_id = v_tipo AND ativa;

  INSERT INTO public.ficha_versoes (ficha_tipo_id, versao, snapshot, descricao_mudanca, ativa)
  VALUES (
    v_tipo, v_next, v_snap,
    'Nova ficha: navegação por Enter campo a campo, sugestões de cor (linha/borrachinha/vivo e cores de bordado/laser/recorte), menu de categorias + atalhos flutuantes, cabeçalho e numeração automática, fluxo de Metais, campos de quantidade vazios.',
    true
  );
END $$;