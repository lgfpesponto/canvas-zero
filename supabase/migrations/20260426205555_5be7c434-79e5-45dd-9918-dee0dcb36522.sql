
-- ============================================================================
-- SISTEMA DE SALDO DO REVENDEDOR
-- ============================================================================

-- 1. Helper: pega nome_completo do user atual (usado nas policies)
CREATE OR REPLACE FUNCTION public.current_user_nome_completo()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nome_completo FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================================
-- 2. TABELAS
-- ============================================================================

-- 2.1 Comprovantes enviados pelos revendedores
CREATE TABLE public.revendedor_comprovantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor text NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  data_pagamento date NOT NULL,
  observacao text,
  comprovante_url text NOT NULL,
  comprovante_hash text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','reprovado')),
  motivo_reprovacao text,
  enviado_por uuid NOT NULL,
  aprovado_por uuid,
  aprovado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rev_comp_vendedor ON public.revendedor_comprovantes(vendedor, created_at DESC);
CREATE INDEX idx_rev_comp_status ON public.revendedor_comprovantes(status);
CREATE INDEX idx_rev_comp_hash ON public.revendedor_comprovantes(comprovante_hash);

-- 2.2 Livro-razão de movimentos de saldo
CREATE TABLE public.revendedor_saldo_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada_comprovante','baixa_pedido','ajuste_admin','estorno')),
  valor numeric NOT NULL CHECK (valor > 0),
  descricao text,
  comprovante_id uuid REFERENCES public.revendedor_comprovantes(id) ON DELETE SET NULL,
  order_id uuid,
  saldo_anterior numeric NOT NULL DEFAULT 0,
  saldo_posterior numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rev_mov_vendedor ON public.revendedor_saldo_movimentos(vendedor, created_at DESC);
CREATE INDEX idx_rev_mov_order ON public.revendedor_saldo_movimentos(order_id);
CREATE INDEX idx_rev_mov_comp ON public.revendedor_saldo_movimentos(comprovante_id);

-- 2.3 Baixas integrais de pedidos
CREATE TABLE public.revendedor_baixas_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  vendedor text NOT NULL,
  valor_pedido numeric NOT NULL,
  movimento_id uuid REFERENCES public.revendedor_saldo_movimentos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rev_baixa_vendedor ON public.revendedor_baixas_pedido(vendedor, created_at DESC);

-- 2.4 Lista de revendedores com acesso (visibilidade controlada)
CREATE TABLE public.revendedor_saldo_visibilidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: Stefany liberada para teste
INSERT INTO public.revendedor_saldo_visibilidade (vendedor) VALUES ('stefany ribeiro feliciano');

-- ============================================================================
-- 3. VIEW DE SALDO AGREGADO
-- ============================================================================
CREATE OR REPLACE VIEW public.vw_revendedor_saldo
WITH (security_invoker=on) AS
SELECT
  vendedor,
  COALESCE(SUM(CASE WHEN tipo IN ('entrada_comprovante','ajuste_admin') THEN valor ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN tipo IN ('baixa_pedido') THEN valor ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN tipo = 'estorno' THEN valor ELSE 0 END), 0)
    AS saldo_disponivel,
  COALESCE(SUM(CASE WHEN tipo = 'entrada_comprovante' THEN valor ELSE 0 END), 0) AS total_recebido,
  COALESCE(SUM(CASE WHEN tipo = 'baixa_pedido' THEN valor ELSE 0 END), 0) AS total_utilizado,
  COALESCE(SUM(CASE WHEN tipo = 'ajuste_admin' THEN valor ELSE 0 END), 0) AS total_ajustes,
  COALESCE(SUM(CASE WHEN tipo = 'estorno' THEN valor ELSE 0 END), 0) AS total_estornos
FROM public.revendedor_saldo_movimentos
GROUP BY vendedor;

-- ============================================================================
-- 4. RLS
-- ============================================================================

ALTER TABLE public.revendedor_comprovantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revendedor_saldo_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revendedor_baixas_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revendedor_saldo_visibilidade ENABLE ROW LEVEL SECURITY;

-- 4.1 revendedor_comprovantes
CREATE POLICY "Admin master vê tudo de comprovantes"
  ON public.revendedor_comprovantes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Revendedor vê próprios comprovantes"
  ON public.revendedor_comprovantes FOR SELECT TO authenticated
  USING (vendedor = current_user_nome_completo());

