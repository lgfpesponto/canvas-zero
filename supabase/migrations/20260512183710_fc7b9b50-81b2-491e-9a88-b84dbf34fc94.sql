CREATE POLICY "vendedor insert revendedor-saldo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'financeiro'
  AND (storage.foldername(name))[1] = 'revendedor-saldo'
  AND owner = auth.uid()
);

CREATE POLICY "vendedor select proprios revendedor-saldo"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'financeiro'
  AND (storage.foldername(name))[1] = 'revendedor-saldo'
  AND owner = auth.uid()
);