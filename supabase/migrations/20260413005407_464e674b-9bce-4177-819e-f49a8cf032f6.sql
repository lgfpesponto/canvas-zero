
DO $$
DECLARE
  v_tipo_id uuid := '27f757f7-8e24-4062-a2c6-dcdef3879537';
  cat_identificacao uuid;
  cat_tam_gen_mod uuid;
  cat_sob_medida uuid;
  cat_acessorios uuid;
  cat_couros uuid;
  cat_desenvolvimento uuid;
  cat_bordados uuid;
  cat_laser uuid;
  cat_estampa uuid;
  cat_pesponto uuid;
  cat_metais uuid;
  cat_extras uuid;
  cat_solados uuid;
  cat_carimbo uuid;
  cat_adicional uuid;
  cat_observacao uuid;
  campo_id_tmp uuid;
  old_cat_id uuid;
  r record;
BEGIN
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'identificacao', 'Identificação', 1) RETURNING id INTO cat_identificacao;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'tamanho-genero-modelo', 'Tamanho / Gênero / Modelo', 2) RETURNING id INTO cat_tam_gen_mod;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'sob-medida', 'Sob Medida', 3) RETURNING id INTO cat_sob_medida;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'acessorios-visual', 'Acessórios', 4) RETURNING id INTO cat_acessorios;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'couros', 'Couros', 5) RETURNING id INTO cat_couros;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'desenvolvimento-visual', 'Desenvolvimento', 6) RETURNING id INTO cat_desenvolvimento;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'bordados-visual', 'Bordados', 7) RETURNING id INTO cat_bordados;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'laser-visual', 'Laser', 8) RETURNING id INTO cat_laser;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'estampa-visual', 'Estampa', 9) RETURNING id INTO cat_estampa;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'pesponto-visual', 'Pesponto', 10) RETURNING id INTO cat_pesponto;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'metais-visual', 'Metais', 11) RETURNING id INTO cat_metais;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'extras-visual', 'Extras', 12) RETURNING id INTO cat_extras;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'solados-visual', 'Solados', 13) RETURNING id INTO cat_solados;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'carimbo-visual', 'Carimbo a Fogo', 14) RETURNING id INTO cat_carimbo;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'adicional-visual', 'Adicional', 15) RETURNING id INTO cat_adicional;
  INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_tipo_id, 'observacao-visual', 'Observação', 16) RETURNING id INTO cat_observacao;

  -- IDENTIFICAÇÃO
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_identificacao, 'Nº do Pedido', 'numero_pedido', 'texto', true, 1);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_identificacao, 'Vendedor', 'vendedor', 'texto', true, 2);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_identificacao, 'Cliente', 'cliente', 'texto', false, 3);

  -- TAMANHO / GÊNERO / MODELO
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'tamanhos';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_tam_gen_mod, 'Tamanho', 'tamanho', 'selecao', true, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'generos';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_tam_gen_mod, 'Gênero', 'genero', 'selecao', true, 2) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'modelos';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_tam_gen_mod, 'Modelo', 'modelo', 'selecao', true, 3) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- SOB MEDIDA
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_sob_medida, 'Sob Medida', 'sob_medida', 'checkbox', false, 1, true);

  -- ACESSÓRIOS
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'acessorios';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_acessorios, 'Acessórios', 'acessorios', 'multipla', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- COUROS
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'tipos-couro';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_couros, 'Tipo de Couro', 'tipo_couro', 'selecao', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cores-couro';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_couros, 'Cor do Couro', 'cor_couro', 'selecao', false, 2) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- DESENVOLVIMENTO
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'desenvolvimento';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_desenvolvimento, 'Desenvolvimento', 'desenvolvimento', 'selecao', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- BORDADOS
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'bordados-cano';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_bordados, 'Bordado do Cano', 'bordado_cano', 'selecao', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;
  FOR r IN SELECT label, preco FROM custom_options WHERE categoria = 'bordado_cano' AND NOT EXISTS (SELECT 1 FROM ficha_variacoes WHERE categoria_id = old_cat_id AND nome = custom_options.label) LOOP
    INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem) VALUES (old_cat_id, campo_id_tmp, r.label, r.preco, (SELECT COALESCE(MAX(ordem),0)+1 FROM ficha_variacoes WHERE categoria_id = old_cat_id));
  END LOOP;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'bordados-gaspea';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_bordados, 'Bordado da Gáspea', 'bordado_gaspea', 'selecao', false, 2) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;
  FOR r IN SELECT label, preco FROM custom_options WHERE categoria = 'bordado_gaspea' AND NOT EXISTS (SELECT 1 FROM ficha_variacoes WHERE categoria_id = old_cat_id AND nome = custom_options.label) LOOP
    INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem) VALUES (old_cat_id, campo_id_tmp, r.label, r.preco, (SELECT COALESCE(MAX(ordem),0)+1 FROM ficha_variacoes WHERE categoria_id = old_cat_id));
  END LOOP;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'bordados-taloneira';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_bordados, 'Bordado da Taloneira', 'bordado_taloneira', 'selecao', false, 3) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;
  FOR r IN SELECT label, preco FROM custom_options WHERE categoria = 'bordado_taloneira' AND NOT EXISTS (SELECT 1 FROM ficha_variacoes WHERE categoria_id = old_cat_id AND nome = custom_options.label) LOOP
    INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem) VALUES (old_cat_id, campo_id_tmp, r.label, r.preco, (SELECT COALESCE(MAX(ordem),0)+1 FROM ficha_variacoes WHERE categoria_id = old_cat_id));
  END LOOP;

  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_bordados, 'Cor do Bordado do Cano', 'cor_bordado_cano', 'texto', false, 4);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_bordados, 'Cor do Bordado da Gáspea', 'cor_bordado_gaspea', 'texto', false, 5);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_bordados, 'Cor do Bordado da Taloneira', 'cor_bordado_taloneira', 'texto', false, 6);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_bordados, 'Nome Bordado', 'nome_bordado', 'checkbox', false, 7, true);

  -- LASER
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'laser-cano';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_laser, 'Laser do Cano', 'laser_cano', 'selecao', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;
  FOR r IN SELECT label, preco FROM custom_options WHERE categoria = 'laser_cano' AND NOT EXISTS (SELECT 1 FROM ficha_variacoes WHERE categoria_id = old_cat_id AND nome = custom_options.label) LOOP
    INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem) VALUES (old_cat_id, campo_id_tmp, r.label, r.preco, (SELECT COALESCE(MAX(ordem),0)+1 FROM ficha_variacoes WHERE categoria_id = old_cat_id));
  END LOOP;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'laser-gaspea';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_laser, 'Laser da Gáspea', 'laser_gaspea', 'selecao', false, 2) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;
  FOR r IN SELECT label, preco FROM custom_options WHERE categoria = 'laser_gaspea' AND NOT EXISTS (SELECT 1 FROM ficha_variacoes WHERE categoria_id = old_cat_id AND nome = custom_options.label) LOOP
    INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem) VALUES (old_cat_id, campo_id_tmp, r.label, r.preco, (SELECT COALESCE(MAX(ordem),0)+1 FROM ficha_variacoes WHERE categoria_id = old_cat_id));
  END LOOP;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'laser-taloneira';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_laser, 'Laser da Taloneira', 'laser_taloneira', 'selecao', false, 3) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;
  FOR r IN SELECT label, preco FROM custom_options WHERE categoria = 'laser_taloneira' AND NOT EXISTS (SELECT 1 FROM ficha_variacoes WHERE categoria_id = old_cat_id AND nome = custom_options.label) LOOP
    INSERT INTO ficha_variacoes (categoria_id, campo_id, nome, preco_adicional, ordem) VALUES (old_cat_id, campo_id_tmp, r.label, r.preco, (SELECT COALESCE(MAX(ordem),0)+1 FROM ficha_variacoes WHERE categoria_id = old_cat_id));
  END LOOP;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cor-glitter';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_laser, 'Cor do Glitter', 'cor_glitter', 'selecao', false, 4) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- ESTAMPA
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_estampa, 'Estampa', 'estampa', 'checkbox', false, 1, true);

  -- PESPONTO
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cor-linha';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_pesponto, 'Cor da Linha', 'cor_linha', 'selecao', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cor-borrachinha';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_pesponto, 'Cor da Borrachinha', 'cor_borrachinha', 'selecao', false, 2) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cor-vivo';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_pesponto, 'Cor do Vivo', 'cor_vivo', 'selecao', false, 3) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_pesponto, 'Costura Atrás', 'costura_atras', 'texto', false, 4);

  -- METAIS
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'area-metal';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_metais, 'Metais', 'metais', 'multipla', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'tipo-metal';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_metais, 'Tipo do Metal', 'tipo_metal', 'selecao', false, 2) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cor-metal';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_metais, 'Cor do Metal', 'cor_metal', 'selecao', false, 3) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- EXTRAS
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_extras, 'Tricê', 'trice', 'checkbox', false, 1, true);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_extras, 'Tiras', 'tiras', 'checkbox', false, 2, true);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_extras, 'Franja', 'franja', 'checkbox', false, 3, true);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_extras, 'Corrente', 'corrente', 'checkbox', false, 4, true);

  -- SOLADOS
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'solados';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_solados, 'Solado', 'solado', 'selecao', false, 1) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'formato-bico';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_solados, 'Formato do Bico', 'formato_bico', 'selecao', false, 2) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cor-sola';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_solados, 'Cor da Sola', 'cor_sola', 'selecao', false, 3) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'cor-vira';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_solados, 'Cor da Vira', 'cor_vira', 'selecao', false, 4) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- CARIMBO A FOGO
  SELECT id INTO old_cat_id FROM ficha_categorias WHERE ficha_tipo_id = v_tipo_id AND slug = 'carimbo';
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem, desc_condicional) VALUES (v_tipo_id, cat_carimbo, 'Carimbo a Fogo', 'carimbo', 'checkbox', false, 1, true) RETURNING id INTO campo_id_tmp;
  IF old_cat_id IS NOT NULL THEN UPDATE ficha_variacoes SET campo_id = campo_id_tmp WHERE categoria_id = old_cat_id; END IF;

  -- ADICIONAL
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_adicional, 'Valor Adicional', 'adicional_valor', 'numero', false, 1);
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_adicional, 'Descrição Adicional', 'adicional_desc', 'texto', false, 2);

  -- OBSERVAÇÃO
  INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, nome, slug, tipo, obrigatorio, ordem) VALUES (v_tipo_id, cat_observacao, 'Observação', 'observacao', 'textarea', false, 1);

  -- DEACTIVATE OLD CATEGORIES
  UPDATE ficha_categorias SET ativo = false
  WHERE ficha_tipo_id = v_tipo_id
    AND slug IN ('modelos','cores-couro','bordados-cano','bordados-gaspea','bordados-taloneira',
                 'solados','acessorios','cor-glitter','cor-linha','cor-sola','cor-vira',
                 'formato-bico','desenvolvimento','carimbo','area-metal','cor-borrachinha',
                 'cor-vivo','tipos-couro','tamanhos','generos','laser-cano','laser-gaspea',
                 'laser-taloneira','tipo-metal','cor-metal');
END $$;
