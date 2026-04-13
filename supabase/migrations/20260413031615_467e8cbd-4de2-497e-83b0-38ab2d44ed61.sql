
-- 1. Deactivate generic fields
UPDATE public.ficha_campos SET ativo = false WHERE id IN (
  '72a62254-4d7d-4394-b126-97aa3d15f9df', -- tipo_couro
  '23fcec62-6cbf-41f1-8a69-be3b24abbf26', -- cor_couro
  'f94c3753-1c1d-4b1e-9f73-a3401569b522'  -- cor_glitter
);

-- 2. Insert split couro fields
DO $$
DECLARE
  bota_id uuid := '27f757f7-8e24-4062-a2c6-dcdef3879537';
  couros_cat uuid := 'e9e50b0b-169f-45ef-a221-ce907f42d561';
  laser_cat uuid := '19874a77-ce85-44ec-8777-37207fa1deba';
  metais_cat uuid := '77419845-82aa-44fe-923e-8c894909be47';
  tgm_cat uuid := 'f1ac6594-b213-46b1-bb40-90808fa96007';
  
  couro_cano_id uuid;
  couro_gaspea_id uuid;
  couro_taloneira_id uuid;
  cor_couro_cano_id uuid;
  cor_couro_gaspea_id uuid;
  cor_couro_taloneira_id uuid;
  cor_glitter_cano_id uuid;
  cor_glitter_gaspea_id uuid;
  cor_glitter_taloneira_id uuid;
  
  tipos_couro text[] := ARRAY['Crazy Horse','Látego','Fóssil','Napa Flay','Floter','Nobuck','Estilizado em Avestruz','Estilizado em Arraia','Estilizado em Tilápia','Egípcio','Estilizado em Jacaré','Estilizado em Cobra','Estilizado em Dinossauro','Aramado','Escamado','Estilizado Duplo','Estilizado em Tatu','Vaca Holandesa','Vaca Pintada','Metalizado'];
  
  cores_couro text[] := ARRAY['Nescau','Café','Marrom','Preto','Telha','Mostarda','Bege','Azul','Vermelho','Rosa','Branco','Off White','Pinhão','Verde','Amarelo','Brasileiro','Americano','Cappuccino','Areia','Mustang','Rosa Neon','Laranja','Cru','Havana','Petróleo','Malhado','Chocolate','Castor','Caramelo','Preto e Branco','Madeira'];
  
  cor_glitter text[] := ARRAY['Dourado','Prata','Rosa Claro','Rosa Pink','Azul','Preto','Marrom','Vermelho'];
  
  i int;
  campo_ids uuid[];
