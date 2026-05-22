
-- 1) Tabelas
CREATE TABLE IF NOT EXISTS public.preco_mudancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  tipo text NOT NULL CHECK (tipo IN ('ficha_variacao','custom_option')),
  target_id uuid NOT NULL,
  target_label text NOT NULL DEFAULT '',
  categoria_slug text,
  campo_slug text,
  preco_antes numeric NOT NULL DEFAULT 0,
  preco_depois numeric NOT NULL DEFAULT 0,
  delta numeric NOT NULL DEFAULT 0,
  escopo text NOT NULL CHECK (escopo IN ('desde_inicio','data_especifica','futuro')),
  data_corte timestamptz NOT NULL DEFAULT now(),
  aplicar_em timestamptz,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aplicada','revertida','erro')),
  pedidos_ajustados integer NOT NULL DEFAULT 0,
  valor_total_compensado numeric NOT NULL DEFAULT 0,
  observacao text,
  applied_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_preco_mudancas_target ON public.preco_mudancas(tipo, target_id);
CREATE INDEX IF NOT EXISTS idx_preco_mudancas_status ON public.preco_mudancas(status, aplicar_em);
CREATE INDEX IF NOT EXISTS idx_preco_mudancas_created ON public.preco_mudancas(created_at DESC);

ALTER TABLE public.preco_mudancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select preco_mudancas" ON public.preco_mudancas
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "admin_master insert preco_mudancas" ON public.preco_mudancas
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "admin_master update preco_mudancas" ON public.preco_mudancas
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "admin_master delete preco_mudancas" ON public.preco_mudancas
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE TABLE IF NOT EXISTS public.preco_mudanca_aplicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mudanca_id uuid NOT NULL REFERENCES public.preco_mudancas(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  qtd_aplicada integer NOT NULL DEFAULT 0,
  valor_unit_delta numeric NOT NULL DEFAULT 0,
  valor_total_delta numeric NOT NULL DEFAULT 0,
  preco_antes_pedido numeric,
  preco_depois_pedido numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pma_mudanca ON public.preco_mudanca_aplicacoes(mudanca_id);
CREATE INDEX IF NOT EXISTS idx_pma_order ON public.preco_mudanca_aplicacoes(order_id);

ALTER TABLE public.preco_mudanca_aplicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select preco_mudanca_aplicacoes" ON public.preco_mudanca_aplicacoes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "admin_master insert preco_mudanca_aplicacoes" ON public.preco_mudanca_aplicacoes
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "admin_master delete preco_mudanca_aplicacoes" ON public.preco_mudanca_aplicacoes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role));

