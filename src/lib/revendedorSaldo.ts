import { supabase } from '@/integrations/supabase/client';

export type ComprovanteStatus = 'pendente' | 'aprovado' | 'reprovado' | 'utilizado';
export type MovimentoTipo = 'entrada_comprovante' | 'baixa_pedido' | 'ajuste_admin' | 'estorno';

export interface RevendedorComprovante {
  id: string;
  vendedor: string;
  valor: number;
  data_pagamento: string;
  observacao: string | null;
  comprovante_url: string | null;
  comprovante_hash: string | null;
  status: ComprovanteStatus;
  motivo_reprovacao: string | null;
  enviado_por: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
  pagador_nome: string | null;
  pagador_documento: string | null;
  tipo_detectado: 'empresa' | 'fornecedor' | null;
}

export interface RevendedorSaldo {
  vendedor: string;
  saldo_disponivel: number;
  total_recebido: number;
  total_utilizado: number;
  total_ajustes: number;
  total_estornos: number;
}

export interface RevendedorMovimento {
  id: string;
  vendedor: string;
  tipo: MovimentoTipo;
  valor: number;
  descricao: string | null;
  comprovante_id: string | null;
  order_id: string | null;
  saldo_anterior: number;
  saldo_posterior: number;
  created_by: string | null;
  created_at: string;
}

export interface RevendedorBaixa {
  id: string;
  order_id: string;
  vendedor: string;
  valor_pedido: number;
  movimento_id: string | null;
  created_at: string;
}

export interface PedidoCobrado {
  id: string;
  numero: string;
  vendedor: string;
  modelo: string;
  tamanho: string;
  preco: number;
  quantidade: number;
  data_criacao: string;
  tipo_extra: string | null;
  status: string;
}

const SALDO_BUCKET_PREFIX = 'revendedor-saldo';

