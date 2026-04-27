-- Função: marcar um comprovante aprovado como "utilizado" (baixa manual)
-- Debita o saldo do revendedor e altera o status do comprovante para 'utilizado'.
CREATE OR REPLACE FUNCTION public.marcar_comprovante_utilizado(
  _comprovante_id uuid,
  _motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  comp record;
  saldo_ant numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode dar baixa manual em comprovantes';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo da baixa manual é obrigatório';
  END IF;

  SELECT * INTO comp FROM public.revendedor_comprovantes
   WHERE id = _comprovante_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comprovante não encontrado';
  END IF;
  IF comp.status <> 'aprovado' THEN
    RAISE EXCEPTION 'Só comprovantes aprovados podem receber baixa manual (status atual: %)', comp.status;
  END IF;
  IF COALESCE(comp.valor, 0) <= 0 THEN
    RAISE EXCEPTION 'Comprovante sem valor válido';
  END IF;

  saldo_ant := COALESCE(saldo_atual_revendedor(comp.vendedor), 0);
  IF saldo_ant - comp.valor < 0 THEN
    RAISE EXCEPTION 'Baixa manual deixaria o saldo negativo (atual: %, valor: %)',
      saldo_ant, comp.valor;
  END IF;

  -- Movimento de saída de saldo (sem order_id)
  INSERT INTO public.revendedor_saldo_movimentos
    (vendedor, tipo, valor, descricao, comprovante_id,
     saldo_anterior, saldo_posterior, created_by)
  VALUES
    (comp.vendedor, 'baixa_pedido', comp.valor,
     '[BAIXA MANUAL DE COMPROVANTE] ' || _motivo,
     _comprovante_id, saldo_ant, saldo_ant - comp.valor, auth.uid());

  -- Marca o comprovante como utilizado (auditoria via aprovado_por/aprovado_em)
  UPDATE public.revendedor_comprovantes
     SET status = 'utilizado',
         motivo_reprovacao = '[BAIXA MANUAL] ' || _motivo,
         aprovado_por = auth.uid(),
         aprovado_em = now()
   WHERE id = _comprovante_id;

  RETURN jsonb_build_object(
    'ok', true,
    'saldo_anterior', saldo_ant,
    'saldo_posterior', saldo_ant - comp.valor
  );
END;
$function$;