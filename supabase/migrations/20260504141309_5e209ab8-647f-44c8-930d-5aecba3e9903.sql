UPDATE public.orders
SET
  status = 'Entrada Bordado 7Estrivos',
  historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Entrada Bordado 7Estrivos',
      'descricao', 'Migração automática: status legado "Bordado 7Estrivos" normalizado para "Entrada Bordado 7Estrivos"',
      'usuario', 'Sistema'
    )
  )
WHERE status IN ('Bordado', 'Bordado 7Estrivos');