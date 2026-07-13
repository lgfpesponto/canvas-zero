
-- 1. Tabela de versões
CREATE TABLE public.ficha_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_tipo_id UUID NOT NULL REFERENCES public.ficha_tipos(id) ON DELETE CASCADE,
  versao INT NOT NULL,
  snapshot JSONB NOT NULL,
  descricao_mudanca TEXT,
  criado_por UUID REFERENCES auth.users(id),
  ativa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ficha_tipo_id, versao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ficha_versoes TO authenticated;
GRANT ALL ON public.ficha_versoes TO service_role;

ALTER TABLE public.ficha_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ficha_versoes read authenticated"
  ON public.ficha_versoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "ficha_versoes admin write"
  ON public.ficha_versoes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR public.has_role(auth.uid(), 'admin_producao'::app_role)
  );

CREATE POLICY "ficha_versoes admin update"
  ON public.ficha_versoes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR public.has_role(auth.uid(), 'admin_producao'::app_role)
  );

CREATE POLICY "ficha_versoes admin delete"
  ON public.ficha_versoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role));

CREATE UNIQUE INDEX ficha_versoes_ativa_uniq
  ON public.ficha_versoes(ficha_tipo_id) WHERE ativa;

CREATE INDEX ficha_versoes_tipo_created_idx
  ON public.ficha_versoes(ficha_tipo_id, created_at DESC);

-- 2. Referência no pedido
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ficha_versao_id UUID
  REFERENCES public.ficha_versoes(id);

CREATE INDEX IF NOT EXISTS orders_ficha_versao_idx
  ON public.orders(ficha_versao_id);

-- 3. Seed inicial: versão 1 (ativa) para cada tipo
INSERT INTO public.ficha_versoes (ficha_tipo_id, versao, snapshot, descricao_mudanca, ativa)
SELECT
  t.id,
  1,
  jsonb_build_object(
    'categorias', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'nome', c.nome, 'ordem', c.ordem, 'ativo', c.ativo
      ) ORDER BY c.ordem)
      FROM public.ficha_categorias c
      WHERE c.ficha_tipo_id = t.id
    ), '[]'::jsonb),
    'campos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', f.id, 'categoria_id', f.categoria_id, 'nome', f.nome, 'slug', f.slug,
        'tipo', f.tipo, 'obrigatorio', f.obrigatorio, 'ordem', f.ordem,
        'opcoes', f.opcoes, 'vinculo', f.vinculo,
        'desc_condicional', f.desc_condicional, 'ativo', f.ativo
      ) ORDER BY f.ordem)
      FROM public.ficha_campos f
      WHERE f.ficha_tipo_id = t.id
    ), '[]'::jsonb),
    'variacoes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id, 'categoria_id', v.categoria_id, 'campo_id', v.campo_id,
        'nome', v.nome, 'preco_adicional', v.preco_adicional,
        'ativo', v.ativo, 'ordem', v.ordem, 'relacionamento', v.relacionamento
      ) ORDER BY v.ordem)
      FROM public.ficha_variacoes v
      JOIN public.ficha_categorias c ON c.id = v.categoria_id
      WHERE c.ficha_tipo_id = t.id
    ), '[]'::jsonb)
  ),
  'versão inicial (seed automático)',
  true
FROM public.ficha_tipos t
ON CONFLICT (ficha_tipo_id, versao) DO NOTHING;
