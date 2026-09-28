ALTER TABLE public.nfe_config
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS logo_path text;

ALTER TABLE public.nfe_tributacao_referencias
  ADD COLUMN IF NOT EXISTS aliq_tributos_federais numeric(7,4),
  ADD COLUMN IF NOT EXISTS aliq_tributos_estaduais numeric(7,4);