import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TemplateRecord {
  id: string;
  nome: string;
  form_data: Record<string, string>;
  sent_by?: string | null;
  sent_by_name?: string | null;
  seen?: boolean;
}

export function useTemplateManagement() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const isEditing = editingTemplateId !== null;

  const loadTemplates = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('order_templates')
      .select('id, nome, form_data, sent_by, sent_by_name, seen')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setTemplates((data as any) || []);
  }, []);

  const saveTemplate = useCallback(async (userId: string, formData: Record<string, string>) => {
    if (!templateName.trim()) {
      toast.error('Preencha o nome do modelo');
      return false;
    }
    const { error } = await supabase
      .from('order_templates')
      .insert({ user_id: userId, nome: templateName.trim(), form_data: formData } as any);
    if (error) {
      toast.error('Erro ao salvar modelo');
      console.error(error);
      return false;
    }
    toast.success('Modelo criado com sucesso!');
    setTemplateName('');
    return true;
  }, [templateName]);

  const updateTemplate = useCallback(async (formData: Record<string, string>) => {
    if (!editingTemplateId) return false;
    if (!templateName.trim()) {
      toast.error('Preencha o nome do modelo');
      return false;
    }
    const { error } = await supabase
      .from('order_templates')
      .update({ nome: templateName.trim(), form_data: formData } as any)
      .eq('id', editingTemplateId);
    if (error) {
      toast.error('Erro ao atualizar modelo');
      console.error(error);
      return false;
    }
    toast.success('Modelo atualizado com sucesso!');
    setEditingTemplateId(null);
    setTemplateName('');
    return true;
  }, [editingTemplateId, templateName]);

  const deleteTemplate = useCallback(async (id: string, userId: string) => {
    await supabase.from('order_templates').delete().eq('id', id);
    toast.success('Modelo excluído');
    await loadTemplates(userId);
  }, [loadTemplates]);

  const startEditing = useCallback((template: TemplateRecord) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.nome);
    setShowTemplates(false);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingTemplateId(null);
    setTemplateName('');
  }, []);

  const sendTemplateToUsers = useCallback(async (
    templatesToSend: TemplateRecord | TemplateRecord[],
    recipientIds: string[],
    senderId: string,
    senderName: string,
  ) => {
    if (recipientIds.length === 0) return false;
    const list = Array.isArray(templatesToSend) ? templatesToSend : [templatesToSend];
    if (list.length === 0) return false;
    const rows = list.flatMap(template => recipientIds.map(uid => ({
      user_id: uid,
      nome: template.nome,
      form_data: template.form_data,
      sent_by: senderId,
      sent_by_name: senderName || 'Usuário',
      seen: false,
    })));
    const { error } = await supabase.from('order_templates').insert(rows as any);
    if (error) {
      toast.error('Erro ao enviar modelo');
      console.error(error);
      return false;
    }
    const ms = list.length;
    const us = recipientIds.length;
    toast.success(`${ms} modelo${ms > 1 ? 's' : ''} enviado${ms > 1 ? 's' : ''} para ${us} usuário${us > 1 ? 's' : ''}!`);
    return true;
  }, []);

  const markTemplatesAsSeen = useCallback(async (userId: string) => {
    await supabase
      .from('order_templates')
      .update({ seen: true } as any)
      .eq('user_id', userId)
      .eq('seen', false);
  }, []);

  const unseenCount = templates.filter(t => t.seen === false).length;

  return {
    templates,
    templateName,
    setTemplateName,
    templateSearch,
    setTemplateSearch,
    showTemplates,
    setShowTemplates,
    isEditing,
    editingTemplateId,
    loadTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    startEditing,
    cancelEditing,
    sendTemplateToUsers,
    markTemplatesAsSeen,
    unseenCount,
  };
}
