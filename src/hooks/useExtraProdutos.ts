import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExtraVariacao { nome: string; preco: number }
export type ExtraVariacoes = Record<string, ExtraVariacao[]>;

export interface ExtraProdutoDB {
  id: string;
  nome: string;
  descricao: string | null;
  preco_base: number | null;
  preco_label: string;
  variacoes: ExtraVariacoes;
  ordem: number;
  ativo: boolean;
}

export function useExtraProdutos() {
  return useQuery({
    queryKey: ['extra_produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extra_produtos' as any)
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ExtraProdutoDB[];
    },
    staleTime: 60_000,
  });
}

export function useUpdateExtraProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ExtraProdutoDB> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from('extra_produtos' as any).update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra_produtos'] }),
  });
}

export function useDeleteExtraProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('extra_produtos' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['extra_produtos'] }),
  });
}
