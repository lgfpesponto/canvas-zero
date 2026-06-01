UPDATE public.status_etapas SET ordem = ordem + 1 WHERE ordem >= 9;
INSERT INTO public.status_etapas (nome, slug, ordem) VALUES ('Bordado Giovane', 'bordado-giovane', 9);