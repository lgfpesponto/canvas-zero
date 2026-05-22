UPDATE public.orders
SET preco = 30,
    preco_migrado_v2 = true,
    alteracoes = COALESCE(alteracoes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'usuario', 'Sistema',
      'descricao', 'Correção automática: Gravata Pronta Entrega = R$ 30',
      'afetouValor', true
    ))
WHERE tipo_extra = 'gravata_pronta_entrega' AND COALESCE(preco, 0) = 0;

UPDATE public.orders
SET preco = 50,
    preco_migrado_v2 = true,
    alteracoes = COALESCE(alteracoes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'usuario', 'Sistema',
      'descricao', 'Correção automática: Regata Pronta Entrega = R$ 50',
      'afetouValor', true
    ))
WHERE tipo_extra = 'regata_pronta_entrega' AND COALESCE(preco, 0) = 0;