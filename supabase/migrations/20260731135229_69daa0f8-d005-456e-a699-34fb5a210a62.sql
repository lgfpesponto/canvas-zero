SELECT cron.unschedule('bagy-status-push-every-minute');

SELECT cron.schedule(
  'bagy-queue-drain-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uxpcqqxlypshickabeyq.supabase.co/functions/v1/bagy-queue-drain',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public.internal_config WHERE key = 'cron_secret_reconcile' LIMIT 1)
    ),
    body := jsonb_build_object('limit', 50)
  );
  $$
);