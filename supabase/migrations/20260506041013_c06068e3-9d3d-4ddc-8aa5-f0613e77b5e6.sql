
CREATE TABLE public.pdf_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  gerado_em timestamptz NOT NULL DEFAULT now(),
  gerado_por uuid,
  gerado_por_nome text,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  totais jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_path text,
  arquivo_kb integer,
  nome_arquivo text
);

CREATE INDEX idx_pdf_snapshots_gerado_em ON public.pdf_snapshots (gerado_em DESC);
CREATE INDEX idx_pdf_snapshots_tipo ON public.pdf_snapshots (tipo);

ALTER TABLE public.pdf_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select pdf_snapshots"
  ON public.pdf_snapshots FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "admins insert pdf_snapshots"
  ON public.pdf_snapshots FOR INSERT TO authenticated
  WITH CHECK (is_any_admin(auth.uid()) AND gerado_por = auth.uid());

CREATE POLICY "admin_master delete pdf_snapshots"
  ON public.pdf_snapshots FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Storage policies para pasta pdf-historico/ no bucket financeiro
CREATE POLICY "admin_master select pdf-historico"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'financeiro'
    AND (storage.foldername(name))[1] = 'pdf-historico'
    AND has_role(auth.uid(), 'admin_master'::app_role)
  );

CREATE POLICY "admins insert pdf-historico"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'financeiro'
    AND (storage.foldername(name))[1] = 'pdf-historico'
    AND is_any_admin(auth.uid())
  );

CREATE POLICY "admin_master delete pdf-historico"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'financeiro'
    AND (storage.foldername(name))[1] = 'pdf-historico'
    AND has_role(auth.uid(), 'admin_master'::app_role)
  );
