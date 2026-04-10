
-- =============================================
-- 1. TABELAS
-- =============================================

CREATE TABLE public.ficha_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ficha_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tipo_id uuid REFERENCES public.ficha_tipos(id) ON DELETE CASCADE NOT NULL,
  slug text NOT NULL,
  nome text NOT NULL,
  ordem int DEFAULT 0,
  ativo boolean DEFAULT true,
  UNIQUE(ficha_tipo_id, slug)
);

CREATE TABLE public.ficha_variacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES public.ficha_categorias(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  preco_adicional numeric DEFAULT 0,
  ativo boolean DEFAULT true,
  ordem int DEFAULT 0
);

CREATE TABLE public.status_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  ordem int DEFAULT 0
);

CREATE TABLE public.ficha_workflow (
  ficha_tipo_id uuid REFERENCES public.ficha_tipos(id) ON DELETE CASCADE NOT NULL,
  etapa_id uuid REFERENCES public.status_etapas(id) ON DELETE CASCADE NOT NULL,
  ativo boolean DEFAULT true,
  PRIMARY KEY (ficha_tipo_id, etapa_id)
);

-- =============================================
-- 2. RLS
-- =============================================

ALTER TABLE public.ficha_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_variacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_workflow ENABLE ROW LEVEL SECURITY;

-- ficha_tipos
CREATE POLICY "Authenticated can view ficha_tipos" ON public.ficha_tipos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert ficha_tipos" ON public.ficha_tipos FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));
CREATE POLICY "Admins can update ficha_tipos" ON public.ficha_tipos FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));
CREATE POLICY "Admins can delete ficha_tipos" ON public.ficha_tipos FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- ficha_categorias
CREATE POLICY "Authenticated can view ficha_categorias" ON public.ficha_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert ficha_categorias" ON public.ficha_categorias FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));
CREATE POLICY "Admins can update ficha_categorias" ON public.ficha_categorias FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));
CREATE POLICY "Admins can delete ficha_categorias" ON public.ficha_categorias FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- ficha_variacoes
CREATE POLICY "Authenticated can view ficha_variacoes" ON public.ficha_variacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert ficha_variacoes" ON public.ficha_variacoes FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));
CREATE POLICY "Admins can update ficha_variacoes" ON public.ficha_variacoes FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));
CREATE POLICY "Admins can delete ficha_variacoes" ON public.ficha_variacoes FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- status_etapas
CREATE POLICY "Authenticated can view status_etapas" ON public.status_etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert status_etapas" ON public.status_etapas FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));
CREATE POLICY "Admins can update status_etapas" ON public.status_etapas FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));
CREATE POLICY "Admins can delete status_etapas" ON public.status_etapas FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- ficha_workflow
CREATE POLICY "Authenticated can view ficha_workflow" ON public.ficha_workflow FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert ficha_workflow" ON public.ficha_workflow FOR INSERT TO authenticated WITH CHECK (is_any_admin(auth.uid()));
CREATE POLICY "Admins can update ficha_workflow" ON public.ficha_workflow FOR UPDATE TO authenticated USING (is_any_admin(auth.uid()));
CREATE POLICY "Admins can delete ficha_workflow" ON public.ficha_workflow FOR DELETE TO authenticated USING (is_any_admin(auth.uid()));

-- =============================================
-- 3. SEED DATA
-- =============================================

-- Tipos de ficha
INSERT INTO public.ficha_tipos (slug, nome) VALUES
  ('bota', 'Bota'),
  ('cinto', 'Cinto'),
  ('extra', 'Extra');

