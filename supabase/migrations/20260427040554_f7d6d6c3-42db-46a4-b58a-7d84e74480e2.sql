-- 1) Renomeia a categoria visual Laser → "Laser e Recortes"
UPDATE ficha_categorias
SET nome = 'Laser e Recortes'
WHERE slug = 'laser-visual';

-- 2) Cria 3 categorias-fonte para variações dos recortes (não visuais, só preços)
INSERT INTO ficha_categorias (ficha_tipo_id, slug, nome, ordem, ativo)
SELECT ft.id, x.slug, x.nome, 999, true
FROM ficha_tipos ft
CROSS JOIN (VALUES
  ('recorte_cano', 'Recortes do Cano'),
  ('recorte_gaspea', 'Recortes da Gáspea'),
  ('recorte_taloneira', 'Recortes da Taloneira')
) AS x(slug, nome)
WHERE ft.slug = 'bota'
AND NOT EXISTS (
  SELECT 1 FROM ficha_categorias WHERE ficha_tipo_id = ft.id AND slug = x.slug
);

-- 3) Variações iniciais para cada categoria de recorte (preço 0 - admin define depois)
INSERT INTO ficha_variacoes (categoria_id, nome, preco_adicional, ordem, ativo)
SELECT fc.id, v.nome, 0, v.ord, true
FROM ficha_categorias fc
JOIN ficha_tipos ft ON ft.id = fc.ficha_tipo_id AND ft.slug = 'bota'
CROSS JOIN (VALUES
  ('Anjo', 1), ('Borda', 2), ('Touro Brinco', 3), ('Touro Recortado', 4)
) AS v(nome, ord)
WHERE fc.slug IN ('recorte_cano', 'recorte_gaspea', 'recorte_taloneira')
AND NOT EXISTS (
  SELECT 1 FROM ficha_variacoes WHERE categoria_id = fc.id AND nome = v.nome
);

-- 4) Campos de seleção (Recortes) — visíveis na seção laser-visual
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, slug, nome, tipo, ordem, ativo, obrigatorio)
SELECT ft.id, lv.id, x.slug, x.nome, 'selecao', x.ordem, true, false
FROM ficha_tipos ft
JOIN ficha_categorias lv ON lv.ficha_tipo_id = ft.id AND lv.slug = 'laser-visual'
CROSS JOIN (VALUES
  ('recorte_cano', 'Recortes do Cano', 50),
  ('recorte_gaspea', 'Recortes da Gáspea', 51),
  ('recorte_taloneira', 'Recortes da Taloneira', 52)
) AS x(slug, nome, ordem)
WHERE ft.slug = 'bota'
AND NOT EXISTS (
  SELECT 1 FROM ficha_campos WHERE ficha_tipo_id = ft.id AND slug = x.slug
);

-- 5) Campos de texto condicional (Cor do Recorte) — visíveis na seção laser-visual
INSERT INTO ficha_campos (ficha_tipo_id, categoria_id, slug, nome, tipo, ordem, ativo, obrigatorio, desc_condicional)
SELECT ft.id, lv.id, x.slug, x.nome, 'texto', x.ordem, true, false, true
FROM ficha_tipos ft
JOIN ficha_categorias lv ON lv.ficha_tipo_id = ft.id AND lv.slug = 'laser-visual'
CROSS JOIN (VALUES
  ('cor_recorte_cano', 'Cor do Recorte do Cano', 53),
  ('cor_recorte_gaspea', 'Cor do Recorte da Gáspea', 54),
  ('cor_recorte_taloneira', 'Cor do Recorte da Taloneira', 55)
) AS x(slug, nome, ordem)
WHERE ft.slug = 'bota'
AND NOT EXISTS (
  SELECT 1 FROM ficha_campos WHERE ficha_tipo_id = ft.id AND slug = x.slug
);

-- 6) Vincula os campos de seleção às suas categorias-fonte (para variações)
UPDATE ficha_campos SET relacionamento = jsonb_build_object('categoria_origem', 'recorte_cano')
WHERE slug = 'recorte_cano' AND ficha_tipo_id IN (SELECT id FROM ficha_tipos WHERE slug = 'bota');

UPDATE ficha_campos SET relacionamento = jsonb_build_object('categoria_origem', 'recorte_gaspea')
WHERE slug = 'recorte_gaspea' AND ficha_tipo_id IN (SELECT id FROM ficha_tipos WHERE slug = 'bota');

UPDATE ficha_campos SET relacionamento = jsonb_build_object('categoria_origem', 'recorte_taloneira')
WHERE slug = 'recorte_taloneira' AND ficha_tipo_id IN (SELECT id FROM ficha_tipos WHERE slug = 'bota');

-- 7) Novas colunas em orders (nullable, não afeta pedidos existentes)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS recorte_cano text,
  ADD COLUMN IF NOT EXISTS recorte_gaspea text,
  ADD COLUMN IF NOT EXISTS recorte_taloneira text,
  ADD COLUMN IF NOT EXISTS cor_recorte_cano text,
  ADD COLUMN IF NOT EXISTS cor_recorte_gaspea text,
  ADD COLUMN IF NOT EXISTS cor_recorte_taloneira text;