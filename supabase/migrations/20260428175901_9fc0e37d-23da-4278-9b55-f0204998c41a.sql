CREATE OR REPLACE FUNCTION public.list_profiles_minimal()
RETURNS TABLE(id uuid, nome_completo text, nome_usuario text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.nome_completo, p.nome_usuario
  FROM public.profiles p
  WHERE p.id <> auth.uid()
  ORDER BY p.nome_completo ASC;
$$;

REVOKE ALL ON FUNCTION public.list_profiles_minimal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_profiles_minimal() TO authenticated;