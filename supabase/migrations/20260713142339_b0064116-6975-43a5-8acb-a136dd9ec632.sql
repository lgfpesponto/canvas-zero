
-- =========================================================
-- 1) Coluna estoque_pronto em orders
-- =========================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estoque_pronto boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_estoque_pronto
  ON public.orders(estoque_pronto) WHERE estoque_pronto = true;

-- =========================================================
-- 2) Tabela estoque_emprestimos
-- =========================================================
CREATE TABLE IF NOT EXISTS public.estoque_emprestimos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.estoque_produtos(id) ON DELETE CASCADE,
  tamanho text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  vendedor_id uuid,
  vendedor_nome text NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','devolvido')),
  observacao text,
  criado_por uuid REFERENCES auth.users(id),
  devolvido_em timestamptz,
  devolvido_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emprestimos_produto ON public.estoque_emprestimos(produto_id);
CREATE INDEX IF NOT EXISTS idx_emprestimos_vendedor ON public.estoque_emprestimos(vendedor_id) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_emprestimos_status ON public.estoque_emprestimos(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_emprestimos TO authenticated;
GRANT ALL ON public.estoque_emprestimos TO service_role;

ALTER TABLE public.estoque_emprestimos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emprestimos_read_all" ON public.estoque_emprestimos;
CREATE POLICY "emprestimos_read_all" ON public.estoque_emprestimos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "emprestimos_admin_write" ON public.estoque_emprestimos;
CREATE POLICY "emprestimos_admin_write" ON public.estoque_emprestimos
  FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_emprestimos_touch ON public.estoque_emprestimos;
CREATE TRIGGER trg_emprestimos_touch
  BEFORE UPDATE ON public.estoque_emprestimos
  FOR EACH ROW EXECUTE FUNCTION public.touch_estoque_produtos();

-- =========================================================
-- 3) Tabela estoque_ajustes_log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.estoque_ajustes_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid REFERENCES public.estoque_produtos(id) ON DELETE SET NULL,
  produto_nome text,
  sku_base text,
  tamanho text,
  delta integer NOT NULL,
  quantidade_antes integer,
  quantidade_depois integer,
  motivo text,
  usuario_id uuid REFERENCES auth.users(id),
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_log_produto ON public.estoque_ajustes_log(produto_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_log_created ON public.estoque_ajustes_log(created_at DESC);

GRANT SELECT, INSERT ON public.estoque_ajustes_log TO authenticated;
GRANT ALL ON public.estoque_ajustes_log TO service_role;

ALTER TABLE public.estoque_ajustes_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ajustes_log_admin_read" ON public.estoque_ajustes_log;
CREATE POLICY "ajustes_log_admin_read" ON public.estoque_ajustes_log
  FOR SELECT TO authenticated USING (public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "ajustes_log_admin_write" ON public.estoque_ajustes_log;
CREATE POLICY "ajustes_log_admin_write" ON public.estoque_ajustes_log
  FOR INSERT TO authenticated WITH CHECK (public.is_any_admin(auth.uid()));

-- =========================================================
-- 4) Tabela estoque_bagy_sync_pendente
-- =========================================================
CREATE TABLE IF NOT EXISTS public.estoque_bagy_sync_pendente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.estoque_produtos(id) ON DELETE CASCADE,
  sku_base text NOT NULL,
  tamanho text NOT NULL,
  quantidade_atual integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  sincronizado_em timestamptz,
  sincronizado_por uuid REFERENCES auth.users(id),
  sincronizado_por_nome text,
  erro text,
  UNIQUE (produto_id)
);

CREATE INDEX IF NOT EXISTS idx_bagy_pendente_status
  ON public.estoque_bagy_sync_pendente(sincronizado_em) WHERE sincronizado_em IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_bagy_sync_pendente TO authenticated;
GRANT ALL ON public.estoque_bagy_sync_pendente TO service_role;

ALTER TABLE public.estoque_bagy_sync_pendente ENABLE ROW LEVEL SECURITY;

-- helper: quem pode sincronizar bagy = admin_master, admin_producao, vendedor_comissao
CREATE OR REPLACE FUNCTION public.pode_sincronizar_bagy(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('admin_master','admin_producao','vendedor_comissao')
  );
$$;
GRANT EXECUTE ON FUNCTION public.pode_sincronizar_bagy(uuid) TO authenticated;

