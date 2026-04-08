import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      .from('custom_options' as any)
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
    const { data, error } = await supabase
      .from('custom_options' as any)
      .insert({ categoria, label, preco } as any)
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
      .from('custom_options' as any)
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao remover opção');
      return;
    }
    setOptions(prev => prev.filter(o => o.id !== id));
    toast.success('Opção removida!');
  };

  const getByCategoria = (cat: string) => options.filter(o => o.categoria === cat);

  return { options, loading, addOption, deleteOption, getByCategoria };
}
