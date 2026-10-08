TRUNCATE cron.job_run_details;
TRUNCATE net._http_response;

SELECT cron.schedule(
  'purge-logs-internos',
  '17 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days';
    DELETE FROM net._http_response WHERE created < now() - interval '3 days';$$
);