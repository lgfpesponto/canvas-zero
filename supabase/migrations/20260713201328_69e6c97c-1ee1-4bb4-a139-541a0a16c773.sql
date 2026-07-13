
-- ============================================================
-- Seed cinto ficha (categorias + campos + variações)
-- e completa carimbo (bota) mantendo o que já existe.
-- Idempotente: usa ON CONFLICT DO NOTHING onde possível.
-- ============================================================

DO $$
DECLARE
  cinto_id uuid;
  bota_id  uuid;
  cat_tamanho uuid;
  cat_couros uuid;
  cat_fivelas uuid;
  cat_bordado uuid;
  cat_carimbo uuid;
  cat_bota_carimbo uuid;
  campo_tamanho uuid;
  campo_tipo_couro uuid;
  campo_cor_couro uuid;
  campo_fivela uuid;
  campo_cor_bordado uuid;
  campo_carimbo_cinto uuid;
  campo_carimbo_bota uuid;
BEGIN
  SELECT id INTO cinto_id FROM ficha_tipos WHERE slug = 'cinto';
  SELECT id INTO bota_id  FROM ficha_tipos WHERE slug = 'bota';

  -- Categorias cinto (idempotente por (ficha_tipo_id, slug))
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem, ativo)
  VALUES
    (cinto_id, 'tamanho', 'Tamanho', 10, true),
    (cinto_id, 'couros',  'Couros',  20, true),
    (cinto_id, 'fivelas', 'Fivelas', 30, true),
    (cinto_id, 'bordado', 'Bordado', 40, true),
    (cinto_id, 'carimbo', 'Carimbo a Fogo', 50, true)
  ON CONFLICT (ficha_tipo_id, slug) DO NOTHING;

  SELECT id INTO cat_tamanho FROM ficha_categorias WHERE ficha_tipo_id = cinto_id AND slug = 'tamanho';
  SELECT id INTO cat_couros  FROM ficha_categorias WHERE ficha_tipo_id = cinto_id AND slug = 'couros';
  SELECT id INTO cat_fivelas FROM ficha_categorias WHERE ficha_tipo_id = cinto_id AND slug = 'fivelas';
  SELECT id INTO cat_bordado FROM ficha_categorias WHERE ficha_tipo_id = cinto_id AND slug = 'bordado';
  SELECT id INTO cat_carimbo FROM ficha_categorias WHERE ficha_tipo_id = cinto_id AND slug = 'carimbo';
  SELECT id INTO cat_bota_carimbo FROM ficha_categorias WHERE ficha_tipo_id = bota_id  AND slug = 'carimbo';

  -- Campos cinto
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, vinculo, desc_condicional, ativo)
  VALUES
    (cinto_id, cat_tamanho, 'Tamanho',       'tamanho',      'selecao', true,  10, '[]'::jsonb, NULL, false, true),
    (cinto_id, cat_couros,  'Tipo de Couro', 'tipo_couro',   'selecao', true,  20, '[]'::jsonb, NULL, false, true),
    (cinto_id, cat_couros,  'Cor do Couro',  'cor_couro',    'selecao', true,  21, '[]'::jsonb, NULL, false, true),
    (cinto_id, cat_fivelas, 'Fivela',        'fivela',       'selecao', true,  30, '[]'::jsonb, NULL, false, true),
    (cinto_id, cat_bordado, 'Cor do Bordado','cor_bordado',  'selecao', false, 40, '[]'::jsonb, NULL, false, true),
    (cinto_id, cat_carimbo, 'Carimbo a Fogo','carimbo',      'selecao', false, 50, '[]'::jsonb, NULL, false, true)
  ON CONFLICT (ficha_tipo_id, slug) DO NOTHING;

  SELECT id INTO campo_tamanho    FROM ficha_campos WHERE ficha_tipo_id = cinto_id AND slug = 'tamanho';
  SELECT id INTO campo_tipo_couro FROM ficha_campos WHERE ficha_tipo_id = cinto_id AND slug = 'tipo_couro';
  SELECT id INTO campo_cor_couro  FROM ficha_campos WHERE ficha_tipo_id = cinto_id AND slug = 'cor_couro';
  SELECT id INTO campo_fivela     FROM ficha_campos WHERE ficha_tipo_id = cinto_id AND slug = 'fivela';
  SELECT id INTO campo_cor_bordado FROM ficha_campos WHERE ficha_tipo_id = cinto_id AND slug = 'cor_bordado';
  SELECT id INTO campo_carimbo_cinto FROM ficha_campos WHERE ficha_tipo_id = cinto_id AND slug = 'carimbo';
  SELECT id INTO campo_carimbo_bota  FROM ficha_campos WHERE ficha_tipo_id = bota_id  AND slug = 'carimbo';

  -- Tamanho (BELT_SIZES)
  INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo) VALUES
    (cat_tamanho, campo_tamanho, '1,10 cm', 100, 10, true),
    (cat_tamanho, campo_tamanho, '1,25 cm', 130, 20, true),
    (cat_tamanho, campo_tamanho, '50 cm',    70, 30, true),
    (cat_tamanho, campo_tamanho, '70 cm',    70, 40, true)
  ON CONFLICT DO NOTHING;

  -- Tipo de Couro (TIPOS_COURO + COURO_PRECOS)
  INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo) VALUES
    (cat_couros, campo_tipo_couro, 'Crazy Horse',                   0, 10, true),
    (cat_couros, campo_tipo_couro, 'Látego',                        0, 20, true),
    (cat_couros, campo_tipo_couro, 'Fóssil',                        0, 30, true),
    (cat_couros, campo_tipo_couro, 'Napa Flay',                     0, 40, true),
    (cat_couros, campo_tipo_couro, 'Floter',                        0, 50, true),
    (cat_couros, campo_tipo_couro, 'Nobuck',                        0, 60, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Avestruz',       10, 70, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Arraia',          0, 80, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Tilápia',         0, 90, true),
    (cat_couros, campo_tipo_couro, 'Egípcio',                       0,100, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Jacaré',          0,110, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Cobra',           0,120, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Dinossauro',     50,130, true),
    (cat_couros, campo_tipo_couro, 'Aramado',                      40,140, true),
    (cat_couros, campo_tipo_couro, 'Escamado',                     20,150, true),
    (cat_couros, campo_tipo_couro, 'Estilizado Duplo',             20,160, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Tatu',           40,170, true),
    (cat_couros, campo_tipo_couro, 'Vaca Holandesa',               15,180, true),
    (cat_couros, campo_tipo_couro, 'Vaca Pintada',                 15,190, true),
    (cat_couros, campo_tipo_couro, 'Metalizado',                    0,200, true),
    (cat_couros, campo_tipo_couro, 'Estilizado em Madeira',         0,210, true)
  ON CONFLICT DO NOTHING;

  -- Cor do Couro (CORES_COURO)
  INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo)
  SELECT cat_couros, campo_cor_couro, nome, 0, (row_number() OVER ())*10, true
  FROM (VALUES
    ('Nescau'),('Café'),('Marrom'),('Preto'),('Telha'),('Mostarda'),('Bege'),('Azul'),
    ('Vermelho'),('Rosa'),('Branco'),('Off White'),('Pinhão'),('Verde'),('Amarelo'),
    ('Brasileiro'),('Americano'),('Cappuccino'),('Areia'),('Mustang'),('Rosa Neon'),
    ('Laranja'),('Cru'),('Havana'),('Petróleo'),('Malhado'),('Chocolate'),('Castor'),
    ('Caramelo'),('Preto e Branco'),('Nescau Chapado'),('Whisky')
  ) AS t(nome)
  ON CONFLICT DO NOTHING;

  -- Fivela (FIVELA_OPTIONS)
  INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo) VALUES
    (cat_fivelas, campo_fivela, 'Prata com Strass', 0, 10, true),
    (cat_fivelas, campo_fivela, 'Preta com Strass', 0, 20, true),
    (cat_fivelas, campo_fivela, 'Prata Touro',      0, 30, true),
    (cat_fivelas, campo_fivela, 'Prata Flor',       0, 40, true),
    (cat_fivelas, campo_fivela, 'Infantil',         0, 50, true),
    (cat_fivelas, campo_fivela, 'Quadrada',         0, 60, true),
    (cat_fivelas, campo_fivela, 'Outro',            0, 70, true)
  ON CONFLICT DO NOTHING;

  -- Cor do Bordado (paleta padrão)
  INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo)
  SELECT cat_bordado, campo_cor_bordado, nome, 0, (row_number() OVER ())*10, true
  FROM (VALUES
    ('Branco'),('Preto'),('Vermelho'),('Amarelo'),('Azul'),('Verde'),
    ('Rosa'),('Laranja'),('Roxo'),('Marrom'),('Bege'),('Dourado'),('Prata')
  ) AS t(nome)
  ON CONFLICT DO NOTHING;

  -- Carimbo cinto (BELT_CARIMBO)
  INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo) VALUES
    (cat_carimbo, campo_carimbo_cinto, '1 a 3 carimbos', 20, 10, true),
    (cat_carimbo, campo_carimbo_cinto, '4 a 6 carimbos', 40, 20, true)
  ON CONFLICT DO NOTHING;

  -- Carimbo bota (já existe com Até 3/Até 6 – idempotente)
  IF campo_carimbo_bota IS NOT NULL AND cat_bota_carimbo IS NOT NULL THEN
    INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem, ativo) VALUES
      (cat_bota_carimbo, campo_carimbo_bota, 'Até 3 Carimbos', 20, 10, true),
      (cat_bota_carimbo, campo_carimbo_bota, 'Até 6 Carimbos', 40, 20, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