-- Etapas de produção (22 etapas)
INSERT INTO public.status_etapas (slug, nome, ordem) VALUES
  ('em-aberto', 'Em aberto', 1),
  ('aguardando', 'Aguardando', 2),
  ('corte', 'Corte', 3),
  ('sem-bordado', 'Sem bordado', 4),
  ('bordado-dinei', 'Bordado Dinei', 5),
  ('bordado-sandro', 'Bordado Sandro', 6),
  ('bordado-7estrivos', 'Bordado 7Estrivos', 7),
  ('pesponto-01', 'Pesponto 01', 8),
  ('pesponto-02', 'Pesponto 02', 9),
  ('pesponto-03', 'Pesponto 03', 10),
  ('pesponto-04', 'Pesponto 04', 11),
  ('pesponto-05', 'Pesponto 05', 12),
  ('pespontando', 'Pespontando', 13),
  ('montagem', 'Montagem', 14),
  ('revisao', 'Revisão', 15),
  ('expedicao', 'Expedição', 16),
  ('entregue', 'Entregue', 17),
  ('cobrado', 'Cobrado', 18),
  ('pago', 'Pago', 19),
  ('garantia', 'Garantia', 20),
  ('cancelado', 'Cancelado', 21),
  ('deletado', 'Deletado', 22);

-- Workflow: bota usa todas as etapas
INSERT INTO public.ficha_workflow (ficha_tipo_id, etapa_id, ativo)
SELECT ft.id, se.id, true
FROM public.ficha_tipos ft, public.status_etapas se
WHERE ft.slug = 'bota';

-- Workflow: cinto e extra usam etapas simplificadas
INSERT INTO public.ficha_workflow (ficha_tipo_id, etapa_id, ativo)
SELECT ft.id, se.id, true
FROM public.ficha_tipos ft, public.status_etapas se
WHERE ft.slug IN ('cinto', 'extra')
  AND se.slug IN ('em-aberto', 'aguardando', 'corte', 'montagem', 'revisao', 'expedicao', 'entregue', 'cobrado', 'pago', 'cancelado', 'deletado');

-- =============================================
-- 3b. CATEGORIAS E VARIAÇÕES (Bota)
-- =============================================

-- Helper: get bota id
DO $$
DECLARE
  v_bota_id uuid;
  v_cat_id uuid;
