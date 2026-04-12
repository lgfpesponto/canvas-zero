
ALTER TABLE ficha_variacoes ADD COLUMN IF NOT EXISTS relacionamento jsonb DEFAULT NULL;
ALTER TABLE ficha_campos ADD COLUMN IF NOT EXISTS relacionamento jsonb DEFAULT NULL;
