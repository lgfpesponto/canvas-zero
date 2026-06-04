
-- 1) Extensão pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2) Log de chamadas pro atacado
CREATE TABLE IF NOT EXISTS public.atacado_progress_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  numero text NOT NULL,
  etapa text NOT NULL,
  http_status int,
  response_body text,
  erro text,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atacado_progress_log_order_id ON public.atacado_progress_log(order_id);
CREATE INDEX IF NOT EXISTS idx_atacado_progress_log_enviado_em ON public.atacado_progress_log(enviado_em DESC);

GRANT SELECT ON public.atacado_progress_log TO authenticated;
GRANT ALL ON public.atacado_progress_log TO service_role;

ALTER TABLE public.atacado_progress_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select atacado_progress_log"
  ON public.atacado_progress_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role));

-- 3) Tabela de config interna (apenas service_role acessa via bypass; trigger SECURITY DEFINER lê)
CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.internal_config TO service_role;

ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
-- sem policies => anon/authenticated não acessam

-- Placeholder do secret. O valor real será colado depois via SQL Editor / insert tool.
INSERT INTO public.internal_config(key, value)
VALUES ('internal_dispatch_secret', 'PLACEHOLDER_TROCAR')
ON CONFLICT (key) DO NOTHING;

-- 4) Função trigger: dispara webhook outbound
CREATE OR REPLACE FUNCTION public.notify_atacado_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order            public.orders%ROWTYPE;
  v_etapa            text;
  v_origem           text;
  v_enviadas         jsonb;
  v_already_sent     boolean;
  v_secret           text;
  v_url              text := 'https://uxpcqqxlypshickabeyq.supabase.co/functions/v1/atacado-progress-dispatch';
  v_body             jsonb;
BEGIN
  -- Mapeamento status do portal -> etapa do atacado
  v_etapa := CASE NEW.status
    WHEN 'Corte'                    THEN 'corte'
    WHEN 'Baixa Corte'              THEN 'corte'
    WHEN 'Montagem'                 THEN 'montagem'
    WHEN 'Montagem Ailton'          THEN 'montagem'
    WHEN 'Revisão'                  THEN 'acabamento'
    WHEN 'Expedição'                THEN 'expedicao'
    WHEN 'Baixa Site (Despachado)'  THEN 'baixa_site'
    ELSE NULL
  END;

  IF v_etapa IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lê pedido
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Só pedidos vindos do atacado
  v_origem := v_order.extra_detalhes->>'origem';
  IF v_origem IS DISTINCT FROM 'atacado_site' THEN
    RETURN NEW;
  END IF;

  -- Dedup: já enviada com sucesso?
  v_enviadas := COALESCE(v_order.extra_detalhes->'atacado_etapas_enviadas', '[]'::jsonb);
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_enviadas) AS e
    WHERE e->>'etapa' = v_etapa
      AND (e->>'http_status')::int BETWEEN 200 AND 299
  ) INTO v_already_sent;

  IF v_already_sent THEN
    RETURN NEW;
  END IF;

  -- Lê secret interno
  SELECT value INTO v_secret FROM public.internal_config WHERE key = 'internal_dispatch_secret';
  IF v_secret IS NULL OR v_secret = 'PLACEHOLDER_TROCAR' THEN
    INSERT INTO public.atacado_progress_log(order_id, numero, etapa, erro)
    VALUES (v_order.id, v_order.numero, v_etapa, 'INTERNAL_DISPATCH_SECRET não configurado');
    RETURN NEW;
  END IF;

  v_body := jsonb_build_object(
    'order_id', v_order.id,
    'etapa', v_etapa
  );

  -- Dispara assíncrono via pg_net
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body    := v_body,
    timeout_milliseconds := 8000
  );

  RETURN NEW;
END;
$$;

-- 5) Trigger em order_status_changes
DROP TRIGGER IF EXISTS trg_notify_atacado_progress ON public.order_status_changes;
CREATE TRIGGER trg_notify_atacado_progress
  AFTER INSERT ON public.order_status_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_atacado_progress();
