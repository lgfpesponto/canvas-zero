CREATE OR REPLACE FUNCTION public.trg_orders_block_manual_pago_cobrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('Pago','Cobrado') AND OLD.status <> NEW.status THEN
    IF NEW.status = 'Pago'
       AND COALESCE(current_setting('app.allow_status_pago', true),'') <> '1' THEN
      RAISE EXCEPTION 'Mudança manual para "Pago" não é permitida. Use o fluxo de comprovante/baixa automática.';
    END IF;
    IF NEW.status = 'Cobrado'
       AND OLD.status <> 'Conferido'
       AND COALESCE(current_setting('app.allow_status_cobrado', true),'') <> '1' THEN
      RAISE EXCEPTION 'Mudança manual para "Cobrado" só é permitida a partir de "Conferido". Para outros casos, gere o PDF de cobrança.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;