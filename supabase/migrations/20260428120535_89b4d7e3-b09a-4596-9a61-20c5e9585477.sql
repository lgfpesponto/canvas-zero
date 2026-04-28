-- Tabela de avisos do sistema (deploy de nova versão etc.)
CREATE TABLE public.system_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'deploy',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  mensagem TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "Autenticados leem avisos"
  ON public.system_announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admin_master pode criar
CREATE POLICY "admin_master cria avisos"
  ON public.system_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Apenas admin_master pode atualizar
CREATE POLICY "admin_master atualiza avisos"
  ON public.system_announcements
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Apenas admin_master pode apagar
CREATE POLICY "admin_master apaga avisos"
  ON public.system_announcements
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.touch_system_announcements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_system_announcements
  BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_system_announcements();

-- Habilita Realtime
ALTER TABLE public.system_announcements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_announcements;