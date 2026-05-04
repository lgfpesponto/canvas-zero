-- 1) RPC: lista nomes dos usuários com role 'bordado'
CREATE OR REPLACE FUNCTION public.list_bordado_usuarios()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(p.nome_completo ORDER BY p.nome_completo), ARRAY[]::text[])
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'bordado';
$$;

-- 2) Corrige os 6 pedidos: remove o evento Aguardando 07:32 do dia 04/05/2026
UPDATE public.orders
SET historico = (
  SELECT COALESCE(jsonb_agg(h ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(historico) WITH ORDINALITY arr(h, ord)
  WHERE NOT (
    h->>'local' = 'Aguardando'
    AND (h->>'data') = '2026-05-04'
    AND (h->>'hora') = '07:32'
    AND h->>'usuario' = 'Mariana ADM'
  )
)
WHERE id IN (
  '524b5d07-0a29-4107-9675-fa5d49682fbf',
  '7cb86a2d-d6aa-4c74-bb2e-8dd1dc9d4e3a',
  'c2125f0d-8e15-4394-a0ed-d465ffb6c0fe',
  '210ae877-ac7b-44a3-8c13-c68785d904c6',
  '702376c7-477c-4057-ae1a-1aa7dc9899ea',
  '506ae09d-8223-445c-bb2f-b108c83d5c44'
)
AND status = 'Aguardando';

-- Como removemos o último evento (Aguardando), também precisamos ajustar o status atual
-- de volta para 'Baixa Bordado 7Estrivos' — que era o estado antes do erro
UPDATE public.orders
SET status = 'Baixa Bordado 7Estrivos'
WHERE id IN (
  '524b5d07-0a29-4107-9675-fa5d49682fbf',
  '7cb86a2d-d6aa-4c74-bb2e-8dd1dc9d4e3a',
  'c2125f0d-8e15-4394-a0ed-d465ffb6c0fe',
  '210ae877-ac7b-44a3-8c13-c68785d904c6',
  '702376c7-477c-4057-ae1a-1aa7dc9899ea',
  '506ae09d-8223-445c-bb2f-b108c83d5c44'
)
AND status = 'Aguardando';