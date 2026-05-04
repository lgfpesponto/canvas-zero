UPDATE public.orders
SET
  status = CASE status
    WHEN 'Pesponto' THEN 'Pespontando'
    WHEN 'Bordado'  THEN 'Entrada Bordado 7Estrivos'
  END,
  historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'local', CASE status WHEN 'Pesponto' THEN 'Pespontando' ELSE 'Entrada Bordado 7Estrivos' END,
    'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM/YYYY'),
    'hora', to_char((now() AT TIME ZONE 'America/Sao_Paulo'), 'HH24:MI'),
    'usuario', 'Sistema (migração)',
    'observacao', 'Migração automática: novo fluxo de cinto (status anterior: ' || status || ')'
  ))
WHERE tipo_extra = 'cinto' AND status IN ('Pesponto', 'Bordado');