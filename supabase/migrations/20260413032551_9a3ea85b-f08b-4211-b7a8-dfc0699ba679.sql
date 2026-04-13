-- Fix field types to match published OrderPage
-- 1. Bordados: selecao → multipla
UPDATE ficha_campos SET tipo = 'multipla' WHERE id IN (
  '9ba41334-6c9d-43aa-b455-52e57bc635b7',  -- bordado_cano
  '5ace6beb-907d-47fe-8464-02e3999600fc',  -- bordado_gaspea
  'f04b8517-7e06-4c13-85ed-1e747b402d18'   -- bordado_taloneira
);

-- 2. Laser: selecao → multipla
UPDATE ficha_campos SET tipo = 'multipla' WHERE id IN (
  'f34f7ef9-6e25-437e-8d75-d25b0ec44822',  -- laser_cano
  '24c6176a-d5e8-43d3-93b4-8be9bfd3791b',  -- laser_gaspea
  '6bcd3f60-0b85-4671-becc-45dd1cfd3ea6'   -- laser_taloneira
);

-- 3. Costura Atrás: texto → checkbox (simple toggle, no description)
UPDATE ficha_campos SET tipo = 'checkbox', desc_condicional = false WHERE id = '805e01a6-7ac3-4979-8958-5b7ff58add24';

-- 4. Tipo do Metal: selecao → multipla (checkbox list in OrderPage)
UPDATE ficha_campos SET tipo = 'multipla' WHERE id = '912ee816-32ed-4124-81ab-d71bce09ccdd';

-- 5. Metais → rename to "Área do Metal" and fix type: multipla → selecao
UPDATE ficha_campos SET tipo = 'selecao', nome = 'Área do Metal', slug = 'area_metal' WHERE id = 'f2f2b61b-ff1e-4933-8059-da0d9fb1bab6';

-- 6. Carimbo: checkbox → selecao (it's a dropdown select in OrderPage)
UPDATE ficha_campos SET tipo = 'selecao', desc_condicional = true WHERE id = 'd53484ea-b37b-440f-9baa-3c20b93aeb89';

-- 7. Add missing fields
-- Pintura (inside Laser category)
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional, ativo)
VALUES ('27f757f7-8e24-4062-a2c6-dcdef3879537', '19874a77-ce85-44ec-8777-37207fa1deba', 'Pintura', 'pintura', 'checkbox', false, 70, true, true);

-- Strass (Metais category - checkbox with qty)
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional, ativo)
VALUES ('27f757f7-8e24-4062-a2c6-dcdef3879537', '77419845-82aa-44fe-923e-8c894909be47', 'Strass', 'strass', 'checkbox', false, 40, false, true);

-- Cruz Metal (Metais)
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional, ativo)
VALUES ('27f757f7-8e24-4062-a2c6-dcdef3879537', '77419845-82aa-44fe-923e-8c894909be47', 'Cruz (metal)', 'cruz_metal', 'checkbox', false, 50, false, true);

-- Bridão Metal (Metais)
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional, ativo)
VALUES ('27f757f7-8e24-4062-a2c6-dcdef3879537', '77419845-82aa-44fe-923e-8c894909be47', 'Bridão (metal)', 'bridao_metal', 'checkbox', false, 60, false, true);

-- Cavalo Metal (Metais)
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional, ativo)
VALUES ('27f757f7-8e24-4062-a2c6-dcdef3879537', '77419845-82aa-44fe-923e-8c894909be47', 'Cavalo (metal)', 'cavalo_metal', 'checkbox', false, 70, false, true);

-- Foto de Referência (create new category + field)
INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem, ativo)
VALUES ('27f757f7-8e24-4062-a2c6-dcdef3879537', 'foto-referencia', 'Foto de Referência', 150, true);

INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional, ativo)
VALUES ('27f757f7-8e24-4062-a2c6-dcdef3879537', 
  (SELECT id FROM ficha_categorias WHERE slug = 'foto-referencia' AND ficha_tipo_id = '27f757f7-8e24-4062-a2c6-dcdef3879537'),
  'Link da Foto', 'foto_referencia', 'texto', true, 10, false, true);

-- Insert variations for Carimbo (now selecao type)
INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo)
SELECT 
  'fde0ca51-224c-4b0b-9ebc-e6f74644411b',
  'd53484ea-b37b-440f-9baa-3c20b93aeb89',
  v.nome, v.preco, v.ord, true
FROM (VALUES 
  ('Até 3 Carimbos', 20, 1),
  ('Até 6 Carimbos', 40, 2)
) AS v(nome, preco, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM ficha_variacoes 
  WHERE campo_id = 'd53484ea-b37b-440f-9baa-3c20b93aeb89' AND nome = v.nome
);

-- Insert variations for Área do Metal (was metais)
INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo)
SELECT 
  '77419845-82aa-44fe-923e-8c894909be47',
  'f2f2b61b-ff1e-4933-8059-da0d9fb1bab6',
  v.nome, v.preco, v.ord, true
FROM (VALUES 
  ('Inteira', 30, 1),
  ('Metade da Bota', 15, 2)
) AS v(nome, preco, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM ficha_variacoes 
  WHERE campo_id = 'f2f2b61b-ff1e-4933-8059-da0d9fb1bab6' AND nome = v.nome
);