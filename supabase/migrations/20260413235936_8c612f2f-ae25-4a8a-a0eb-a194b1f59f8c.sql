
-- =============================================
-- TAMANHO → MODELO relationships
-- =============================================

-- Infantil sizes (24-32): only infantil models
UPDATE ficha_variacoes SET relacionamento = '{"modelo": ["Bota Infantil", "Botina Infantil", "Cano Médio Infantil"]}'::jsonb
WHERE campo_id = '53e7a90a-5a36-40ec-8414-f390c0bda331' AND ativo = true
AND nome IN ('24','25','26','27','28','29','30','31','32');

-- Size 33: infantil + bico fino feminino
UPDATE ficha_variacoes SET relacionamento = '{"modelo": ["Bota Infantil", "Botina Infantil", "Cano Médio Infantil", "Bota Bico Fino Feminino", "Capota Bico Fino"]}'::jsonb
WHERE campo_id = '53e7a90a-5a36-40ec-8414-f390c0bda331' AND ativo = true
AND nome = '33';

-- Sizes 34-40: all adult models including Montaria, City, Bico Fino Fem
UPDATE ficha_variacoes SET relacionamento = '{"modelo": ["Bota Tradicional", "Bota Feminino", "Bota Peão", "Coturno", "Destroyer", "Capota", "Bota Over", "Capota Bico Fino Perfilado", "Cano Médio", "Botina", "Urbano", "Bota Bico Fino Perfilado", "Tradicional Bico Fino", "Cano Inteiro", "Bota Montaria (40)", "City", "Bota Bico Fino Feminino", "Capota Bico Fino"]}'::jsonb
WHERE campo_id = '53e7a90a-5a36-40ec-8414-f390c0bda331' AND ativo = true
AND nome IN ('34','35','36','37','38','39','40');

-- Sizes 41-45: adult models without Montaria, City, Bico Fino Fem
UPDATE ficha_variacoes SET relacionamento = '{"modelo": ["Bota Tradicional", "Bota Feminino", "Bota Peão", "Coturno", "Destroyer", "Capota", "Bota Over", "Capota Bico Fino Perfilado", "Cano Médio", "Botina", "Urbano", "Bota Bico Fino Perfilado", "Tradicional Bico Fino", "Cano Inteiro"]}'::jsonb
WHERE campo_id = '53e7a90a-5a36-40ec-8414-f390c0bda331' AND ativo = true
AND nome IN ('41','42','43','44','45');

-- =============================================
-- MODELO → SOLADO, FORMATO_BICO, COR_VIRA
-- =============================================

-- Infantil models
UPDATE ficha_variacoes SET relacionamento = '{"solado": ["Infantil"], "formato_bico": ["Quadrado"], "cor_vira": ["Bege"]}'::jsonb
WHERE campo_id = 'a5587024-cf5b-4b11-8be4-45a579f58966' AND ativo = true
AND nome IN ('Bota Infantil', 'Botina Infantil', 'Cano Médio Infantil');

-- City
UPDATE ficha_variacoes SET relacionamento = '{"solado": ["Borracha City"], "formato_bico": ["Fino Ponta Redonda"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = 'a5587024-cf5b-4b11-8be4-45a579f58966' AND ativo = true
AND nome = 'City';

-- Tradicional block (11 models)
UPDATE ficha_variacoes SET relacionamento = '{"solado": ["Borracha", "Couro Reta", "Couro Carrapeta", "Couro Carrapeta com Espaço Espora", "Jump", "Rústica"], "formato_bico": ["Quadrado", "Redondo"], "cor_vira": ["Bege", "Rosa", "Preto", "Neutra"]}'::jsonb
WHERE campo_id = 'a5587024-cf5b-4b11-8be4-45a579f58966' AND ativo = true
AND nome IN ('Bota Tradicional', 'Bota Feminino', 'Bota Peão', 'Bota Montaria (40)', 'Coturno', 'Destroyer', 'Capota', 'Cano Médio', 'Botina', 'Urbano', 'Cano Inteiro');

