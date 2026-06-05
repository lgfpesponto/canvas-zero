-- Tabela de log de sincronização Portal -> Atacado
CREATE TABLE public.atacado_variacao_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_kind text NOT NULL CHECK (source_kind IN ('ficha_variacao', 'custom_option')),
  source_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('upsert', 'delete')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ok', 'erro')),
  http_status integer,
  erro text,
  tentativas integer NOT NULL DEFAULT 0,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX atacado_variacao_sync_log_status_idx
  ON public.atacado_variacao_sync_log(status, created_at DESC);
CREATE INDEX atacado_variacao_sync_log_source_idx
  ON public.atacado_variacao_sync_log(source_kind, source_id);

GRANT SELECT ON public.atacado_variacao_sync_log TO authenticated;
GRANT ALL ON public.atacado_variacao_sync_log TO service_role;

ALTER TABLE public.atacado_variacao_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select atacado_variacao_sync_log"
  ON public.atacado_variacao_sync_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Flag global para ligar/desligar a sincronização
INSERT INTO public.system_flags (key, value, updated_at)
VALUES ('atacado_variacao_sync_enabled', true, now())
ON CONFLICT (key) DO NOTHING;