BEGIN
  -- Create 6 couro fields
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, couros_cat, 'Couro do Cano', 'couro_cano', 'selecao', false, 1, '[]', true)
  RETURNING id INTO couro_cano_id;
  
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, couros_cat, 'Couro da Gáspea', 'couro_gaspea', 'selecao', false, 2, '[]', true)
  RETURNING id INTO couro_gaspea_id;
  
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, couros_cat, 'Couro da Taloneira', 'couro_taloneira', 'selecao', false, 3, '[]', true)
  RETURNING id INTO couro_taloneira_id;
  
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, couros_cat, 'Cor do Couro do Cano', 'cor_couro_cano', 'selecao', false, 4, '[]', true)
  RETURNING id INTO cor_couro_cano_id;
  
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, couros_cat, 'Cor do Couro da Gáspea', 'cor_couro_gaspea', 'selecao', false, 5, '[]', true)
  RETURNING id INTO cor_couro_gaspea_id;
  
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, couros_cat, 'Cor do Couro da Taloneira', 'cor_couro_taloneira', 'selecao', false, 6, '[]', true)
  RETURNING id INTO cor_couro_taloneira_id;
  
  -- Create 3 glitter fields
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, laser_cat, 'Cor do Glitter do Cano', 'cor_glitter_cano', 'selecao', false, 5, '[]', true)
  RETURNING id INTO cor_glitter_cano_id;
  
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, laser_cat, 'Cor do Glitter da Gáspea', 'cor_glitter_gaspea', 'selecao', false, 6, '[]', true)
  RETURNING id INTO cor_glitter_gaspea_id;
  
  INSERT INTO public.ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, opcoes, ativo)
  VALUES 
    (bota_id, laser_cat, 'Cor do Glitter da Taloneira', 'cor_glitter_taloneira', 'selecao', false, 7, '[]', true)
  RETURNING id INTO cor_glitter_taloneira_id;
  
  -- Insert tipo couro variations for each of 3 parts
  campo_ids := ARRAY[couro_cano_id, couro_gaspea_id, couro_taloneira_id];
  FOR j IN 1..3 LOOP
    FOR i IN 1..array_length(tipos_couro, 1) LOOP
      INSERT INTO public.ficha_variacoes (campo_id, categoria_id, nome, preco_adicional, ordem, ativo)
      VALUES (campo_ids[j], couros_cat, tipos_couro[i], 0, i, true);
    END LOOP;
  END LOOP;
  
  -- Insert cor couro variations for each of 3 parts
  campo_ids := ARRAY[cor_couro_cano_id, cor_couro_gaspea_id, cor_couro_taloneira_id];
  FOR j IN 1..3 LOOP
    FOR i IN 1..array_length(cores_couro, 1) LOOP
      INSERT INTO public.ficha_variacoes (campo_id, categoria_id, nome, preco_adicional, ordem, ativo)
      VALUES (campo_ids[j], couros_cat, cores_couro[i], 0, i, true);
    END LOOP;
  END LOOP;
  
  -- Insert cor glitter variations for each of 3 parts
  campo_ids := ARRAY[cor_glitter_cano_id, cor_glitter_gaspea_id, cor_glitter_taloneira_id];
  FOR j IN 1..3 LOOP
    FOR i IN 1..array_length(cor_glitter, 1) LOOP
      INSERT INTO public.ficha_variacoes (campo_id, categoria_id, nome, preco_adicional, ordem, ativo)
      VALUES (campo_ids[j], laser_cat, cor_glitter[i], 0, i, true);
    END LOOP;
  END LOOP;
  
  -- Insert genero variations
  INSERT INTO public.ficha_variacoes (campo_id, categoria_id, nome, preco_adicional, ordem, ativo)
  VALUES 
    ('914099ac-d897-4a5f-be6d-66c9af9f0cb0', tgm_cat, 'Feminino', 0, 1, true),
    ('914099ac-d897-4a5f-be6d-66c9af9f0cb0', tgm_cat, 'Masculino', 0, 2, true);
  
  -- Insert tipo_metal variations
  INSERT INTO public.ficha_variacoes (campo_id, categoria_id, nome, preco_adicional, ordem, ativo)
  VALUES 
    ('912ee816-32ed-4124-81ab-d71bce09ccdd', metais_cat, 'Rebite', 0, 1, true),
    ('912ee816-32ed-4124-81ab-d71bce09ccdd', metais_cat, 'Bola Grande', 0, 2, true);
  
  -- Insert cor_metal variations
  INSERT INTO public.ficha_variacoes (campo_id, categoria_id, nome, preco_adicional, ordem, ativo)
  VALUES 
    ('5f6c2e2e-a61c-4339-81d4-4a8436a74a4a', metais_cat, 'Níquel', 0, 1, true),
    ('5f6c2e2e-a61c-4339-81d4-4a8436a74a4a', metais_cat, 'Ouro Velho', 0, 2, true),
    ('5f6c2e2e-a61c-4339-81d4-4a8436a74a4a', metais_cat, 'Dourado', 0, 3, true);
  
  -- Delete stale variation from old tipo_couro
  DELETE FROM public.ficha_variacoes WHERE campo_id = '72a62254-4d7d-4394-b126-97aa3d15f9df';
  
END $$;
