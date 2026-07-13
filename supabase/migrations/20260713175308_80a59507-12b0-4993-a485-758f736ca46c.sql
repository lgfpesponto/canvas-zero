
CREATE OR REPLACE FUNCTION public.enfileirar_bagy_stock_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sku text;
  v_qtd integer;
  v_skip text;
BEGIN
  BEGIN
    v_skip := current_setting('app.skip_bagy_push', true);
  EXCEPTION WHEN OTHERS THEN
    v_skip := NULL;
  END;
  IF v_skip = 'on' THEN
    RETURN NEW;
  END IF;

  v_sku := NEW.sku_base;
  v_qtd := COALESCE(NEW.quantidade, 0);
  IF v_sku IS NULL OR length(trim(v_sku)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.bagy_stock_sync_queue (estoque_produto_id, sku, novo_saldo)
  VALUES (NEW.id, v_sku, v_qtd)
  ON CONFLICT (estoque_produto_id) WHERE processado_em IS NULL
  DO UPDATE SET novo_saldo = EXCLUDED.novo_saldo, criado_em = now(), tentativas = 0, ultimo_erro = NULL;

  IF NEW.bagy_sync_status IS DISTINCT FROM 'pendente' THEN
    UPDATE public.estoque_produtos
       SET bagy_sync_status = 'pendente'
     WHERE id = NEW.id;
  END IF;

  -- Dispara worker imediatamente (fire-and-forget via pg_net async).
  -- O cron de 1 min continua como fallback/retry.
  BEGIN
    PERFORM net.http_post(
      url := 'https://uxpcqqxlypshickabeyq.supabase.co/functions/v1/bagy-stock-sync',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cGNxcXhseXBzaGlja2FiZXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjQxMDEsImV4cCI6MjA4OTcwMDEwMX0.jb-Ojq-PNzhW7wBotJQSOHClkflm7Cud5SL9tn3mkgk"}'::jsonb,
      body := jsonb_build_object('src','trigger','produto_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- não falha o UPDATE do estoque se o HTTP dispatch falhar; cron drena depois
    NULL;
  END;

  RETURN NEW;
END;
$function$;
