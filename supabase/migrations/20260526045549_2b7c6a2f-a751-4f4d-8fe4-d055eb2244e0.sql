-- 1) Tabela order_ajuste_solicitacoes
CREATE TABLE IF NOT EXISTS public.order_ajuste_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  vendedor text NOT NULL,
  numero text NOT NULL,
  valor_atual numeric NOT NULL DEFAULT 0,
  valor_solicitado numeric NOT NULL,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','negado')),
  resposta_admin text,
  decidido_por uuid,
  decidido_em timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ajuste_solic_status ON public.order_ajuste_solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_ajuste_solic_vendedor ON public.order_ajuste_solicitacoes(vendedor);
CREATE INDEX IF NOT EXISTS idx_ajuste_solic_order ON public.order_ajuste_solicitacoes(order_id);

ALTER TABLE public.order_ajuste_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedor cria propria solicitacao"
  ON public.order_ajuste_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    vendedor = current_user_nome_completo()
    AND created_by = auth.uid()
    AND status = 'pendente'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.status = 'Entregue'
        AND o.vendedor = current_user_nome_completo()
    )
  );

CREATE POLICY "vendedor le proprias solicitacoes"
  ON public.order_ajuste_solicitacoes FOR SELECT TO authenticated
  USING (vendedor = current_user_nome_completo() OR has_role(auth.uid(),'admin_master'::app_role));

CREATE POLICY "admin master atualiza solicitacao"
  ON public.order_ajuste_solicitacoes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin_master'::app_role));

CREATE POLICY "admin master apaga solicitacao"
  ON public.order_ajuste_solicitacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin_master'::app_role));

-- 2) RPC para vendedor criar (preenche numero/valor_atual a partir do pedido)
CREATE OR REPLACE FUNCTION public.criar_ajuste_solicitacao(_order_id uuid, _valor_solicitado numeric, _motivo text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ped record;
  meu_nome text;
  novo_id uuid;
BEGIN
  meu_nome := current_user_nome_completo();
  IF meu_nome IS NULL THEN RAISE EXCEPTION 'Usuário não identificado'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;
  IF _valor_solicitado IS NULL OR _valor_solicitado < 0 THEN
    RAISE EXCEPTION 'Valor solicitado inválido';
  END IF;

  SELECT id, numero, vendedor, status, preco INTO ped
    FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF ped.vendedor <> meu_nome AND NOT has_role(auth.uid(),'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Pedido não pertence ao vendedor';
  END IF;
  IF ped.status <> 'Entregue' THEN
    RAISE EXCEPTION 'Solicitação só pode ser feita em pedidos no status Entregue';
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_ajuste_solicitacoes
              WHERE order_id = _order_id AND status = 'pendente') THEN
    RAISE EXCEPTION 'Já existe uma solicitação pendente para este pedido';
  END IF;

  INSERT INTO public.order_ajuste_solicitacoes
    (order_id, vendedor, numero, valor_atual, valor_solicitado, motivo, created_by)
  VALUES
    (ped.id, ped.vendedor, ped.numero, COALESCE(ped.preco,0), _valor_solicitado, _motivo, auth.uid())
  RETURNING id INTO novo_id;

  RETURN novo_id;
END;
$$;

-- 3) RPC admin: decidir (aprovar aplica o novo preço; negar registra resposta)
CREATE OR REPLACE FUNCTION public.decidir_ajuste_solicitacao(_id uuid, _aprovar boolean, _resposta text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sol record;
  hist jsonb;
  alter_entry jsonb;
BEGIN
  IF NOT has_role(auth.uid(),'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master';
  END IF;

  SELECT * INTO sol FROM public.order_ajuste_solicitacoes WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF sol.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  IF _aprovar THEN
    hist := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
      'local', 'Entregue',
      'descricao', format('Ajuste de valor aprovado: R$ %s → R$ %s (motivo: %s)',
                           to_char(sol.valor_atual,'FM999G990D00'),
                           to_char(sol.valor_solicitado,'FM999G990D00'),
                           sol.motivo),
      'usuario', COALESCE(current_user_nome_completo(),'Admin')
    );
    alter_entry := jsonb_build_object(
      'data', to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI'),
      'tipo', 'ajuste_valor_solicitado',
      'valor_antes', sol.valor_atual,
      'valor_depois', sol.valor_solicitado,
      'motivo', sol.motivo,
      'solicitacao_id', sol.id::text,
      'usuario', COALESCE(current_user_nome_completo(),'Admin')
    );

    UPDATE public.orders
       SET preco = sol.valor_solicitado,
           historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(hist),
           alteracoes = COALESCE(alteracoes,'[]'::jsonb) || jsonb_build_array(alter_entry)
     WHERE id = sol.order_id;
  END IF;

  UPDATE public.order_ajuste_solicitacoes
     SET status = CASE WHEN _aprovar THEN 'aprovado' ELSE 'negado' END,
         resposta_admin = _resposta,
         decidido_por = auth.uid(),
         decidido_em = now()
   WHERE id = _id;

  -- Notifica vendedor no sino (reusa comprovante_notificacoes? não — usa order_notificacoes)
  INSERT INTO public.comprovante_notificacoes
    (comprovante_id, vendedor, tipo, descricao, valor, motivo)
  VALUES
    (sol.id, sol.vendedor,
     CASE WHEN _aprovar THEN 'ajuste_aprovado' ELSE 'ajuste_negado' END,
     CASE WHEN _aprovar
          THEN 'Seu pedido ' || sol.numero || ' teve o ajuste de valor APROVADO para R$ ' || to_char(sol.valor_solicitado,'FM999G990D00') || '.'
          ELSE 'Seu pedido ' || sol.numero || ' teve o ajuste de valor NEGADO.' || COALESCE(' Motivo: '||_resposta,'')
     END,
     sol.valor_solicitado,
     COALESCE(_resposta, sol.motivo));

  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _aprovar THEN 'aprovado' ELSE 'negado' END);