CREATE POLICY "Revendedor envia próprios comprovantes"
  ON public.revendedor_comprovantes FOR INSERT TO authenticated
  WITH CHECK (
    enviado_por = auth.uid()
    AND vendedor = current_user_nome_completo()
    AND status = 'pendente'
  );

CREATE POLICY "Admin master atualiza comprovantes"
  ON public.revendedor_comprovantes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master apaga comprovantes"
  ON public.revendedor_comprovantes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- 4.2 revendedor_saldo_movimentos (auditoria imutável)
CREATE POLICY "Admin master vê todos movimentos"
  ON public.revendedor_saldo_movimentos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Revendedor vê próprios movimentos"
  ON public.revendedor_saldo_movimentos FOR SELECT TO authenticated
  USING (vendedor = current_user_nome_completo());

-- INSERT/UPDATE/DELETE bloqueados via RLS — só funções SECURITY DEFINER inserem
CREATE POLICY "Bloqueia insert direto em movimentos"
  ON public.revendedor_saldo_movimentos FOR INSERT TO authenticated
  WITH CHECK (false);

-- 4.3 revendedor_baixas_pedido
CREATE POLICY "Admin master vê todas baixas"
  ON public.revendedor_baixas_pedido FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Revendedor vê próprias baixas"
  ON public.revendedor_baixas_pedido FOR SELECT TO authenticated
  USING (vendedor = current_user_nome_completo());

CREATE POLICY "Bloqueia insert direto em baixas"
  ON public.revendedor_baixas_pedido FOR INSERT TO authenticated
  WITH CHECK (false);

-- 4.4 revendedor_saldo_visibilidade
CREATE POLICY "Autenticados podem ler visibilidade"
  ON public.revendedor_saldo_visibilidade FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin master gerencia visibilidade insert"
  ON public.revendedor_saldo_visibilidade FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master gerencia visibilidade update"
  ON public.revendedor_saldo_visibilidade FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master gerencia visibilidade delete"
  ON public.revendedor_saldo_visibilidade FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- ============================================================================
-- 5. FUNÇÕES RPC
-- ============================================================================

-- 5.1 Saldo atual (helper interno)
CREATE OR REPLACE FUNCTION public.saldo_atual_revendedor(_vendedor text)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(saldo_disponivel, 0) FROM public.vw_revendedor_saldo WHERE vendedor = _vendedor
$$;

