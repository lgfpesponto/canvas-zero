import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TemplateRecord {
  id: string;
  nome: string;
  form_data: Record<string, string>;
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
      .select('id, nome, form_data')
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
  };
}
