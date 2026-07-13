
ALTER TABLE public.ficha_tipos ADD COLUMN IF NOT EXISTS lead_time_dias integer NOT NULL DEFAULT 20;
ALTER TABLE public.extra_produtos ADD COLUMN IF NOT EXISTS lead_time_dias integer NOT NULL DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS lead_time_snapshot integer;

-- Seed ficha_tipos (bota=25, cinto=20)
UPDATE public.ficha_tipos SET lead_time_dias = 25 WHERE slug = 'bota';
UPDATE public.ficha_tipos SET lead_time_dias = 20 WHERE slug = 'cinto';

-- Seed extra_produtos com valores atuais hardcoded
UPDATE public.extra_produtos SET lead_time_dias = 2 WHERE id = 'tiras_laterais';
UPDATE public.extra_produtos SET lead_time_dias = 7 WHERE id = 'desmanchar';
UPDATE public.extra_produtos SET lead_time_dias = 7 WHERE id = 'gravata_country';
UPDATE public.extra_produtos SET lead_time_dias = 4 WHERE id = 'kit_canivete';
UPDATE public.extra_produtos SET lead_time_dias = 4 WHERE id = 'kit_faca';
UPDATE public.extra_produtos SET lead_time_dias = 5 WHERE id = 'carimbo_fogo';
UPDATE public.extra_produtos SET lead_time_dias = 1 WHERE id = 'revitalizador';
UPDATE public.extra_produtos SET lead_time_dias = 1 WHERE id = 'kit_revitalizador';
UPDATE public.extra_produtos SET lead_time_dias = 7 WHERE id = 'adicionar_metais';
UPDATE public.extra_produtos SET lead_time_dias = 5 WHERE id = 'chaveiro_carimbo';
UPDATE public.extra_produtos SET lead_time_dias = 7 WHERE id = 'bainha_cartao';
UPDATE public.extra_produtos SET lead_time_dias = 7 WHERE id = 'bainha_celular';
UPDATE public.extra_produtos SET lead_time_dias = 20 WHERE id = 'regata';
UPDATE public.extra_produtos SET lead_time_dias = 1 WHERE id = 'regata_pronta_entrega';
UPDATE public.extra_produtos SET lead_time_dias = 1 WHERE id = 'bota_pronta_entrega';
UPDATE public.extra_produtos SET lead_time_dias = 1 WHERE id = 'gravata_pronta_entrega';
UPDATE public.extra_produtos SET lead_time_dias = 1 WHERE id = 'palmilha';
