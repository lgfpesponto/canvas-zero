
-- 1) Add 'montagem' to app_role enum (separate from usage in same tx is fine; we avoid casts)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'montagem';

-- 2) Insert new status etapa "Baixa Montagem" (ordem 29 — display only)
INSERT INTO public.status_etapas (slug, nome, ordem)
SELECT 'baixa-montagem', 'Baixa Montagem', 29
WHERE NOT EXISTS (SELECT 1 FROM public.status_etapas WHERE slug = 'baixa-montagem');

-- 3) RPC: dar baixa de montagem via scanner
CREATE OR REPLACE FUNCTION public.montagem_baixar_pedido(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  ped record;
  usuario_nome text;
  hist_entry jsonb;
  is_montagem boolean;
  is_master boolean;
  v_modelo text;
  v_erro boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'montagem')
    INTO is_montagem;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin_master')
    INTO is_master;

  IF NOT (is_montagem OR is_master) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  SELECT id, numero, status, quantidade, modelo, extra_detalhes
    INTO ped
    FROM public.orders
   WHERE id = _order_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF ped.status NOT IN ('Montagem', 'Montagem Ailton') THEN
    RAISE EXCEPTION 'Pedido em "%" — só pode dar baixa de montagem a partir de Montagem ou Montagem Ailton', ped.status;
  END IF;

  usuario_nome := COALESCE(public.current_user_nome_completo(), 'Montagem');

  hist_entry := jsonb_build_object(
    'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
    'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    'local', 'Baixa Montagem',
    'descricao', 'Baixa de montagem via scanner (origem: ' || ped.status || ')',
    'usuario', usuario_nome
  );

  UPDATE public.orders
     SET status = 'Baixa Montagem',
         historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
   WHERE id = _order_id;

  v_modelo := COALESCE(ped.modelo, '');
  v_erro := COALESCE((ped.extra_detalhes->>'montagem_erro')::boolean, false);

  RETURN jsonb_build_object(
    'ok', true,
    'id', ped.id,
    'numero', ped.numero,
    'quantidade', COALESCE(ped.quantidade, 1),
    'modelo', v_modelo,
    'status_anterior', ped.status,
    'erro_montagem', v_erro
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.montagem_baixar_pedido(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.montagem_baixar_pedido(uuid) TO authenticated;

-- 4) RPC: marcar pedido como "ERRO MONTAGEM" ao retroceder de etapa pós-Baixa Montagem para Montagem/Montagem Ailton
-- Não exige justificativa; grava extra_detalhes.montagem_erro = true (flag persistente).
CREATE OR REPLACE FUNCTION public.montagem_marcar_erro(_order_id uuid, _destino text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  ped record;
  usuario_nome text;
  hist_entry jsonb;
  is_master boolean;
  is_producao boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin_master')
    INTO is_master;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin_producao')
    INTO is_producao;

  IF NOT (is_master OR is_producao) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  IF _destino NOT IN ('Montagem', 'Montagem Ailton') THEN
    RAISE EXCEPTION 'Destino inválido para ERRO MONTAGEM';
  END IF;

  SELECT id, numero, status, extra_detalhes
    INTO ped
    FROM public.orders
   WHERE id = _order_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  usuario_nome := COALESCE(public.current_user_nome_completo(), 'Admin');

  hist_entry := jsonb_build_object(
    'data', to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD'),
    'hora', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'),
    'local', _destino,
    'descricao', 'ERRO MONTAGEM — pedido devolvido de "' || ped.status || '" para "' || _destino || '" (não será cobrado novamente)',
    'usuario', usuario_nome,
    'justificativa', 'ERRO MONTAGEM'
  );

  UPDATE public.orders
     SET status = _destino,
         extra_detalhes = COALESCE(extra_detalhes, '{}'::jsonb)
                          || jsonb_build_object('montagem_erro', true),
         historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(hist_entry)
   WHERE id = _order_id;

  RETURN jsonb_build_object('ok', true, 'id', ped.id, 'novo_status', _destino);
END;
$fn$;

REVOKE ALL ON FUNCTION public.montagem_marcar_erro(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.montagem_marcar_erro(uuid, text) TO authenticated;

-- 5) RLS — permitir SELECT/UPDATE em orders pelo role 'montagem' apenas em status relacionados a montagem
CREATE POLICY "Montagem users can view montagem orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'montagem')
    AND status IN ('Montagem', 'Montagem Ailton', 'Baixa Montagem')
  );

CREATE POLICY "Montagem users can update montagem orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'montagem')
    AND status IN ('Montagem', 'Montagem Ailton', 'Baixa Montagem')
  );
