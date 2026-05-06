
ALTER VIEW public.vw_auditoria_alteracoes SET (security_invoker = on);
REVOKE ALL ON public.vw_auditoria_alteracoes FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_auditoria_alteracoes(date,date,text,text,text,text[],text,integer,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_auditoria_alteracoes_count(date,date,text,text,text,text[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auditoria_alteracoes(date,date,text,text,text,text[],text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auditoria_alteracoes_count(date,date,text,text,text,text[],text) TO authenticated;
