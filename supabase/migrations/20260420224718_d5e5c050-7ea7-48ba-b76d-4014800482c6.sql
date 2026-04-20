-- Tabela A Receber
CREATE TABLE public.financeiro_a_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor text NOT NULL,
  data_pagamento date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  destinatario text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('empresa', 'fornecedor')),
  descricao text,
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.financeiro_a_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select a_receber"
  ON public.financeiro_a_receber FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master insert a_receber"
  ON public.financeiro_a_receber FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master update a_receber"
  ON public.financeiro_a_receber FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master delete a_receber"
  ON public.financeiro_a_receber FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE INDEX idx_financeiro_a_receber_data ON public.financeiro_a_receber(data_pagamento DESC);
CREATE INDEX idx_financeiro_a_receber_vendedor ON public.financeiro_a_receber(vendedor);

-- Tabela A Pagar
CREATE TABLE public.financeiro_a_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor text NOT NULL,
  numero_nota text NOT NULL,
  data_emissao date NOT NULL,
  data_vencimento date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'pago')),
  data_pagamento date,
  nota_url text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.financeiro_a_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master select a_pagar"
  ON public.financeiro_a_pagar FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master insert a_pagar"
  ON public.financeiro_a_pagar FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master update a_pagar"
  ON public.financeiro_a_pagar FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master delete a_pagar"
  ON public.financeiro_a_pagar FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

CREATE INDEX idx_financeiro_a_pagar_status ON public.financeiro_a_pagar(status);
CREATE INDEX idx_financeiro_a_pagar_vencimento ON public.financeiro_a_pagar(data_vencimento);

-- Bucket privado para PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('financeiro', 'financeiro', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: só admin_master
CREATE POLICY "admin_master select financeiro storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'financeiro' AND public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master insert financeiro storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'financeiro' AND public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master update financeiro storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'financeiro' AND public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "admin_master delete financeiro storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'financeiro' AND public.has_role(auth.uid(), 'admin_master'));