-- Bico Fino Feminino block
UPDATE ficha_variacoes SET relacionamento = '{"solado": ["PVC", "Couro Reta"], "formato_bico": ["Fino Ponta Redonda"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = 'a5587024-cf5b-4b11-8be4-45a579f58966' AND ativo = true
AND nome IN ('Bota Bico Fino Feminino', 'Capota Bico Fino');

-- Perfilado block
UPDATE ficha_variacoes SET relacionamento = '{"solado": ["PVC", "Couro Reta"], "formato_bico": ["Fino Agulha Ponta Quadrada", "Fino Agulha Ponta Redonda"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = 'a5587024-cf5b-4b11-8be4-45a579f58966' AND ativo = true
AND nome IN ('Bota Bico Fino Perfilado', 'Bota Over', 'Capota Bico Fino Perfilado', 'Tradicional Bico Fino');

-- =============================================
-- SOLADO → COR_SOLA + COR_VIRA
-- =============================================

UPDATE ficha_variacoes SET relacionamento = '{"cor_sola": ["Marrom", "Preto", "Branco"], "cor_vira": ["Bege", "Rosa", "Preto"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Borracha';

UPDATE ficha_variacoes SET relacionamento = '{"cor_sola": ["Madeira", "Avermelhada", "Pintada de Preto"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Couro Reta';

UPDATE ficha_variacoes SET relacionamento = '{"cor_sola": ["Madeira", "Avermelhada", "Pintada de Preto"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Couro Carrapeta';

UPDATE ficha_variacoes SET relacionamento = '{"cor_sola": ["Madeira", "Avermelhada", "Pintada de Preto"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Couro Carrapeta com Espaço Espora';

UPDATE ficha_variacoes SET relacionamento = '{"cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Jump';

UPDATE ficha_variacoes SET relacionamento = '{"cor_sola": ["Madeira"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Rústica';

UPDATE ficha_variacoes SET relacionamento = '{"cor_vira": ["Bege"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Infantil';

UPDATE ficha_variacoes SET relacionamento = '{"cor_sola": ["Preto", "Off White", "Marrom"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'PVC';

UPDATE ficha_variacoes SET relacionamento = '{"cor_sola": ["Preto"], "cor_vira": ["Neutra"]}'::jsonb
WHERE campo_id = '0eca6cb9-1a9a-4344-b8bf-62a31175d4b0' AND ativo = true AND nome = 'Borracha City';

-- =============================================
-- TIPO COURO → COR COURO (per region)
-- =============================================

-- Vaca Holandesa
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_cano": ["Malhado", "Preto", "Branco"]}'::jsonb
WHERE campo_id = '2345bf30-101f-4ffc-98a3-b0c2b2a88225' AND ativo = true AND nome = 'Vaca Holandesa';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_gaspea": ["Malhado", "Preto", "Branco"]}'::jsonb
WHERE campo_id = '60dcf8ce-813f-4057-bbe4-fc90b4447a3d' AND ativo = true AND nome = 'Vaca Holandesa';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_taloneira": ["Malhado", "Preto", "Branco"]}'::jsonb
WHERE campo_id = '8846c858-8d88-4561-ae50-d4a4055ade9d' AND ativo = true AND nome = 'Vaca Holandesa';

-- Vaca Pintada
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_cano": ["Caramelo", "Preto e Branco"]}'::jsonb
WHERE campo_id = '2345bf30-101f-4ffc-98a3-b0c2b2a88225' AND ativo = true AND nome = 'Vaca Pintada';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_gaspea": ["Caramelo", "Preto e Branco"]}'::jsonb
WHERE campo_id = '60dcf8ce-813f-4057-bbe4-fc90b4447a3d' AND ativo = true AND nome = 'Vaca Pintada';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_taloneira": ["Caramelo", "Preto e Branco"]}'::jsonb
WHERE campo_id = '8846c858-8d88-4561-ae50-d4a4055ade9d' AND ativo = true AND nome = 'Vaca Pintada';

