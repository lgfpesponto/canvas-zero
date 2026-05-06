-- Tabela de flags globais do sistema
CREATE TABLE IF NOT EXISTS public.system_flags (
  key text PRIMARY KEY,
  value boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem system_flags"
  ON public.system_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_master insere system_flags"
  ON public.system_flags FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "admin_master atualiza system_flags"
  ON public.system_flags FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Seed inicial: baixa automática ligada (mantém comportamento atual)
INSERT INTO public.system_flags (key, value)
VALUES ('baixa_automatica_ativa', true)
ON CONFLICT (key) DO NOTHING;

-- Habilita realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_flags;

-- Modifica a função tentar_baixa_automatica para respeitar a flag
CREATE OR REPLACE FUNCTION public.tentar_baixa_automatica(_vendedor text, _admin_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  saldo numeric;
  ped record;
  valor_p numeric;
  novo_mov_id uuid;
  baixadas integer := 0;
  hist_entry jsonb;
  flag_ativa boolean;
BEGIN
  -- Respeita flag global de baixa automática
  SELECT value INTO flag_ativa FROM public.system_flags WHERE key = 'baixa_automatica_ativa';
  IF NOT COALESCE(flag_ativa, true) THEN
    RETURN 0;
  END IF;

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

      hist_entry := jsonb_build_object(
        'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
        'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
        'local', 'Pago',
        'descricao', 'Pedido movido para Pago',
        'usuario', 'Baixa automática'
      );

      UPDATE public.orders
         SET status = 'Pago',
             historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
       WHERE id = ped.id
         AND status = 'Cobrado';

      saldo := saldo - valor_p;
      baixadas := baixadas + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN baixadas;
END;
$function$;