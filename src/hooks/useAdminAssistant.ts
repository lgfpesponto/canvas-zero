import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ChatMsg = { id?: string; role: 'user' | 'assistant'; content: string; created_at?: string };
export type ChatConversation = { id: string; titulo: string; updated_at: string };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-assistant`;

export function useAdminAssistant(enabled: boolean) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    if (!enabled) return;
    const { data, error } = await supabase
      .from('admin_chat_conversations')
      .select('id, titulo, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) { console.error('[Assistant] load convs:', error); return; }
    setConversations(data || []);
  }, [enabled]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_chat_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', convId)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        created_at: m.created_at,
      })));
    } catch (e) {
      console.error('[Assistant] load msgs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setActiveId(id);
    await loadMessages(id);
  }, [loadMessages]);

  const newConversation = useCallback(() => {
    setActiveId(null);
    setMessages([]);
  }, []);

  const ensureConversation = useCallback(async (firstUserMsg: string): Promise<string | null> => {
    if (activeId) return activeId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const titulo = firstUserMsg.slice(0, 60).trim() || 'Nova conversa';
    const { data, error } = await supabase
      .from('admin_chat_conversations')
      .insert({ user_id: user.id, titulo })
      .select('id, titulo, updated_at')
      .single();
    if (error || !data) {
      console.error('[Assistant] create conv:', error);
      return null;
    }
    setActiveId(data.id);
    setConversations(prev => [data, ...prev]);
    return data.id;
  }, [activeId]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);

    // 1. UI otimista: adiciona mensagem do usuário
    const userMsg: ChatMsg = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    try {
      // 2. Garante conversa
      const convId = await ensureConversation(trimmed);
      if (!convId) {
        toast.error('Erro ao criar conversa');
        setMessages(messages); // rollback
        return;
      }

      // 3. Persiste mensagem do user
      await supabase.from('admin_chat_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: trimmed,
      });

      // 4. Chama edge function (não-streaming para suportar tool calling robusto)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }

      abortRef.current = new AbortController();
      const resp = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `Erro ${resp.status}` }));
        toast.error(err.error || `Erro ${resp.status}`);
        // Adiciona mensagem de erro no chat pra ficar visível
        const errMsg: ChatMsg = { role: 'assistant', content: `⚠️ ${err.error || `Erro ${resp.status}`}` };
        setMessages(prev => [...prev, errMsg]);
        return;
      }

      const data = await resp.json();
      const assistantContent = data.content || '(resposta vazia)';
      const assistantMsg: ChatMsg = { role: 'assistant', content: assistantContent };
      setMessages(prev => [...prev, assistantMsg]);

      // 5. Persiste resposta
      await supabase.from('admin_chat_messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: assistantContent,
      });

      // Atualiza ordem das conversas
      loadConversations();
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('[Assistant] send error:', e);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [messages, sending, ensureConversation, loadConversations]);

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase.from('admin_chat_conversations').delete().eq('id', id);
    if (error) { toast.error('Erro ao apagar conversa'); return; }
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }, [activeId]);

  useEffect(() => { if (enabled) loadConversations(); }, [enabled, loadConversations]);

  return {
    conversations,
    activeId,
    messages,
    sending,
    loading,
    sendMessage,
    selectConversation,
    newConversation,
    deleteConversation,
    refreshConversations: loadConversations,
  };
}