BEGIN
  SELECT id INTO v_bota_id FROM public.ficha_tipos WHERE slug = 'bota';

  -- MODELOS
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'modelos', 'Modelos', 1) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Bota Tradicional', 260, 1), (v_cat_id, 'Bota Feminino', 260, 2), (v_cat_id, 'Bota Peão', 260, 3),
    (v_cat_id, 'Bota Montaria (40)', 270, 4), (v_cat_id, 'Coturno', 240, 5), (v_cat_id, 'Destroyer', 200, 6),
    (v_cat_id, 'Capota', 230, 7), (v_cat_id, 'Capota Bico Fino', 230, 8), (v_cat_id, 'Capota Bico Fino Perfilado', 230, 9),
    (v_cat_id, 'Cano Médio', 205, 10), (v_cat_id, 'Botina', 200, 11), (v_cat_id, 'Bota Infantil', 170, 12),
    (v_cat_id, 'Botina Infantil', 160, 13), (v_cat_id, 'Bota Over', 270, 14), (v_cat_id, 'Urbano', 260, 15),
    (v_cat_id, 'Bota Bico Fino Feminino', 260, 16), (v_cat_id, 'Bota Bico Fino Perfilado', 260, 17),
    (v_cat_id, 'Tradicional Bico Fino', 260, 18), (v_cat_id, 'Cano Médio Infantil', 160, 19),
    (v_cat_id, 'City', 270, 20), (v_cat_id, 'Cano Inteiro', 260, 21);

  -- COUROS
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'couros', 'Tipos de Couro', 2) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Crazy Horse', 0, 1), (v_cat_id, 'Látego', 0, 2), (v_cat_id, 'Fóssil', 0, 3),
    (v_cat_id, 'Napa Flay', 0, 4), (v_cat_id, 'Floter', 0, 5), (v_cat_id, 'Nobuck', 0, 6),
    (v_cat_id, 'Estilizado em Avestruz', 10, 7), (v_cat_id, 'Estilizado em Arraia', 0, 8),
    (v_cat_id, 'Estilizado em Tilápia', 0, 9), (v_cat_id, 'Egípcio', 0, 10),
    (v_cat_id, 'Estilizado em Jacaré', 0, 11), (v_cat_id, 'Estilizado em Cobra', 0, 12),
    (v_cat_id, 'Estilizado em Dinossauro', 50, 13), (v_cat_id, 'Aramado', 40, 14),
    (v_cat_id, 'Escamado', 20, 15), (v_cat_id, 'Estilizado Duplo', 20, 16),
    (v_cat_id, 'Estilizado em Tatu', 40, 17), (v_cat_id, 'Vaca Holandesa', 15, 18),
    (v_cat_id, 'Vaca Pintada', 15, 19);

  -- CORES DE COURO
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'cores-couro', 'Cores de Couro', 3) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Nescau', 0, 1), (v_cat_id, 'Café', 0, 2), (v_cat_id, 'Marrom', 0, 3),
    (v_cat_id, 'Preto', 0, 4), (v_cat_id, 'Telha', 0, 5), (v_cat_id, 'Mostarda', 0, 6),
    (v_cat_id, 'Bege', 0, 7), (v_cat_id, 'Azul', 0, 8), (v_cat_id, 'Vermelho', 0, 9),
    (v_cat_id, 'Rosa', 0, 10), (v_cat_id, 'Branco', 0, 11), (v_cat_id, 'Off White', 0, 12),
    (v_cat_id, 'Pinhão', 0, 13), (v_cat_id, 'Verde', 0, 14), (v_cat_id, 'Amarelo', 0, 15),
    (v_cat_id, 'Brasileiro', 0, 16), (v_cat_id, 'Americano', 0, 17), (v_cat_id, 'Cappuccino', 0, 18),
    (v_cat_id, 'Areia', 0, 19), (v_cat_id, 'Mustang', 0, 20), (v_cat_id, 'Rosa Neon', 0, 21),
    (v_cat_id, 'Laranja', 0, 22), (v_cat_id, 'Cru', 0, 23), (v_cat_id, 'Havana', 0, 24),
    (v_cat_id, 'Petróleo', 0, 25), (v_cat_id, 'Malhado', 0, 26), (v_cat_id, 'Chocolate', 0, 27),
    (v_cat_id, 'Castor', 0, 28);

  -- BORDADOS CANO
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'bordados-cano', 'Bordados Cano', 4) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Florência', 25, 1), (v_cat_id, 'Linhas', 25, 2), (v_cat_id, 'Peão Elite G', 35, 3),
    (v_cat_id, 'Velho Barreiro', 70, 4), (v_cat_id, 'Rozeta', 35, 5), (v_cat_id, 'Nelore', 25, 6),
    (v_cat_id, 'Cruz Bordada', 25, 7), (v_cat_id, 'Milionário', 35, 8), (v_cat_id, 'Monster', 35, 9),
    (v_cat_id, 'Cruz Básica', 25, 10), (v_cat_id, 'Mulas', 25, 11), (v_cat_id, 'Ramos', 25, 12),
    (v_cat_id, 'Peão Elite P', 25, 13), (v_cat_id, 'N. Senhora', 25, 14), (v_cat_id, 'Logo Marca', 50, 15),
    (v_cat_id, 'N. Senhora P', 10, 16), (v_cat_id, 'Rozeta P', 10, 17), (v_cat_id, 'Cruz P', 10, 18),
    (v_cat_id, 'Monster P', 10, 19), (v_cat_id, 'Bandeira P', 15, 20),
    (v_cat_id, 'Bordado Variado R$5', 5, 21), (v_cat_id, 'Bordado Variado R$10', 10, 22),
    (v_cat_id, 'Bordado Variado R$15', 15, 23), (v_cat_id, 'Bordado Variado R$20', 20, 24),
    (v_cat_id, 'Bordado Variado R$25', 25, 25), (v_cat_id, 'Bordado Variado R$30', 30, 26),
    (v_cat_id, 'Bordado Variado R$35', 35, 27);

  -- BORDADOS GÁSPEA
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'bordados-gaspea', 'Bordados Gáspea', 5) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Florência', 15, 1), (v_cat_id, 'Peão Elite G', 20, 2), (v_cat_id, 'Nelore', 15, 3),
    (v_cat_id, 'Mulas', 15, 4), (v_cat_id, 'Cruz Bordada', 15, 5), (v_cat_id, 'Milionário', 20, 6),
    (v_cat_id, 'Monster', 20, 7), (v_cat_id, 'Cruz Básica', 15, 8), (v_cat_id, 'Rozeta', 20, 9),
    (v_cat_id, 'N. Senhora', 20, 10), (v_cat_id, 'Velho Barreiro', 35, 11), (v_cat_id, 'Peão Elite P', 25, 12),
    (v_cat_id, 'Logo Marca', 50, 13), (v_cat_id, 'N. Senhora P', 10, 14), (v_cat_id, 'Rozeta P', 10, 15),
    (v_cat_id, 'Cruz P', 10, 16), (v_cat_id, 'Monster P', 10, 17), (v_cat_id, 'Bandeira P', 15, 18),
    (v_cat_id, 'Bordado Variado R$5', 5, 19), (v_cat_id, 'Bordado Variado R$10', 10, 20),
    (v_cat_id, 'Bordado Variado R$15', 15, 21), (v_cat_id, 'Bordado Variado R$20', 20, 22),
    (v_cat_id, 'Bordado Variado R$25', 25, 23), (v_cat_id, 'Bordado Variado R$30', 30, 24),
    (v_cat_id, 'Bordado Variado R$35', 35, 25);

  -- BORDADOS TALONEIRA
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'bordados-taloneira', 'Bordados Taloneira', 6) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Florência', 10, 1), (v_cat_id, 'Nelore', 10, 2), (v_cat_id, 'Mulas', 10, 3),
    (v_cat_id, 'Cruz Bordada', 10, 4), (v_cat_id, 'Peão Elite P', 25, 5), (v_cat_id, 'Logo Marca', 50, 6),
    (v_cat_id, 'N. Senhora P', 10, 7), (v_cat_id, 'Rozeta P', 10, 8), (v_cat_id, 'Cruz P', 10, 9),
    (v_cat_id, 'Monster P', 10, 10), (v_cat_id, 'Bandeira P', 15, 11),
    (v_cat_id, 'Bordado Variado R$5', 5, 12), (v_cat_id, 'Bordado Variado R$10', 10, 13),
    (v_cat_id, 'Bordado Variado R$15', 15, 14), (v_cat_id, 'Bordado Variado R$20', 20, 15),
    (v_cat_id, 'Bordado Variado R$25', 25, 16), (v_cat_id, 'Bordado Variado R$30', 30, 17),
    (v_cat_id, 'Bordado Variado R$35', 35, 18);

  -- SOLADOS
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'solados', 'Solados', 7) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Borracha', 0, 1), (v_cat_id, 'Couro Reta', 60, 2), (v_cat_id, 'Couro Carrapeta', 60, 3),
    (v_cat_id, 'Couro Carrapeta com Espaço Espora', 60, 4), (v_cat_id, 'Jump', 30, 5),
    (v_cat_id, 'Rústica', 0, 6), (v_cat_id, 'Infantil', 0, 7), (v_cat_id, 'PVC', 0, 8),
    (v_cat_id, 'Borracha City', 0, 9);

  -- ACESSÓRIOS
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'acessorios', 'Acessórios', 8) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Kit Faca', 70, 1), (v_cat_id, 'Kit Canivete', 60, 2), (v_cat_id, 'Kit Cantil', 40, 3),
    (v_cat_id, 'Bolso', 50, 4), (v_cat_id, 'Zíper inteiro', 40, 5);

  -- LASER
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'laser', 'Opções de Laser', 9) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Cruz', 0, 1), (v_cat_id, 'Bridão', 0, 2), (v_cat_id, 'Pipoco', 0, 3),
    (v_cat_id, 'Ouro', 0, 4), (v_cat_id, 'Florência Brilhante', 0, 5), (v_cat_id, 'Folhas', 0, 6),
    (v_cat_id, 'Lara', 0, 7), (v_cat_id, 'Rodeio', 0, 8), (v_cat_id, 'Iluminada', 0, 9),
    (v_cat_id, 'Cruz Asas', 0, 10), (v_cat_id, 'Beca', 0, 11), (v_cat_id, 'Coração', 0, 12),
    (v_cat_id, 'Cruz Circular', 0, 13), (v_cat_id, 'Cruz Zero', 0, 14), (v_cat_id, 'Borboleta', 0, 15),
    (v_cat_id, 'Livia', 0, 16), (v_cat_id, 'Luiza', 0, 17), (v_cat_id, 'Duquesa', 0, 18),
    (v_cat_id, 'Julia', 0, 19), (v_cat_id, 'Anjo', 0, 20), (v_cat_id, 'Pintura Cavalo', 0, 21),
    (v_cat_id, 'Outro', 0, 22);

  -- COR GLITTER
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'cor-glitter', 'Cores de Glitter', 10) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Dourado', 0, 1), (v_cat_id, 'Prata', 0, 2), (v_cat_id, 'Rosa Claro', 0, 3),
    (v_cat_id, 'Rosa Pink', 0, 4), (v_cat_id, 'Azul', 0, 5), (v_cat_id, 'Preto', 0, 6),
    (v_cat_id, 'Marrom', 0, 7), (v_cat_id, 'Vermelho', 0, 8);

  -- COR LINHA
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'cor-linha', 'Cores de Linha', 11) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Bege', 0, 1), (v_cat_id, 'Branca', 0, 2), (v_cat_id, 'Preta', 0, 3),
    (v_cat_id, 'Café', 0, 4), (v_cat_id, 'Vermelha', 0, 5), (v_cat_id, 'Azul', 0, 6),
    (v_cat_id, 'Verde', 0, 7), (v_cat_id, 'Rosa', 0, 8), (v_cat_id, 'Amarelo', 0, 9),
    (v_cat_id, 'Laranja', 0, 10);

  -- COR SOLA
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'cor-sola', 'Cores de Sola', 12) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Marrom', 20, 1), (v_cat_id, 'Preto', 0, 2), (v_cat_id, 'Branco', 20, 3),
    (v_cat_id, 'Madeira', 0, 4), (v_cat_id, 'Avermelhada', 10, 5), (v_cat_id, 'Pintada de Preto', 0, 6),
    (v_cat_id, 'Off White', 0, 7);

  -- COR VIRA
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'cor-vira', 'Cores de Vira', 13) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Bege', 0, 1), (v_cat_id, 'Preto', 10, 2), (v_cat_id, 'Rosa', 10, 3), (v_cat_id, 'Neutra', 0, 4);

  -- FORMATO BICO
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'formato-bico', 'Formato do Bico', 14) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Quadrado', 0, 1), (v_cat_id, 'Redondo', 0, 2), (v_cat_id, 'Fino Ponta Redonda', 0, 3),
    (v_cat_id, 'Fino Ponta Quadrada', 0, 4), (v_cat_id, 'Fino Agulha Ponta Quadrada', 0, 5),
    (v_cat_id, 'Fino Agulha Ponta Redonda', 0, 6);

  -- DESENVOLVIMENTO
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'desenvolvimento', 'Desenvolvimento', 15) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Estampa', 150, 1), (v_cat_id, 'Laser', 100, 2), (v_cat_id, 'Bordado', 50, 3);

  -- CARIMBO
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'carimbo', 'Carimbo a Fogo', 16) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Até 3 Carimbos', 20, 1), (v_cat_id, 'Até 6 Carimbos', 40, 2);

  -- METAIS (área)
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'area-metal', 'Área de Metal', 17) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Inteira', 30, 1), (v_cat_id, 'Metade da Bota', 15, 2);

  -- COR BORRACHINHA
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'cor-borrachinha', 'Cores de Borrachinha', 18) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Preto', 0, 1), (v_cat_id, 'Marrom', 0, 2), (v_cat_id, 'Branco', 0, 3), (v_cat_id, 'Rosa', 0, 4);

  -- COR VIVO
  INSERT INTO public.ficha_categorias (ficha_tipo_id, slug, nome, ordem) VALUES (v_bota_id, 'cor-vivo', 'Cores do Vivo', 19) RETURNING id INTO v_cat_id;
  INSERT INTO public.ficha_variacoes (categoria_id, nome, preco_adicional, ordem) VALUES
    (v_cat_id, 'Preto', 0, 1), (v_cat_id, 'Branco', 0, 2), (v_cat_id, 'Rosa', 0, 3),
    (v_cat_id, 'Azul', 0, 4), (v_cat_id, 'Laranja', 0, 5);

END $$;
