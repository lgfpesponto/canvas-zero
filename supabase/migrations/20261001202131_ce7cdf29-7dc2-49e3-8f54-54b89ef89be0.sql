ALTER TABLE public.bagy_pedidos
  ADD COLUMN IF NOT EXISTS envio_servico text,
  ADD COLUMN IF NOT EXISTS envio_provider text,
  ADD COLUMN IF NOT EXISTS envio_provider_id text,
  ADD COLUMN IF NOT EXISTS etiqueta_path text,
  ADD COLUMN IF NOT EXISTS etiqueta_gerada_em timestamptz;

CREATE POLICY "etiquetas envio leitura" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'etiquetas-envio' AND public.has_nfe_access(auth.uid()));