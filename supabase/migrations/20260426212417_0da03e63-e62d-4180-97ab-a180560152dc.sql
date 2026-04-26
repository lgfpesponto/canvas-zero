
-- 1) Adicionar colunas de pagador detectado pela IA
ALTER TABLE public.revendedor_comprovantes
  ADD COLUMN IF NOT EXISTS pagador_nome text,
  ADD COLUMN IF NOT EXISTS pagador_documento text,
  ADD COLUMN IF NOT EXISTS tipo_detectado text;

-- 2) Permitir RLS no insert do revendedor: aceitar status 'pendente' (já é o caso)
-- Permitir que admin master atualize comprovantes (já existe). OK.

-- 3) Reescrever aprovar_comprovante_revendedor para também espelhar em financeiro_a_receber
CREATE OR REPLACE FUNCTION public.aprovar_comprovante_revendedor(_comprovante_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  comp record;
  saldo_ant numeric;
  baixadas integer;
  v_tipo text;
  v_destinatario text;
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

  -- Decide tipo/destinatário pra espelhar no A Receber
  -- Empresa = CNPJ 02139487000113 (Leandro Garcia Feliciano / 7Estrivos)
  IF COALESCE(comp.tipo_detectado, '') = 'empresa'
     OR COALESCE(comp.pagador_documento, '') = '02139487000113' THEN
    v_tipo := 'empresa';
    v_destinatario := 'Empresa';
  ELSE
    v_tipo := 'fornecedor';
    v_destinatario := COALESCE(NULLIF(trim(comp.pagador_nome), ''), 'Pagador não identificado');
  END IF;

  -- Espelha em financeiro_a_receber (somente se ainda não foi espelhado para esse hash+vendedor+data+valor)
  IF NOT EXISTS (
    SELECT 1 FROM public.financeiro_a_receber
    WHERE comprovante_hash IS NOT NULL
      AND comprovante_hash = comp.comprovante_hash
      AND vendedor = comp.vendedor
  ) THEN
    INSERT INTO public.financeiro_a_receber
      (vendedor, data_pagamento, valor, destinatario, tipo, descricao,
       comprovante_url, comprovante_hash, created_by)
    VALUES
      (comp.vendedor, comp.data_pagamento, comp.valor, v_destinatario, v_tipo,
       'Comprovante enviado pelo revendedor' ||
         CASE WHEN comp.observacao IS NOT NULL AND length(trim(comp.observacao)) > 0
              THEN ' — ' || comp.observacao ELSE '' END,
       comp.comprovante_url, comp.comprovante_hash, auth.uid());
  END IF;

  -- Saldo
  saldo_ant := COALESCE(saldo_atual_revendedor(comp.vendedor), 0);

  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, comprovante_id, saldo_anterior, saldo_posterior, created_by)
  VALUES
    (comp.vendedor, 'entrada_comprovante', comp.valor,
     'Comprovante aprovado em ' || to_char(now(),'DD/MM/YYYY'),
     _comprovante_id, saldo_ant, saldo_ant + comp.valor, auth.uid());

  baixadas := tentar_baixa_automatica(comp.vendedor, auth.uid());

  RETURN jsonb_build_object('aprovado', true, 'baixas_realizadas', baixadas, 'tipo_a_receber', v_tipo);
END;
$function$;