DROP POLICY IF EXISTS "bagy_pendente_read" ON public.estoque_bagy_sync_pendente;
CREATE POLICY "bagy_pendente_read" ON public.estoque_bagy_sync_pendente
  FOR SELECT TO authenticated USING (public.pode_sincronizar_bagy(auth.uid()));

DROP POLICY IF EXISTS "bagy_pendente_write" ON public.estoque_bagy_sync_pendente;
CREATE POLICY "bagy_pendente_write" ON public.estoque_bagy_sync_pendente
  FOR ALL TO authenticated
  USING (public.pode_sincronizar_bagy(auth.uid()))
  WITH CHECK (public.pode_sincronizar_bagy(auth.uid()));

-- =========================================================
-- 5) Trigger em estoque_produtos: sempre que quantidade sobe, insere/atualiza pendente
-- =========================================================
CREATE OR REPLACE FUNCTION public.trg_estoque_marca_pendente_bagy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.quantidade > COALESCE(OLD.quantidade, 0)) THEN
    INSERT INTO public.estoque_bagy_sync_pendente (produto_id, sku_base, tamanho, quantidade_atual)
    VALUES (NEW.id, NEW.sku_base, NEW.tamanho, NEW.quantidade)
    ON CONFLICT (produto_id) DO UPDATE
      SET quantidade_atual = EXCLUDED.quantidade_atual,
          criado_em = now(),
          sincronizado_em = NULL,
          sincronizado_por = NULL,
          sincronizado_por_nome = NULL,
          erro = NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_estoque_marca_pendente ON public.estoque_produtos;
CREATE TRIGGER trg_estoque_marca_pendente
  AFTER INSERT OR UPDATE OF quantidade ON public.estoque_produtos
  FOR EACH ROW EXECUTE FUNCTION public.trg_estoque_marca_pendente_bagy();

-- =========================================================
-- 6) RPC: ajuste manual de estoque com log
-- =========================================================
CREATE OR REPLACE FUNCTION public.ajustar_estoque_manual(
  _produto_id uuid,
  _delta integer,
  _motivo text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prod record;
  v_novo integer;
BEGIN
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admins podem ajustar estoque';
  END IF;

  SELECT * INTO v_prod FROM public.estoque_produtos WHERE id = _produto_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;

  v_novo := v_prod.quantidade + _delta;
  IF v_novo < 0 THEN
    RAISE EXCEPTION 'Ajuste inválido: quantidade final ficaria negativa (%)', v_novo;
  END IF;

  UPDATE public.estoque_produtos SET quantidade = v_novo, updated_at = now() WHERE id = _produto_id;

  INSERT INTO public.estoque_ajustes_log
    (produto_id, produto_nome, sku_base, tamanho, delta, quantidade_antes, quantidade_depois, motivo, usuario_id, usuario_nome)
  VALUES
    (_produto_id, v_prod.nome, v_prod.sku_base, v_prod.tamanho, _delta, v_prod.quantidade, v_novo, _motivo,
     auth.uid(), COALESCE(public.current_user_nome_completo(),'Admin'));

  RETURN v_novo;
END; $$;

GRANT EXECUTE ON FUNCTION public.ajustar_estoque_manual(uuid, integer, text) TO authenticated;

-- =========================================================
-- 7) RPC: edição de metadata do produto (nome/foto/preço)
-- =========================================================
CREATE OR REPLACE FUNCTION public.editar_produto_estoque(
  _produto_id uuid,
  _nome text DEFAULT NULL,
  _foto_url text DEFAULT NULL,
  _preco numeric DEFAULT NULL,
  _sku_base text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admins podem editar produtos do estoque';
  END IF;

  UPDATE public.estoque_produtos
     SET nome = COALESCE(NULLIF(trim(_nome),''), nome),
         foto_url = COALESCE(NULLIF(trim(_foto_url),''), foto_url),
         preco = COALESCE(_preco, preco),
         sku_base = COALESCE(NULLIF(trim(_sku_base),''), sku_base),
         updated_at = now()
   WHERE id = _produto_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.editar_produto_estoque(uuid, text, text, numeric, text) TO authenticated;

-- =========================================================
-- 8) Realtime
-- =========================================================
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_emprestimos;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_bagy_sync_pendente;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_ajustes_log;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
