REVOKE EXECUTE ON FUNCTION public.listar_cobrancas_abertas_vendedor(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_cobrancas_abertas_vendedor(text) TO authenticated;