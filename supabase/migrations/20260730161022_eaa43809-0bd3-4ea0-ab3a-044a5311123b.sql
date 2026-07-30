select cron.unschedule('bagy-stock-sync-every-minute');

select cron.schedule(
  'bagy-stock-sync-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uxpcqqxlypshickabeyq.supabase.co/functions/v1/bagy-stock-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public.internal_config WHERE key = 'cron_secret_reconcile' LIMIT 1)
    ),
    body := jsonb_build_object('src', 'cron')
  );
  $$
);