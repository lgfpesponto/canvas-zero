import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TamanhoSku = { tamanho: string; sku: string };

export interface TemplateRecord {
  id: string;
  nome: string;
  form_data: Record<string, string>;
  sent_by?: string | null;
  sent_by_name?: string | null;
  seen?: boolean;
  sku?: string | null;
  genero?: string | null;
  foto_url?: string | null;
  tamanhos_skus?: TamanhoSku[] | null;
  tipo?: 'bota' | 'cinto';
}


export function useTemplateManagement() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSku, setTemplateSku] = useState('');
  const [templateGenero, setTemplateGenero] = useState('');
  const [templateFotoUrl, setTemplateFotoUrl] = useState('');
  const [templateTamanhosSkus, setTemplateTamanhosSkus] = useState<TamanhoSku[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const isEditing = editingTemplateId !== null;

  const resetTemplateFields = useCallback(() => {
    setTemplateName('');
    setTemplateSku('');
    setTemplateGenero('');
    setTemplateFotoUrl('');
    setTemplateTamanhosSkus([]);
  }, []);

  const loadTemplates = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('order_templates')
      .select('id, nome, form_data, sent_by, sent_by_name, seen, sku, genero, foto_url, tamanhos_skus, tipo')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setTemplates((data as any) || []);
  }, []);

  const sanitizeTamanhos = (arr: TamanhoSku[]): TamanhoSku[] =>
    arr
      .map(t => ({ tamanho: (t.tamanho || '').trim(), sku: (t.sku || '').trim() }))
      .filter(t => t.tamanho || t.sku);

  const saveTemplate = useCallback(async (userId: string, formData: Record<string, string>, tipo?: 'bota' | 'cinto') => {
    if (!templateName.trim()) {
      toast.error('Preencha o nome do modelo');
      return false;
    }
    const sku = templateSku.trim() || null;
    const genero = templateGenero.trim() || null;
    const foto_url = templateFotoUrl.trim() || null;
    const tamanhos_skus = sanitizeTamanhos(templateTamanhosSkus);
    const payload: any = { user_id: userId, nome: templateName.trim(), form_data: formData, sku, genero, foto_url, tamanhos_skus };
    if (tipo) payload.tipo = tipo;
    const { error } = await supabase
      .from('order_templates')
      .insert(payload);
    if (error) {
      toast.error('Erro ao salvar modelo');
      console.error(error);
      return false;
    }
    toast.success('Modelo criado com sucesso!');
    resetTemplateFields();
    return true;
  }, [templateName, templateSku, templateGenero, templateFotoUrl, templateTamanhosSkus, resetTemplateFields]);

  const updateTemplate = useCallback(async (formData: Record<string, string>) => {
    if (!editingTemplateId) return false;
    if (!templateName.trim()) {
      toast.error('Preencha o nome do modelo');
      return false;
    }
    const sku = templateSku.trim() || null;
    const genero = templateGenero.trim() || null;
    const foto_url = templateFotoUrl.trim() || null;
    const tamanhos_skus = sanitizeTamanhos(templateTamanhosSkus);
    const { error } = await supabase
      .from('order_templates')
      .update({ nome: templateName.trim(), form_data: formData, sku, genero, foto_url, tamanhos_skus } as any)
      .eq('id', editingTemplateId);
    if (error) {
      toast.error('Erro ao atualizar modelo');
      console.error(error);
      return false;
    }
    toast.success('Modelo atualizado com sucesso!');
    setEditingTemplateId(null);
    resetTemplateFields();
    return true;
  }, [editingTemplateId, templateName, templateSku, templateGenero, templateFotoUrl, templateTamanhosSkus, resetTemplateFields]);

  const deleteTemplate = useCallback(async (id: string, userId: string) => {
    await supabase.from('order_templates').delete().eq('id', id);
    toast.success('Modelo excluído');
    await loadTemplates(userId);
  }, [loadTemplates]);

  const startEditing = useCallback((template: TemplateRecord) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.nome);
    setTemplateSku(template.sku || '');
    setTemplateGenero(template.genero || '');
    setTemplateFotoUrl(template.foto_url || '');
    setTemplateTamanhosSkus(Array.isArray(template.tamanhos_skus) ? template.tamanhos_skus : []);
    setShowTemplates(false);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingTemplateId(null);
    resetTemplateFields();
  }, [resetTemplateFields]);


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
    templateSku,
    setTemplateSku,
    templateGenero,
    setTemplateGenero,
    templateFotoUrl,
    setTemplateFotoUrl,
    templateTamanhosSkus,
    setTemplateTamanhosSkus,
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
