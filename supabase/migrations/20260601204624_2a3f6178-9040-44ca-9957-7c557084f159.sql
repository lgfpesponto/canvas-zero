UPDATE public.status_etapas SET ordem = ordem + 1 WHERE ordem >= 19;
INSERT INTO public.status_etapas (nome, slug, ordem) VALUES ('Montagem Ailton', 'montagem-ailton', 19);