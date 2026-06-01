
-- 1) Normalized status changes table
CREATE TABLE public.order_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  changed_on date NOT NULL,
  changed_hora text,
  usuario text,
  CONSTRAINT uniq_status_change UNIQUE (order_id, status, changed_on, changed_hora)
);

GRANT SELECT ON public.order_status_changes TO authenticated;
GRANT ALL ON public.order_status_changes TO service_role;

ALTER TABLE public.order_status_changes ENABLE ROW LEVEL SECURITY;

-- Admins see everything
CREATE POLICY "Admins view all status changes"
  ON public.order_status_changes FOR SELECT TO authenticated
  USING (public.is_any_admin(auth.uid()));

-- Vendor sees changes of orders they can see
CREATE POLICY "Owners view own order status changes"
  ON public.order_status_changes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_changes.order_id
      AND o.user_id = auth.uid()
  ));

-- Bordado role view (matches orders policy)
CREATE POLICY "Bordado role views bordado changes"
  ON public.order_status_changes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'bordado'::app_role)
    AND status = ANY (ARRAY['Baixa Corte','Entrada Bordado 7Estrivos','Baixa Bordado 7Estrivos'])
  );

CREATE INDEX idx_osc_status_date ON public.order_status_changes (status, changed_on);
CREATE INDEX idx_osc_order ON public.order_status_changes (order_id);

-- 2) Helper: parse the 'data' field from a historico entry
CREATE OR REPLACE FUNCTION public.parse_historico_date(_data text)
RETURNS date
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN _data IS NULL THEN NULL
    WHEN _data ~ '^\d{4}-\d{2}-\d{2}' THEN substring(_data from 1 for 10)::date
    WHEN _data ~ '^\d{2}/\d{2}/\d{4}' THEN to_date(substring(_data from 1 for 10), 'DD/MM/YYYY')
    ELSE NULL
  END;
$$;

-- 3) Trigger to sync historico → order_status_changes
CREATE OR REPLACE FUNCTION public.sync_order_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.historico IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.order_status_changes (order_id, status, changed_on, changed_hora, usuario)
  SELECT
    NEW.id,
    h->>'local',
    public.parse_historico_date(h->>'data'),
    COALESCE(h->>'hora',''),
    h->>'usuario'
  FROM jsonb_array_elements(NEW.historico) h
  WHERE h->>'local' IS NOT NULL
    AND public.parse_historico_date(h->>'data') IS NOT NULL
  ON CONFLICT (order_id, status, changed_on, changed_hora) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_status_changes
AFTER INSERT OR UPDATE OF historico ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_status_changes();

-- 4) Backfill existing data
INSERT INTO public.order_status_changes (order_id, status, changed_on, changed_hora, usuario)
SELECT
  o.id,
  h->>'local',
  public.parse_historico_date(h->>'data'),
  COALESCE(h->>'hora',''),
  h->>'usuario'
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.historico, '[]'::jsonb)) h
WHERE h->>'local' IS NOT NULL
  AND public.parse_historico_date(h->>'data') IS NOT NULL
ON CONFLICT (order_id, status, changed_on, changed_hora) DO NOTHING;

-- 5) Rewrite find_orders_by_status_change to use the new table
CREATE OR REPLACE FUNCTION public.find_orders_by_status_change(_status text[], _de date, _ate date)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT order_id
  FROM public.order_status_changes
  WHERE status = ANY(_status)
    AND changed_on BETWEEN _de AND _ate;
$$;