-- 2) RPC principal: registra a mudança E aplica congelamento/atualização
CREATE OR REPLACE FUNCTION public.aplicar_mudanca_preco(
  _tipo text,
  _target_id uuid,
  _preco_depois numeric,
  _escopo text,
  _data_corte timestamptz DEFAULT NULL,
  _aplicar_em timestamptz DEFAULT NULL,
  _observacao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target_label text := '';
  v_categoria_slug text := NULL;
  v_campo_slug text := NULL;
  v_preco_antes numeric := 0;
  v_delta numeric;
  v_mudanca_id uuid;
  v_ped record;
  v_qtd integer;
  v_valor_delta numeric;
  v_total_ajustados integer := 0;
  v_total_compensado numeric := 0;
  v_data_corte timestamptz;
  v_hist jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode alterar preços com ajuste retroativo';
  END IF;
  IF _tipo NOT IN ('ficha_variacao','custom_option') THEN
    RAISE EXCEPTION 'Tipo inválido: %', _tipo;
  END IF;
  IF _escopo NOT IN ('desde_inicio','data_especifica','futuro') THEN
    RAISE EXCEPTION 'Escopo inválido: %', _escopo;
  END IF;

  -- Carrega preço antes + labels
  IF _tipo = 'ficha_variacao' THEN
    SELECT v.nome, COALESCE(v.preco_adicional,0), fcat.slug, fc.slug
      INTO v_target_label, v_preco_antes, v_categoria_slug, v_campo_slug
      FROM public.ficha_variacoes v
      LEFT JOIN public.ficha_campos fc ON fc.id = v.campo_id
      LEFT JOIN public.ficha_categorias fcat ON fcat.id = v.categoria_id
      WHERE v.id = _target_id;
  ELSE
    SELECT co.label, COALESCE(co.preco,0), co.categoria
      INTO v_target_label, v_preco_antes, v_categoria_slug
      FROM public.custom_options co
      WHERE co.id = _target_id;
  END IF;

  IF v_target_label IS NULL THEN
    RAISE EXCEPTION 'Variação/opção não encontrada';
  END IF;

  v_delta := COALESCE(_preco_depois,0) - v_preco_antes;

  -- Data de corte (pedidos criados ANTES de v_data_corte são congelados)
  v_data_corte := CASE
    WHEN _escopo = 'desde_inicio'   THEN now() + interval '100 years' -- sentinela = todos
    WHEN _escopo = 'data_especifica' THEN COALESCE(_data_corte, now())
    WHEN _escopo = 'futuro'          THEN COALESCE(_aplicar_em, now() + interval '1 day')
    ELSE now()
  END;

  -- Cria o registro da regra
  INSERT INTO public.preco_mudancas
    (created_by, tipo, target_id, target_label, categoria_slug, campo_slug,
     preco_antes, preco_depois, delta, escopo, data_corte, aplicar_em,
     status, observacao)
  VALUES
    (auth.uid(), _tipo, _target_id, v_target_label, v_categoria_slug, v_campo_slug,
     v_preco_antes, _preco_depois, v_delta, _escopo, v_data_corte, _aplicar_em,
     CASE WHEN _escopo = 'futuro' THEN 'pendente' ELSE 'aplicada' END,
     _observacao)
  RETURNING id INTO v_mudanca_id;

  -- Se for futuro, não toca em pedido nem no preço agora
  IF _escopo = 'futuro' THEN
    RETURN jsonb_build_object(
      'mudanca_id', v_mudanca_id,
      'pedidos_ajustados', 0,
      'agendado_para', _aplicar_em,
      'status', 'pendente'
    );
  END IF;

  -- Congela pedidos elegíveis: criados ANTES da data_corte, status != Cancelado,
  -- não congelados ainda
  FOR v_ped IN
    SELECT o.id, o.preco, o.quantidade, o.status, o.numero
      FROM public.orders o
     WHERE o.created_at < v_data_corte
       AND o.status <> 'Cancelado'
       AND COALESCE(o.preco_congelado, false) = false
  LOOP
    -- Quantidade aplicada = quantidade do pedido (aproximação simples).
    -- A regra de "valor compensado" é apenas informativa aqui; o efeito real
    -- é o CONGELAMENTO do preço atual, que impede o recompute futuro.
    v_qtd := GREATEST(COALESCE(v_ped.quantidade,1), 1);
    v_valor_delta := -v_delta * v_qtd;
    v_total_compensado := v_total_compensado + v_valor_delta;
    v_total_ajustados := v_total_ajustados + 1;

    v_hist := jsonb_build_object(
      'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
      'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
      'local', v_ped.status,
      'descricao', format('Preço congelado por mudança retroativa: %s %s → %s (compensação R$ %s)',
                           v_target_label,
                           to_char(v_preco_antes,'FM999G990D00'),
                           to_char(_preco_depois,'FM999G990D00'),
                           to_char(v_valor_delta,'FM999G990D00')),
      'usuario', COALESCE(public.current_user_nome_completo(),'Sistema'),
      'mudanca_id', v_mudanca_id::text
    );

    UPDATE public.orders
       SET preco_congelado = true,
           extra_detalhes = COALESCE(extra_detalhes, '{}'::jsonb)
             || jsonb_build_object(
                  'ajustes_retroativos',
                  COALESCE(extra_detalhes->'ajustes_retroativos','[]'::jsonb)
                    || jsonb_build_array(jsonb_build_object(
                      'mudanca_id', v_mudanca_id,
                      'variacao', v_target_label,
                      'preco_antes', v_preco_antes,
                      'preco_depois', _preco_depois,
                      'qtd_aplicada', v_qtd,
                      'valor_total_delta', v_valor_delta,
                      'data', now()
                    ))
                ),
           historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(v_hist)
     WHERE id = v_ped.id;

    INSERT INTO public.preco_mudanca_aplicacoes
      (mudanca_id, order_id, qtd_aplicada, valor_unit_delta, valor_total_delta,
       preco_antes_pedido, preco_depois_pedido)
    VALUES
      (v_mudanca_id, v_ped.id, v_qtd, -v_delta, v_valor_delta,
       v_ped.preco, v_ped.preco);
  END LOOP;

  -- Atualiza a variação/opção AGORA (preço novo vale a partir daqui)
  IF _tipo = 'ficha_variacao' THEN
    UPDATE public.ficha_variacoes
       SET preco_adicional = _preco_depois
     WHERE id = _target_id;
  ELSE
    UPDATE public.custom_options
       SET preco = _preco_depois
     WHERE id = _target_id;
  END IF;

  UPDATE public.preco_mudancas
     SET pedidos_ajustados = v_total_ajustados,
         valor_total_compensado = v_total_compensado,
         applied_at = now()
   WHERE id = v_mudanca_id;

  RETURN jsonb_build_object(
    'mudanca_id', v_mudanca_id,
    'pedidos_ajustados', v_total_ajustados,
    'valor_total_compensado', v_total_compensado,
    'status', 'aplicada'
  );
END;
$$;

-- 3) Função que o cron chama para aplicar regras futuras vencidas
CREATE OR REPLACE FUNCTION public.aplicar_mudancas_futuras_pendentes()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_ped record;
  v_qtd integer;
  v_valor_delta numeric;
  v_total_ajustados integer;
  v_total_compensado numeric;
  v_hist jsonb;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.preco_mudancas
     WHERE escopo = 'futuro'
       AND status = 'pendente'
       AND aplicar_em IS NOT NULL
       AND aplicar_em <= now()
  LOOP
    v_total_ajustados := 0;
    v_total_compensado := 0;

    FOR v_ped IN
      SELECT o.id, o.preco, o.quantidade, o.status
        FROM public.orders o
       WHERE o.created_at < r.aplicar_em
         AND o.status <> 'Cancelado'
         AND COALESCE(o.preco_congelado,false) = false
    LOOP
      v_qtd := GREATEST(COALESCE(v_ped.quantidade,1),1);
      v_valor_delta := -r.delta * v_qtd;
      v_total_compensado := v_total_compensado + v_valor_delta;
      v_total_ajustados := v_total_ajustados + 1;

      v_hist := jsonb_build_object(
        'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date,'YYYY-MM-DD'),
        'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI'),
        'local', v_ped.status,
        'descricao', format('Preço congelado por mudança retroativa agendada: %s %s → %s',
                              r.target_label,
                              to_char(r.preco_antes,'FM999G990D00'),
                              to_char(r.preco_depois,'FM999G990D00')),
        'usuario', 'Sistema (agendado)',
        'mudanca_id', r.id::text
      );

      UPDATE public.orders
         SET preco_congelado = true,
             extra_detalhes = COALESCE(extra_detalhes,'{}'::jsonb)
               || jsonb_build_object(
                    'ajustes_retroativos',
                    COALESCE(extra_detalhes->'ajustes_retroativos','[]'::jsonb)
                      || jsonb_build_array(jsonb_build_object(
                        'mudanca_id', r.id,
                        'variacao', r.target_label,
                        'preco_antes', r.preco_antes,
                        'preco_depois', r.preco_depois,
                        'qtd_aplicada', v_qtd,
                        'valor_total_delta', v_valor_delta,
                        'data', now()
                      ))
                  ),
             historico = COALESCE(historico,'[]'::jsonb) || jsonb_build_array(v_hist)
       WHERE id = v_ped.id;

      INSERT INTO public.preco_mudanca_aplicacoes
        (mudanca_id, order_id, qtd_aplicada, valor_unit_delta, valor_total_delta,
         preco_antes_pedido, preco_depois_pedido)
      VALUES
        (r.id, v_ped.id, v_qtd, -r.delta, v_valor_delta, v_ped.preco, v_ped.preco);
    END LOOP;

    IF r.tipo = 'ficha_variacao' THEN
      UPDATE public.ficha_variacoes SET preco_adicional = r.preco_depois WHERE id = r.target_id;
    ELSE
      UPDATE public.custom_options SET preco = r.preco_depois WHERE id = r.target_id;
    END IF;

    UPDATE public.preco_mudancas
       SET status = 'aplicada',
           pedidos_ajustados = v_total_ajustados,
           valor_total_compensado = v_total_compensado,
           applied_at = now()
     WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 4) Listagem amigável para UI
CREATE OR REPLACE VIEW public.vw_preco_mudancas AS
SELECT m.*,
       p.nome_completo AS criado_por_nome
  FROM public.preco_mudancas m
  LEFT JOIN public.profiles p ON p.id = m.created_by;