export async function uploadComprovanteRevendedor(file: File): Promise<string> {
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
    || (file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'jpg'));
  const path = `${SALDO_BUCKET_PREFIX}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('financeiro')
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) throw error;
  return path;
}

export async function fetchSaldosTodos(): Promise<RevendedorSaldo[]> {
  const { data, error } = await supabase
    .from('vw_revendedor_saldo' as any)
    .select('*');
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchSaldoVendedor(vendedor: string): Promise<RevendedorSaldo | null> {
  const { data, error } = await supabase
    .from('vw_revendedor_saldo' as any)
    .select('*')
    .eq('vendedor', vendedor)
    .maybeSingle();
  if (error) throw error;
  return (data as any) || null;
}

export async function fetchComprovantes(vendedor?: string): Promise<RevendedorComprovante[]> {
  let q = supabase.from('revendedor_comprovantes' as any).select('*').order('created_at', { ascending: false });
  if (vendedor) q = q.eq('vendedor', vendedor);
  const { data, error } = await q;
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchComprovantesPendentes(): Promise<RevendedorComprovante[]> {
  const { data, error } = await supabase
    .from('revendedor_comprovantes' as any)
    .select('*')
    .eq('status', 'pendente')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as any) || [];
}

/** Todos os comprovantes (admin only). */
export async function fetchComprovantesTodos(): Promise<RevendedorComprovante[]> {
  const { data, error } = await supabase
    .from('revendedor_comprovantes' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any) || [];
}

/** Todos os movimentos de saldo (admin only). */
export async function fetchMovimentosTodos(): Promise<RevendedorMovimento[]> {
  const { data, error } = await supabase
    .from('revendedor_saldo_movimentos' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchMovimentos(vendedor: string): Promise<RevendedorMovimento[]> {
  const { data, error } = await supabase
    .from('revendedor_saldo_movimentos' as any)
    .select('*')
    .eq('vendedor', vendedor)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any) || [];
}

/** Todas as baixas (admin only). */
export async function fetchBaixasTodas(): Promise<RevendedorBaixa[]> {
  const { data, error } = await supabase
    .from('revendedor_baixas_pedido' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchBaixasVendedor(vendedor: string): Promise<RevendedorBaixa[]> {
  const { data, error } = await supabase
    .from('revendedor_baixas_pedido' as any)
    .select('*')
    .eq('vendedor', vendedor)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as any) || [];
}

/** Pedidos do vendedor com status 'Cobrado' (independente de já terem baixa). */
export async function fetchPedidosCobrados(vendedor: string): Promise<PedidoCobrado[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, numero, vendedor, modelo, tamanho, preco, quantidade, data_criacao, tipo_extra, status, created_at')
    .eq('vendedor', vendedor)
    .eq('status', 'Cobrado')
    .order('data_criacao', { ascending: true });
  if (error) throw error;
  return (data as any) || [];
}

export async function aprovarComprovante(id: string) {
  const { data, error } = await supabase.rpc('aprovar_comprovante_revendedor' as any, {
    _comprovante_id: id,
  });
  if (error) throw error;
  return data;
}

export async function reprovarComprovante(id: string, motivo: string) {
  const { error } = await supabase.rpc('reprovar_comprovante_revendedor' as any, {
    _comprovante_id: id,
    _motivo: motivo,
  });
  if (error) throw error;
}

export async function ajustarSaldo(vendedor: string, delta: number, descricao: string) {
  const { data, error } = await supabase.rpc('ajustar_saldo_revendedor' as any, {
    _vendedor: vendedor,
    _delta: delta,
    _descricao: descricao,
  });
  if (error) throw error;
  return data;
}

export async function estornarBaixa(baixaId: string, motivo: string) {
  const { error } = await supabase.rpc('estornar_baixa_revendedor' as any, {
    _baixa_id: baixaId,
    _motivo: motivo,
  });
  if (error) throw error;
}

export async function quitarPedidosHistorico(orderIds: string[], motivo: string) {
  const { data, error } = await supabase.rpc('quitar_pedidos_historico' as any, {
    _order_ids: orderIds,
    _motivo: motivo,
  });
  if (error) throw error;
  return data as { quitados: number; pulados: number };
}

export async function descartarComprovantesHistorico(ids: string[], motivo: string) {
  const { data, error } = await supabase.rpc('descartar_comprovantes_historico' as any, {
    _ids: ids,
    _motivo: motivo,
  });
  if (error) throw error;
  return data as { descartados: number };
}

export async function marcarComprovanteUtilizado(comprovanteId: string, motivo: string) {
  const { data, error } = await supabase.rpc('marcar_comprovante_utilizado' as any, {
    _comprovante_id: comprovanteId,
    _motivo: motivo,
  });
  if (error) throw error;
  return data as { ok: boolean; saldo_anterior: number; saldo_posterior: number };
}

/** Lista o nome_completo de todos os usuários cadastrados como vendedores
 *  (roles 'vendedor' ou 'vendedor_comissao'), ordenado A→Z. */
export async function fetchVendedoresUsuarios(): Promise<string[]> {
  const { data: roles, error: rolesErr } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'vendedor' as any);
  if (rolesErr) throw rolesErr;
  const ids = [...new Set((roles || []).map((r: any) => r.user_id))];
  if (ids.length === 0) return [];
  const { data: profs, error: profErr } = await supabase
    .from('profiles')
    .select('id, nome_completo')
    .in('id', ids);
  if (profErr) throw profErr;
  return (profs || [])
    .map((p: any) => (p.nome_completo || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function fetchVisibilidade(): Promise<{ vendedor: string; ativo: boolean }[]> {
  const { data, error } = await supabase
    .from('revendedor_saldo_visibilidade' as any)
    .select('vendedor, ativo');
  if (error) throw error;
  return (data as any) || [];
}

export function statusLabel(s: ComprovanteStatus): string {
  switch (s) {
    case 'pendente': return 'Pendente';
    case 'aprovado': return 'Aprovado';
    case 'reprovado': return 'Reprovado';
    case 'utilizado': return 'Utilizado';
  }
}

export function tipoMovimentoLabel(t: MovimentoTipo): string {
  switch (t) {
    case 'entrada_comprovante': return 'Entrada (comprovante)';
    case 'baixa_pedido': return 'Baixa de pedido';
    case 'ajuste_admin': return 'Ajuste manual';
    case 'estorno': return 'Estorno';
  }
}
