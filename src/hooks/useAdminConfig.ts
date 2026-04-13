import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ───── Types ───── */
export interface FichaTipo {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  tipo_ficha?: string;
  campos_nativos?: boolean;
}

export interface FichaCategoria {
  id: string;
  ficha_tipo_id: string;
  slug: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface FichaVariacao {
  id: string;
  categoria_id: string;
  campo_id: string | null;
  nome: string;
  preco_adicional: number;
  ativo: boolean;
  ordem: number;
}

export interface StatusEtapa {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
}

export interface FichaWorkflow {
  ficha_tipo_id: string;
  etapa_id: string;
  ativo: boolean;
}

export interface FichaCampo {
  id: string;
  ficha_tipo_id: string;
  categoria_id: string | null;
  nome: string;
  slug: string;
  tipo: string;
  obrigatorio: boolean;
  ordem: number;
  opcoes: any;
  vinculo: string | null;
  desc_condicional: boolean;
  ativo: boolean;
}

/* ───── Queries ───── */

export function useFichaTipos() {
  return useQuery({
    queryKey: ['ficha_tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_tipos')
        .select('*')
        .order('slug');
      if (error) throw error;
      return data as FichaTipo[];
    },
  });
}

export function useFichaTipoBySlug(slug: string) {
  return useQuery({
    queryKey: ['ficha_tipos', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_tipos')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as FichaTipo;
    },
    enabled: !!slug,
  });
}

export function useFichaCategorias(fichaTipoId: string | undefined) {
  return useQuery({
    queryKey: ['ficha_categorias', fichaTipoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_categorias')
        .select('*')
        .eq('ficha_tipo_id', fichaTipoId!)
        .order('ordem');
      if (error) throw error;
      return data as FichaCategoria[];
    },
    enabled: !!fichaTipoId,
  });
}

export function useFichaVariacoes(categoriaId: string | undefined) {
  return useQuery({
    queryKey: ['ficha_variacoes', categoriaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('*')
        .eq('categoria_id', categoriaId!)
        .order('ordem');
      if (error) throw error;
      return data as FichaVariacao[];
    },
    enabled: !!categoriaId,
  });
}

export function useStatusEtapas() {
  return useQuery({
    queryKey: ['status_etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_etapas')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return data as StatusEtapa[];
    },
  });
}

export function useFichaWorkflow(fichaTipoId: string | undefined) {
  return useQuery({
    queryKey: ['ficha_workflow', fichaTipoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_workflow')
        .select('*')
        .eq('ficha_tipo_id', fichaTipoId!);
      if (error) throw error;
      return data as FichaWorkflow[];
    },
    enabled: !!fichaTipoId,
  });
}

export function useFichaCampos(fichaTipoId: string | undefined) {
  return useQuery({
    queryKey: ['ficha_campos', fichaTipoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_campos')
        .select('*')
        .eq('ficha_tipo_id', fichaTipoId!)
        .order('ordem');
      if (error) throw error;
      return data as FichaCampo[];
    },
    enabled: !!fichaTipoId,
  });
}

/* ───── Queries by campo_id ───── */

export function useFichaVariacoesByCampo(campoId: string | undefined) {
  return useQuery({
    queryKey: ['ficha_variacoes_campo', campoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('*')
        .eq('campo_id', campoId!)
        .order('ordem');
      if (error) throw error;
      return data as FichaVariacao[];
    },
    enabled: !!campoId,
  });
}

/* ───── Mutations ───── */

export function useUpdateVariacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; nome?: string; preco_adicional?: number; ativo?: boolean; ordem?: number; relacionamento?: any }) => {
      const { id, ...rest } = v;
      const { error } = await supabase.from('ficha_variacoes').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_variacoes'] }),
  });
}

export function useDeleteVariacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ficha_variacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_variacoes'] }),
  });
}

export function useBulkInsertVariacoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { categoria_id: string; nome: string; preco_adicional: number; ordem: number }[]) => {
      const { error } = await supabase.from('ficha_variacoes').insert(items);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_variacoes'] }),
  });
}

export function useToggleWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { ficha_tipo_id: string; etapa_id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('ficha_workflow')
        .update({ ativo: p.ativo })
        .eq('ficha_tipo_id', p.ficha_tipo_id)
        .eq('etapa_id', p.etapa_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_workflow'] }),
  });
}

export function useInsertCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { ficha_tipo_id: string; slug: string; nome: string; ordem: number }) => {
      const { error } = await supabase.from('ficha_categorias').insert(c);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_categorias'] }),
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { id: string; nome?: string; ordem?: number; ativo?: boolean }) => {
      const { id, ...rest } = c;
      const { error } = await supabase.from('ficha_categorias').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_categorias'] }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete all variations first
      await supabase.from('ficha_variacoes').delete().eq('categoria_id', id);
      const { error } = await supabase.from('ficha_categorias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ficha_categorias'] });
      qc.invalidateQueries({ queryKey: ['ficha_variacoes'] });
    },
  });
}

export function useInsertVariacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { categoria_id: string; campo_id?: string; nome: string; preco_adicional: number; ordem: number }) => {
      const { error } = await supabase.from('ficha_variacoes').insert(v);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ficha_variacoes'] });
      qc.invalidateQueries({ queryKey: ['ficha_variacoes_campo'] });
    },
  });
}

export function useInsertFichaCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: {
      ficha_tipo_id: string; nome: string; slug: string; tipo: string;
      obrigatorio: boolean; ordem: number; opcoes: any; vinculo: string | null;
      desc_condicional: boolean; relacionamento?: any;
    }) => {
      const { error } = await supabase.from('ficha_campos').insert(c);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_campos'] }),
  });
}

export function useUpdateFichaCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { id: string; nome?: string; slug?: string; tipo?: string; obrigatorio?: boolean; ordem?: number; opcoes?: any; vinculo?: string | null; desc_condicional?: boolean; ativo?: boolean; relacionamento?: any }) => {
      const { id, ...rest } = c;
      const { error } = await supabase.from('ficha_campos').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_campos'] }),
  });
}

export function useDeleteFichaCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ficha_campos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ficha_campos'] }),
  });
}

export function useAllVariacoesByFichaTipo(fichaTipoId: string | undefined) {
  return useQuery({
    queryKey: ['ficha_variacoes_all', fichaTipoId],
    queryFn: async () => {
      // Get all categories for this ficha tipo
      const { data: cats, error: catErr } = await supabase
        .from('ficha_categorias')
        .select('id')
        .eq('ficha_tipo_id', fichaTipoId!);
      if (catErr) throw catErr;
      if (!cats || cats.length === 0) return [] as FichaVariacao[];
      const catIds = cats.map(c => c.id);
      const { data, error } = await supabase
        .from('ficha_variacoes')
        .select('*')
        .in('categoria_id', catIds)
        .order('ordem');
      if (error) throw error;
      return data as FichaVariacao[];
    },
    enabled: !!fichaTipoId,
  });
}