-- Metalizado
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_cano": ["Rosa Neon"]}'::jsonb
WHERE campo_id = '2345bf30-101f-4ffc-98a3-b0c2b2a88225' AND ativo = true AND nome = 'Metalizado';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_gaspea": ["Rosa Neon"]}'::jsonb
WHERE campo_id = '60dcf8ce-813f-4057-bbe4-fc90b4447a3d' AND ativo = true AND nome = 'Metalizado';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_taloneira": ["Rosa Neon"]}'::jsonb
WHERE campo_id = '8846c858-8d88-4561-ae50-d4a4055ade9d' AND ativo = true AND nome = 'Metalizado';

-- Nobuck (general + Chocolate)
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_cano": ["Nescau", "Café", "Marrom", "Preto", "Telha", "Mostarda", "Bege", "Azul", "Vermelho", "Rosa", "Branco", "Off White", "Pinhão", "Verde", "Amarelo", "Brasileiro", "Americano", "Cappuccino", "Areia", "Mustang", "Laranja", "Cru", "Havana", "Petróleo", "Castor", "Chocolate"]}'::jsonb
WHERE campo_id = '2345bf30-101f-4ffc-98a3-b0c2b2a88225' AND ativo = true AND nome = 'Nobuck';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_gaspea": ["Nescau", "Café", "Marrom", "Preto", "Telha", "Mostarda", "Bege", "Azul", "Vermelho", "Rosa", "Branco", "Off White", "Pinhão", "Verde", "Amarelo", "Brasileiro", "Americano", "Cappuccino", "Areia", "Mustang", "Laranja", "Cru", "Havana", "Petróleo", "Castor", "Chocolate"]}'::jsonb
WHERE campo_id = '60dcf8ce-813f-4057-bbe4-fc90b4447a3d' AND ativo = true AND nome = 'Nobuck';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_taloneira": ["Nescau", "Café", "Marrom", "Preto", "Telha", "Mostarda", "Bege", "Azul", "Vermelho", "Rosa", "Branco", "Off White", "Pinhão", "Verde", "Amarelo", "Brasileiro", "Americano", "Cappuccino", "Areia", "Mustang", "Laranja", "Cru", "Havana", "Petróleo", "Castor", "Chocolate"]}'::jsonb
WHERE campo_id = '8846c858-8d88-4561-ae50-d4a4055ade9d' AND ativo = true AND nome = 'Nobuck';

-- Estilizado em Tilápia (general + Chocolate)
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_cano": ["Nescau", "Café", "Marrom", "Preto", "Telha", "Mostarda", "Bege", "Azul", "Vermelho", "Rosa", "Branco", "Off White", "Pinhão", "Verde", "Amarelo", "Brasileiro", "Americano", "Cappuccino", "Areia", "Mustang", "Laranja", "Cru", "Havana", "Petróleo", "Castor", "Chocolate"]}'::jsonb
WHERE campo_id = '2345bf30-101f-4ffc-98a3-b0c2b2a88225' AND ativo = true AND nome = 'Estilizado em Tilápia';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_gaspea": ["Nescau", "Café", "Marrom", "Preto", "Telha", "Mostarda", "Bege", "Azul", "Vermelho", "Rosa", "Branco", "Off White", "Pinhão", "Verde", "Amarelo", "Brasileiro", "Americano", "Cappuccino", "Areia", "Mustang", "Laranja", "Cru", "Havana", "Petróleo", "Castor", "Chocolate"]}'::jsonb
WHERE campo_id = '60dcf8ce-813f-4057-bbe4-fc90b4447a3d' AND ativo = true AND nome = 'Estilizado em Tilápia';
UPDATE ficha_variacoes SET relacionamento = '{"cor_couro_taloneira": ["Nescau", "Café", "Marrom", "Preto", "Telha", "Mostarda", "Bege", "Azul", "Vermelho", "Rosa", "Branco", "Off White", "Pinhão", "Verde", "Amarelo", "Brasileiro", "Americano", "Cappuccino", "Areia", "Mustang", "Laranja", "Cru", "Havana", "Petróleo", "Castor", "Chocolate"]}'::jsonb
WHERE campo_id = '8846c858-8d88-4561-ae50-d4a4055ade9d' AND ativo = true AND nome = 'Estilizado em Tilápia';