-- 5.2 Tenta baixar pedidos cobrados (FIFO, sempre integral)
CREATE OR REPLACE FUNCTION public.tentar_baixa_automatica(_vendedor text, _admin_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  saldo numeric;
  ped record;
  valor_p numeric;
  novo_mov_id uuid;
  baixadas integer := 0;
BEGIN
  saldo := COALESCE(saldo_atual_revendedor(_vendedor), 0);

  FOR ped IN
    SELECT o.id, o.preco, o.quantidade, o.data_criacao, o.created_at
    FROM public.orders o
    WHERE o.vendedor = _vendedor
      AND o.status = 'Cobrado'
      AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
    ORDER BY o.data_criacao ASC, o.created_at ASC
  LOOP
    valor_p := COALESCE(ped.preco, 0) * COALESCE(ped.quantidade, 1);
    IF valor_p <= 0 THEN CONTINUE; END IF;

    IF saldo >= valor_p THEN
      INSERT INTO public.revendedor_saldo_movimentos
        (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
      VALUES
        (_vendedor, 'baixa_pedido', valor_p, 'Baixa automática de pedido cobrado',
         ped.id, saldo, saldo - valor_p, _admin_id)
      RETURNING id INTO novo_mov_id;

      INSERT INTO public.revendedor_baixas_pedido
        (order_id, vendedor, valor_pedido, movimento_id)
      VALUES (ped.id, _vendedor, valor_p, novo_mov_id);

      saldo := saldo - valor_p;
      baixadas := baixadas + 1;
    ELSE
      EXIT; -- preserva FIFO
    END IF;
  END LOOP;

  RETURN baixadas;
END;
$$;

-- 5.3 Aprovar comprovante (admin)
CREATE OR REPLACE FUNCTION public.aprovar_comprovante_revendedor(_comprovante_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  comp record;
  saldo_ant numeric;
  baixadas integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode aprovar comprovantes';
  END IF;

  SELECT * INTO comp FROM public.revendedor_comprovantes WHERE id = _comprovante_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comprovante não encontrado'; END IF;
  IF comp.status <> 'pendente' THEN
    RAISE EXCEPTION 'Comprovante já foi % anteriormente', comp.status;
  END IF;

  UPDATE public.revendedor_comprovantes
  SET status = 'aprovado', aprovado_por = auth.uid(), aprovado_em = now()
  WHERE id = _comprovante_id;

  saldo_ant := COALESCE(saldo_atual_revendedor(comp.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, comprovante_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (comp.vendedor, 'entrada_comprovante', comp.valor,
     'Comprovante aprovado em ' || to_char(now(),'DD/MM/YYYY'),
     _comprovante_id, saldo_ant, saldo_ant + comp.valor, auth.uid());

  baixadas := tentar_baixa_automatica(comp.vendedor, auth.uid());

  RETURN jsonb_build_object('aprovado', true, 'baixas_realizadas', baixadas);
END;
$$;

-- 5.4 Reprovar comprovante (admin)
CREATE OR REPLACE FUNCTION public.reprovar_comprovante_revendedor(_comprovante_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode reprovar comprovantes';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo da reprovação é obrigatório';
  END IF;

  UPDATE public.revendedor_comprovantes
  SET status = 'reprovado',
      motivo_reprovacao = _motivo,
      aprovado_por = auth.uid(),
      aprovado_em = now()
  WHERE id = _comprovante_id AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comprovante não encontrado ou não está pendente';
  END IF;
END;
$$;

-- 5.5 Ajuste manual (admin)
CREATE OR REPLACE FUNCTION public.ajustar_saldo_revendedor(_vendedor text, _delta numeric, _descricao text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  saldo_ant numeric;
  baixadas integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode ajustar saldo';
  END IF;
  IF _descricao IS NULL OR length(trim(_descricao)) = 0 THEN
    RAISE EXCEPTION 'Motivo do ajuste é obrigatório';
  END IF;
  IF _delta = 0 THEN
    RAISE EXCEPTION 'Valor do ajuste não pode ser zero';
  END IF;

  saldo_ant := COALESCE(saldo_atual_revendedor(_vendedor), 0);

  IF _delta > 0 THEN
    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, saldo_anterior, saldo_posterior, created_by)
    VALUES
      (_vendedor, 'ajuste_admin', _delta, _descricao, saldo_ant, saldo_ant + _delta, auth.uid());
    baixadas := tentar_baixa_automatica(_vendedor, auth.uid());
  ELSE
    -- ajuste negativo: usa tipo 'baixa_pedido' não cabe; armazena como ajuste_admin com valor positivo
    -- mas marcamos descricao com sinal e gravamos saldo_posterior já reduzido
    -- Para simplificar e respeitar o CHECK valor>0, gravamos como 'estorno' invertido (subtrai do saldo via tipo baixa)
    -- Optamos por bloquear ajuste negativo abaixo de zero do saldo
    IF saldo_ant + _delta < 0 THEN
      RAISE EXCEPTION 'Ajuste negativo deixaria o saldo negativo (atual: %, delta: %)', saldo_ant, _delta;
    END IF;
    -- registra como movimento de baixa_pedido SEM order_id (descrição obrigatória explica)
    INSERT INTO public.revendedor_saldo_movimentos
      (vendedor, tipo, valor, descricao, saldo_anterior, saldo_posterior, created_by)
    VALUES
      (_vendedor, 'baixa_pedido', abs(_delta),
       '[AJUSTE NEGATIVO] ' || _descricao,
       saldo_ant, saldo_ant + _delta, auth.uid());
  END IF;

  RETURN jsonb_build_object('saldo_anterior', saldo_ant, 'saldo_posterior', saldo_ant + _delta, 'baixas_realizadas', baixadas);
END;
$$;

-- 5.6 Estornar baixa (admin)
CREATE OR REPLACE FUNCTION public.estornar_baixa_revendedor(_baixa_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  baixa record;
  saldo_ant numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode estornar baixas';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo do estorno é obrigatório';
  END IF;

  SELECT * INTO baixa FROM public.revendedor_baixas_pedido WHERE id = _baixa_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Baixa não encontrada'; END IF;

  saldo_ant := COALESCE(saldo_atual_revendedor(baixa.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (baixa.vendedor, 'estorno', baixa.valor_pedido,
     'Estorno de baixa: ' || _motivo,
     baixa.order_id, saldo_ant, saldo_ant + baixa.valor_pedido, auth.uid());

  DELETE FROM public.revendedor_baixas_pedido WHERE id = _baixa_id;
END;
$$;
