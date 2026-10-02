CREATE OR REPLACE FUNCTION public.has_nfe_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin_master'::app_role)
    OR public.has_role(_user_id, 'admin_producao'::app_role)
    OR public.has_role(_user_id, 'vendedor_comissao'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id AND p.nome_completo IN ('Igor', 'Stefany ADM', 'Fernanda ADM')
    );
$$;