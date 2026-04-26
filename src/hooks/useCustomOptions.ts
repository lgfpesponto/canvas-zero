import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { requiresPositivePrice, PRICE_REQUIRED_MESSAGE } from '@/lib/priceValidation';

export interface CustomOption {
  id: string;
  categoria: string;
  label: string;
  preco: number;
}

export function useCustomOptions() {
  const [options, setOptions] = useState<CustomOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = async () => {
    const { data, error } = await supabase
      .from('custom_options')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching custom_options:', error);
    } else {
      setOptions((data || []).map((d: any) => ({
        id: d.id,
        categoria: d.categoria,
        label: d.label,
        preco: Number(d.preco) || 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const addOption = async (categoria: string, label: string, preco: number) => {
    if (requiresPositivePrice(categoria, label) && (!preco || preco <= 0)) {
      toast.error(PRICE_REQUIRED_MESSAGE);
      return null;
    }
    const { data, error } = await supabase
      .from('custom_options')
      .insert({ categoria, label, preco })
      .select()
      .single();
    if (error) {
      toast.error('Erro ao salvar opção: ' + error.message);
      return null;
    }
    const newOpt: CustomOption = {
      id: (data as any).id,
      categoria,
      label,
      preco,
    };
    setOptions(prev => [...prev, newOpt]);
    toast.success(`Opção "${label}" adicionada!`);
    return newOpt;
  };

  const deleteOption = async (id: string) => {
    const { error } = await supabase
      .from('custom_options')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao remover opção');
      return;
    }
    setOptions(prev => prev.filter(o => o.id !== id));
    toast.success('Opção removida!');
  };

  const updateOption = async (id: string, label: string, preco: number) => {
    const current = options.find(o => o.id === id);
    const categoria = current?.categoria || '';
    if (requiresPositivePrice(categoria, label) && (!preco || preco <= 0)) {
      toast.error(PRICE_REQUIRED_MESSAGE);
      return;
    }
    const { error } = await supabase
      .from('custom_options')
      .update({ label, preco })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar opção');
      return;
    }
    setOptions(prev => prev.map(o => o.id === id ? { ...o, label, preco } : o));
    toast.success('Opção atualizada!');
  };

  const bulkUpdatePreco = async (categoria: string, increment: number) => {
    const catOptions = options.filter(o => o.categoria === categoria);
    let errorCount = 0;
    for (const opt of catOptions) {
      const newPreco = Math.max(0, opt.preco + increment);
      const { error } = await supabase
        .from('custom_options')
        .update({ preco: newPreco })
        .eq('id', opt.id);
      if (error) errorCount++;
    }
    if (errorCount > 0) {
      toast.error(`Erro ao atualizar ${errorCount} opções`);
    } else {
      setOptions(prev => prev.map(o =>
        o.categoria === categoria ? { ...o, preco: Math.max(0, o.preco + increment) } : o
      ));
      toast.success(`Preços atualizados: ${increment >= 0 ? '+' : ''}R$${increment} em ${catOptions.length} itens`);
    }
  };

  const getByCategoria = (cat: string) => options.filter(o => o.categoria === cat);

  return { options, loading, addOption, updateOption, deleteOption, bulkUpdatePreco, getByCategoria };
}