END;
$$;

-- 4) Trigger guard: bloqueia UPDATE→Pago/Cobrado fora dos fluxos legítimos
CREATE OR REPLACE FUNCTION public.trg_orders_block_manual_pago_cobrado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('Pago','Cobrado') AND OLD.status <> NEW.status THEN
    IF NEW.status = 'Pago' AND COALESCE(current_setting('app.allow_status_pago', true),'') <> '1' THEN
      RAISE EXCEPTION 'Mudança manual para "Pago" não é permitida. Use o fluxo de comprovante/baixa automática.';
    END IF;
    IF NEW.status = 'Cobrado' AND COALESCE(current_setting('app.allow_status_cobrado', true),'') <> '1' THEN
      RAISE EXCEPTION 'Mudança manual para "Cobrado" não é permitida. Gere o PDF de cobrança em "Conferido" e use a confirmação de marcação em lote.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_block_manual_pago_cobrado ON public.orders;
CREATE TRIGGER trg_orders_block_manual_pago_cobrado
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_orders_block_manual_pago_cobrado();

-- 5) Ajusta tentar_baixa_automatica para setar a flag de Pago
CREATE OR REPLACE FUNCTION public.tentar_baixa_automatica(_vendedor text, _admin_id uuid DEFAULT NULL::uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  saldo numeric;
  ped record;
  valor_p numeric;
  novo_mov_id uuid;
  baixadas integer := 0;
  hist_entry jsonb;
  flag_ativa boolean;
BEGIN
  SELECT value INTO flag_ativa FROM public.system_flags WHERE key = 'baixa_automatica_ativa';
  IF NOT COALESCE(flag_ativa, true) THEN RETURN 0; END IF;

  saldo := COALESCE(saldo_atual_revendedor(_vendedor), 0);

  FOR ped IN
    SELECT o.id, o.preco, o.quantidade, o.data_criacao, o.created_at
    FROM public.orders o
    WHERE o.vendedor = _vendedor AND o.status = 'Cobrado'
      AND NOT EXISTS (SELECT 1 FROM public.revendedor_baixas_pedido b WHERE b.order_id = o.id)
    ORDER BY o.data_criacao ASC, o.created_at ASC
  LOOP
    valor_p := COALESCE(ped.preco, 0);
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

      PERFORM set_config('app.allow_status_pago','1', true);
      UPDATE public.orders
         SET status = 'Pago',
             historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
       WHERE id = ped.id AND status = 'Cobrado';
      PERFORM set_config('app.allow_status_pago','0', true);

      saldo := saldo - valor_p;
      baixadas := baixadas + 1;
    ELSE EXIT;
    END IF;
  END LOOP;

  RETURN baixadas;
END;
$function$;

-- 6) Ajusta trigger de estorno para permitir voltar a Cobrado
CREATE OR REPLACE FUNCTION public.trg_orders_estorno_baixa_on_value_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  baixa record;
  saldo_ant numeric;
  novo_valor numeric;
  valor_baixado numeric;
  vendedor_mudou boolean;
  valor_mudou boolean;
