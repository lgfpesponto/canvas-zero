-- Tabela de conversas do assistente
CREATE TABLE public.admin_chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master vê próprias conversas"
ON public.admin_chat_conversations
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role) AND user_id = auth.uid());

CREATE POLICY "admin_master cria próprias conversas"
ON public.admin_chat_conversations
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role) AND user_id = auth.uid());

CREATE POLICY "admin_master atualiza próprias conversas"
ON public.admin_chat_conversations
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role) AND user_id = auth.uid());

CREATE POLICY "admin_master apaga próprias conversas"
ON public.admin_chat_conversations
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role) AND user_id = auth.uid());

CREATE INDEX idx_admin_chat_conversations_user ON public.admin_chat_conversations(user_id, updated_at DESC);

-- Tabela de mensagens
CREATE TABLE public.admin_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.admin_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master vê mensagens de próprias conversas"
ON public.admin_chat_messages
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin_master'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.admin_chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "admin_master cria mensagens em próprias conversas"
ON public.admin_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin_master'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.admin_chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "admin_master apaga mensagens de próprias conversas"
ON public.admin_chat_messages
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin_master'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.admin_chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

CREATE INDEX idx_admin_chat_messages_conv ON public.admin_chat_messages(conversation_id, created_at);

-- Trigger para atualizar updated_at da conversa quando mensagem é criada
CREATE OR REPLACE FUNCTION public.touch_admin_chat_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_admin_chat_conversation
AFTER INSERT ON public.admin_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_admin_chat_conversation();