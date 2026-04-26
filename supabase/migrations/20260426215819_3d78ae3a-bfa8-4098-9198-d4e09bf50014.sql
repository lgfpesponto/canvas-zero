-- 1. Tabela
CREATE TABLE public.order_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  vendedor text NOT NULL,
  numero text NOT NULL,
  descricao text NOT NULL,
  status_no_momento text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_order_notificacoes_vendedor_lida_created
  ON public.order_notificacoes (vendedor, lida, created_at DESC);
CREATE INDEX idx_order_notificacoes_order
  ON public.order_notificacoes (order_id);

-- 2. RLS
ALTER TABLE public.order_notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedor vê próprias notificações"
  ON public.order_notificacoes FOR SELECT TO authenticated
  USING (vendedor = current_user_nome_completo() OR is_any_admin(auth.uid()));

CREATE POLICY "Vendedor marca própria notificação como lida"
  ON public.order_notificacoes FOR UPDATE TO authenticated
  USING (vendedor = current_user_nome_completo())
  WITH CHECK (vendedor = current_user_nome_completo());

CREATE POLICY "Bloqueia insert direto em notificacoes"
  ON public.order_notificacoes FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Admin master apaga notificacoes"
  ON public.order_notificacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- 3. RPC: registrar alterações pós-entrega
CREATE OR REPLACE FUNCTION public.registrar_alteracoes_pos_entrega(
  _order_id uuid,
  _descricoes text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ped record;
  d text;
  inseridas integer := 0;
BEGIN
  IF _descricoes IS NULL OR array_length(_descricoes, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT id, numero, vendedor, status
    INTO ped
    FROM public.orders
   WHERE id = _order_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  IF ped.status NOT IN ('Entregue', 'Cobrado', 'Pago') THEN
    RETURN 0;
  END IF;

  IF ped.vendedor IS NULL OR length(trim(ped.vendedor)) = 0 OR ped.vendedor = 'Estoque' THEN
    RETURN 0;
  END IF;

  FOREACH d IN ARRAY _descricoes LOOP
    IF d IS NULL OR length(trim(d)) = 0 THEN CONTINUE; END IF;
    INSERT INTO public.order_notificacoes
      (order_id, vendedor, numero, descricao, status_no_momento, created_by)
    VALUES
      (ped.id, ped.vendedor, ped.numero, d, ped.status, auth.uid());
    inseridas := inseridas + 1;
  END LOOP;

  RETURN inseridas;
END;
$$;

-- 4. RPC: marcar uma como lida
CREATE OR REPLACE FUNCTION public.marcar_notificacao_lida(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meu_nome text;
BEGIN
  meu_nome := current_user_nome_completo();
  IF meu_nome IS NULL THEN
    RAISE EXCEPTION 'Usuário não identificado';
  END IF;

  UPDATE public.order_notificacoes
     SET lida = true, lida_em = now()
   WHERE id = _id AND vendedor = meu_nome;
END;
$$;

-- 5. RPC: marcar todas como lidas
CREATE OR REPLACE FUNCTION public.marcar_todas_notificacoes_lidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meu_nome text;
  qtd integer := 0;
BEGIN
  meu_nome := current_user_nome_completo();
  IF meu_nome IS NULL THEN
    RAISE EXCEPTION 'Usuário não identificado';
  END IF;

  WITH upd AS (
    UPDATE public.order_notificacoes
       SET lida = true, lida_em = now()
     WHERE vendedor = meu_nome AND lida = false
     RETURNING 1
  )
  SELECT count(*) INTO qtd FROM upd;
  RETURN qtd;
END;
$$;

-- 6. Realtime
ALTER TABLE public.order_notificacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_notificacoes;