BEGIN
  IF NEW.preco_congelado = true THEN RETURN NEW; END IF;

  SELECT * INTO baixa FROM public.revendedor_baixas_pedido WHERE order_id = NEW.id LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;

  novo_valor := COALESCE(NEW.preco, 0);
  valor_baixado := baixa.valor_pedido;
  vendedor_mudou := (NEW.vendedor IS DISTINCT FROM baixa.vendedor);
  valor_mudou := (novo_valor <> valor_baixado);

  IF NOT vendedor_mudou AND NOT valor_mudou THEN RETURN NEW; END IF;

  saldo_ant := COALESCE(public.saldo_atual_revendedor(baixa.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, order_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (baixa.vendedor, 'estorno', valor_baixado,
     'Estorno automático: valor/vendedor do pedido alterado',
     NEW.id, saldo_ant, saldo_ant + valor_baixado, auth.uid());

  DELETE FROM public.revendedor_baixas_pedido WHERE id = baixa.id;

  -- libera o guard só para esta linha
  PERFORM set_config('app.allow_status_cobrado','1', true);
  NEW.status := 'Cobrado';
  NEW.historico := COALESCE(NEW.historico, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', 'Cobrado',
      'descricao', 'Estorno automático: valor/vendedor alterado (R$ ' || to_char(valor_baixado, 'FM999G990D00') || ' devolvido ao saldo)',
      'usuario', COALESCE(public.current_user_nome_completo(), 'Sistema')
    )
  );
  RETURN NEW;
END;
$function$;

-- 7) RPC para marcar pedidos como Cobrado em massa (chamado pelo fluxo pós-PDF)
CREATE OR REPLACE FUNCTION public.marcar_pedidos_como_cobrado(_order_ids uuid[], _origem text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ped record;
  hist jsonb;
  marcados integer := 0;
  pulados integer := 0;
  desc_txt text;
BEGIN
  IF NOT has_role(auth.uid(),'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master';
  END IF;
  IF _order_ids IS NULL OR array_length(_order_ids,1) IS NULL THEN
    RAISE EXCEPTION 'Lista vazia';
  END IF;

  desc_txt := 'Pedido movido para Cobrado via PDF de cobrança' ||
              CASE WHEN _origem IS NOT NULL THEN ' (' || _origem || ')' ELSE '' END;

  FOR ped IN
    SELECT id, status, vendedor, numero FROM public.orders
     WHERE id = ANY(_order_ids)
  LOOP
    IF ped.status NOT IN ('Conferido','Entregue') THEN
      pulados := pulados + 1; CONTINUE;
    END IF;

    hist := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
      'local','Cobrado',
      'descricao', desc_txt,
      'usuario', COALESCE(current_user_nome_completo(),'Admin')
    );

    PERFORM set_config('app.allow_status_cobrado','1', true);
    UPDATE public.orders
       SET status = 'Cobrado',
           historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(hist)
     WHERE id = ped.id;
    PERFORM set_config('app.allow_status_cobrado','0', true);

    marcados := marcados + 1;
  END LOOP;

  RETURN jsonb_build_object('marcados', marcados, 'pulados', pulados);
END;
$$;