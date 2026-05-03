UPDATE public.status_etapas SET ordem = ordem + 1 WHERE ordem >= 21;
INSERT INTO public.status_etapas (nome, slug, ordem) VALUES ('Conferido', 'conferido', 21);