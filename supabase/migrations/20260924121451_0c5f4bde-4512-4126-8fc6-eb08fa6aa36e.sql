-- Remove versão antiga de 2 parâmetros (causa de erro de 'ambiguous function call')
DROP FUNCTION IF EXISTS public.tentar_baixa_automatica(text, uuid);

-- Garante permissão de execução apenas para autenticados na versão vigente
REVOKE ALL ON FUNCTION public.tentar_baixa_automatica(text, uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.tentar_baixa_automatica(text, uuid, uuid) TO authenticated;

-- Sanity check: deve restar apenas 1 versão
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'tentar_baixa_automatica';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Esperava 1 versão de tentar_baixa_automatica, encontradas %', v_count;
  END IF;
END $$;