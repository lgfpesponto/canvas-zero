-- Tabela de notificações de comprovantes (separada de order_notificacoes)
CREATE TABLE public.comprovante_notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comprovante_id UUID NOT NULL REFERENCES public.revendedor_comprovantes(id) ON DELETE CASCADE,
  vendedor TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('aprovado','reprovado')),
  descricao TEXT NOT NULL,
  motivo TEXT,
  valor NUMERIC,
  data_pagamento DATE,
  lida BOOLEAN NOT NULL DEFAULT false,
  lida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comprov_notif_vendedor ON public.comprovante_notificacoes(vendedor, created_at DESC);
CREATE INDEX idx_comprov_notif_lida ON public.comprovante_notificacoes(vendedor, lida);

ALTER TABLE public.comprovante_notificacoes ENABLE ROW LEVEL SECURITY;

-- Vendedor lê só as suas (match por nome_completo do profile)
CREATE POLICY "vendedor le suas notificacoes de comprovante"
  ON public.comprovante_notificacoes
  FOR SELECT
  USING (
    vendedor = (SELECT nome_completo FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin_master')
  );

-- Vendedor pode marcar suas como lidas (UPDATE só do campo lida)
CREATE POLICY "vendedor marca suas notificacoes como lidas"
  ON public.comprovante_notificacoes
  FOR UPDATE
  USING (
    vendedor = (SELECT nome_completo FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin_master')
  );

-- Insert é feito pelo trigger (security definer); negar inserção direta exceto admin_master
CREATE POLICY "admin master insere"
  ON public.comprovante_notificacoes
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- Trigger: ao mudar status de pendente -> aprovado/reprovado, gera notificação
CREATE OR REPLACE FUNCTION public.notify_comprovante_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desc_text TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'aprovado' THEN
    desc_text := 'Seu comprovante de R$ ' || to_char(COALESCE(NEW.valor,0), 'FM999G999G990D00') || ' foi aprovado.';
    INSERT INTO public.comprovante_notificacoes
      (comprovante_id, vendedor, tipo, descricao, valor, data_pagamento)
    VALUES (NEW.id, NEW.vendedor, 'aprovado', desc_text, NEW.valor, NEW.data_pagamento);
  ELSIF NEW.status = 'reprovado' THEN
    desc_text := 'Seu comprovante de R$ ' || to_char(COALESCE(NEW.valor,0), 'FM999G999G990D00') || ' foi reprovado.';
    INSERT INTO public.comprovante_notificacoes
      (comprovante_id, vendedor, tipo, descricao, motivo, valor, data_pagamento)
    VALUES (NEW.id, NEW.vendedor, 'reprovado', desc_text, NEW.motivo_reprovacao, NEW.valor, NEW.data_pagamento);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comprovante_notif
  AFTER UPDATE OF status ON public.revendedor_comprovantes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comprovante_status_change();

-- RPCs para marcar lida
CREATE OR REPLACE FUNCTION public.marcar_comprovante_notificacao_lida(_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vname TEXT;
BEGIN
  SELECT nome_completo INTO vname FROM public.profiles WHERE id = auth.uid();
  UPDATE public.comprovante_notificacoes
     SET lida = true, lida_em = now()
   WHERE id = _id
     AND (vendedor = vname OR public.has_role(auth.uid(), 'admin_master'));
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_todas_comprovante_notificacoes_lidas()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vname TEXT;
BEGIN
  SELECT nome_completo INTO vname FROM public.profiles WHERE id = auth.uid();
  UPDATE public.comprovante_notificacoes
     SET lida = true, lida_em = now()
   WHERE vendedor = vname AND lida = false;
END;
$$;

-- Realtime para a nova tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.comprovante_notificacoes;