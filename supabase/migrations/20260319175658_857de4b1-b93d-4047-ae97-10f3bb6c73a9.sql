
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL DEFAULT '',
  nome_usuario TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cpf_cnpj TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL UNIQUE,
  vendedor TEXT NOT NULL DEFAULT '',
  tamanho TEXT NOT NULL DEFAULT '',
  genero TEXT,
  modelo TEXT NOT NULL DEFAULT '',
  solado TEXT NOT NULL DEFAULT '',
  formato_bico TEXT NOT NULL DEFAULT '',
  cor_vira TEXT NOT NULL DEFAULT '',
  couro_gaspea TEXT NOT NULL DEFAULT '',
  couro_cano TEXT NOT NULL DEFAULT '',
  couro_taloneira TEXT NOT NULL DEFAULT '',
  cor_couro_gaspea TEXT,
  cor_couro_cano TEXT,
  cor_couro_taloneira TEXT,
  bordado_cano TEXT NOT NULL DEFAULT '',
  bordado_gaspea TEXT NOT NULL DEFAULT '',
  bordado_taloneira TEXT NOT NULL DEFAULT '',
  cor_bordado_cano TEXT,
  cor_bordado_gaspea TEXT,
  cor_bordado_taloneira TEXT,
  bordado_variado_desc_cano TEXT,
  bordado_variado_desc_gaspea TEXT,
  bordado_variado_desc_taloneira TEXT,
  personalizacao_nome TEXT NOT NULL DEFAULT '',
  personalizacao_bordado TEXT NOT NULL DEFAULT '',
  nome_bordado_desc TEXT,
  cor_linha TEXT NOT NULL DEFAULT '',
  cor_borrachinha TEXT NOT NULL DEFAULT '',
  trisce TEXT NOT NULL DEFAULT 'Não',
  trice_desc TEXT,
  tiras TEXT NOT NULL DEFAULT 'Não',
  tiras_desc TEXT,
  metais TEXT NOT NULL DEFAULT '',
  tipo_metal TEXT,
  cor_metal TEXT,
  strass_qtd INTEGER,
  cruz_metal_qtd INTEGER,
  bridao_metal_qtd INTEGER,
  acessorios TEXT NOT NULL DEFAULT '',
  desenvolvimento TEXT NOT NULL DEFAULT '',
  sob_medida BOOLEAN NOT NULL DEFAULT false,
  sob_medida_desc TEXT,
  observacao TEXT NOT NULL DEFAULT '',
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Em aberto',
  data_criacao TEXT NOT NULL,
  hora_criacao TEXT NOT NULL,
  dias_restantes INTEGER NOT NULL DEFAULT 10,
  tem_laser BOOLEAN NOT NULL DEFAULT false,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  historico JSONB NOT NULL DEFAULT '[]'::jsonb,
  alteracoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  laser_cano TEXT,
  cor_glitter_cano TEXT,
  laser_gaspea TEXT,
  cor_glitter_gaspea TEXT,
  laser_taloneira TEXT,
  cor_glitter_taloneira TEXT,
  estampa TEXT,
  estampa_desc TEXT,
  pintura TEXT,
  pintura_desc TEXT,
  costura_atras TEXT,
  cor_sola TEXT,
  carimbo TEXT,
  carimbo_desc TEXT,
  cor_vivo TEXT,
  adicional_desc TEXT,
  adicional_valor NUMERIC(10,2),
  desconto NUMERIC(10,2),
  desconto_justificativa TEXT,
  forma TEXT,
  tipo_extra TEXT,
  extra_detalhes JSONB,
  numero_pedido_bota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. Indexes
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_numero ON public.orders(numero);

-- 7. RLS policies for profiles
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 8. RLS policies for user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 9. RLS policies for orders
CREATE POLICY "Users read own orders or admin reads all" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own orders or admin updates all" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own orders or admin deletes all" ON public.orders
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 10. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, nome_usuario, telefone, email, cpf_cnpj)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', ''),
    COALESCE(NEW.raw_user_meta_data->>'nome_usuario', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    COALESCE(NEW.raw_user_meta_data->>'email_contato', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'cpf_cnpj', '')
  );
  -- Auto-assign 'user' role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