-- General couro types (all general colors, no special restricted ones)
-- These include: Crazy Horse, Escamado, Látego, Fóssil, Napa Flay, Floter, Estilizado em Arraia, Egípcio, Estilizado em Cobra, Estilizado em Jacaré, Estilizado em Avestruz, Estilizado em Dinossauro, Estilizado em Tatu, Aramado, Estilizado Duplo
UPDATE ficha_variacoes SET relacionamento = jsonb_build_object('cor_couro_cano', ARRAY['Nescau', 'Café', 'Marrom', 'Preto', 'Telha', 'Mostarda', 'Bege', 'Azul', 'Vermelho', 'Rosa', 'Branco', 'Off White', 'Pinhão', 'Verde', 'Amarelo', 'Brasileiro', 'Americano', 'Cappuccino', 'Areia', 'Mustang', 'Laranja', 'Cru', 'Havana', 'Petróleo', 'Castor'])
WHERE campo_id = '2345bf30-101f-4ffc-98a3-b0c2b2a88225' AND ativo = true
AND nome IN ('Crazy Horse', 'Escamado', 'Látego', 'Fóssil', 'Napa Flay', 'Floter', 'Estilizado em Arraia', 'Egípcio', 'Estilizado em Cobra', 'Estilizado em Jacaré', 'Estilizado em Avestruz', 'Estilizado em Dinossauro', 'Estilizado em Tatu', 'Aramado', 'Estilizado Duplo');

UPDATE ficha_variacoes SET relacionamento = jsonb_build_object('cor_couro_gaspea', ARRAY['Nescau', 'Café', 'Marrom', 'Preto', 'Telha', 'Mostarda', 'Bege', 'Azul', 'Vermelho', 'Rosa', 'Branco', 'Off White', 'Pinhão', 'Verde', 'Amarelo', 'Brasileiro', 'Americano', 'Cappuccino', 'Areia', 'Mustang', 'Laranja', 'Cru', 'Havana', 'Petróleo', 'Castor'])
WHERE campo_id = '60dcf8ce-813f-4057-bbe4-fc90b4447a3d' AND ativo = true
AND nome IN ('Crazy Horse', 'Escamado', 'Látego', 'Fóssil', 'Napa Flay', 'Floter', 'Estilizado em Arraia', 'Egípcio', 'Estilizado em Cobra', 'Estilizado em Jacaré', 'Estilizado em Avestruz', 'Estilizado em Dinossauro', 'Estilizado em Tatu', 'Aramado', 'Estilizado Duplo');

UPDATE ficha_variacoes SET relacionamento = jsonb_build_object('cor_couro_taloneira', ARRAY['Nescau', 'Café', 'Marrom', 'Preto', 'Telha', 'Mostarda', 'Bege', 'Azul', 'Vermelho', 'Rosa', 'Branco', 'Off White', 'Pinhão', 'Verde', 'Amarelo', 'Brasileiro', 'Americano', 'Cappuccino', 'Areia', 'Mustang', 'Laranja', 'Cru', 'Havana', 'Petróleo', 'Castor'])
WHERE campo_id = '8846c858-8d88-4561-ae50-d4a4055ade9d' AND ativo = true
AND nome IN ('Crazy Horse', 'Escamado', 'Látego', 'Fóssil', 'Napa Flay', 'Floter', 'Estilizado em Arraia', 'Egípcio', 'Estilizado em Cobra', 'Estilizado em Jacaré', 'Estilizado em Avestruz', 'Estilizado em Dinossauro', 'Estilizado em Tatu', 'Aramado', 'Estilizado Duplo');
