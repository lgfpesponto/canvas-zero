/**
 * Atualização direta de preço de variações/opções (sem congelamento).
 *
 * HISTÓRICO: Antes este módulo abria um diálogo perguntando o escopo temporal
 * (desde início / data específica / futuro) e chamava a RPC `aplicar_mudanca_preco`
 * que CONGELAVA pedidos antigos (preco_congelado=true) para preservar histórico.
 *
 * REGRA ATUAL: o preço de um pedido é SEMPRE a composição atual.
 * Ao trocar o preço de uma variação/opção fazemos UPDATE direto na tabela e o
 * reconciliador recalcula todos os pedidos afetados na próxima passagem.
 * Sem diálogo, sem congelamento.
 */
import { supabase } from '@/integrations/supabase/client';
import { syncCustomOptionUpsert, syncFichaVariacaoUpsert } from '@/lib/atacadoSync';

export type PriceChangeTarget =
  | { tipo: 'ficha_variacao'; target_id: string; label: string; preco_antes: number; preco_depois: number }
  | { tipo: 'custom_option'; target_id: string; label: string; preco_antes: number; preco_depois: number };

export interface PriceChangeResult {
  mudanca_id: string;
  pedidos_ajustados: number;
  valor_total_compensado?: number;
  status: 'aplicada' | 'pendente';
  modo?: 'congelar' | 'recalcular';
}

// Mantido por compat — não usado mais.
export function registerPriceChangeHandler(_fn: unknown) {
  /* noop */
}

export async function requestPriceChange(target: PriceChangeTarget): Promise<PriceChangeResult | null> {
  if (Number(target.preco_antes) === Number(target.preco_depois)) {
    return { mudanca_id: '', pedidos_ajustados: 0, status: 'aplicada', modo: 'recalcular' };
  }
  if (target.tipo === 'custom_option') {
    const { error } = await supabase
      .from('custom_options')
      .update({ preco: target.preco_depois })
      .eq('id', target.target_id);
    if (error) { console.error('requestPriceChange custom_options', error); return null; }
    // Sync Atacado: precisa do label + categoria atuais
    const { data: full } = await supabase
      .from('custom_options')
      .select('id, categoria, label, preco')
      .eq('id', target.target_id)
      .maybeSingle();
    if (full) syncCustomOptionUpsert(full as any);
  } else {
    const { error } = await supabase
      .from('ficha_variacoes')
      .update({ preco_adicional: target.preco_depois })
      .eq('id', target.target_id);
    if (error) { console.error('requestPriceChange ficha_variacoes', error); return null; }
    // Sync Atacado: monta contexto via lookup
    await syncVariacaoById(target.target_id);
  }
  return { mudanca_id: '', pedidos_ajustados: 0, status: 'aplicada', modo: 'recalcular' };
}

/**
 * Busca contexto completo de uma variação e dispara upsert no Atacado.
 * Pode ser usado por outros pontos do app que alteraram a variação.
 */
export async function syncVariacaoById(variacaoId: string) {
  const { data: v } = await supabase
    .from('ficha_variacoes')
    .select('id, nome, preco_adicional, ordem, ativo, campo_id, categoria_id, relacionamento')
    .eq('id', variacaoId)
    .maybeSingle();
  if (!v) return;
  const [campoRes, categoriaRes] = await Promise.all([
    v.campo_id
      ? supabase.from('ficha_campos').select('id, slug, nome, tipo, vinculo, relacionamento').eq('id', v.campo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('ficha_categorias').select('id, slug, nome, ficha_tipo_id').eq('id', v.categoria_id).maybeSingle(),
  ]);
  const cat: any = categoriaRes.data;
  const tipoRes = cat?.ficha_tipo_id
    ? await supabase.from('ficha_tipos').select('id, slug, nome').eq('id', cat.ficha_tipo_id).maybeSingle()
    : { data: null };
  syncFichaVariacaoUpsert(
    {
      id: v.id,
      nome: v.nome,
      preco_adicional: Number(v.preco_adicional) || 0,
      ordem: Number(v.ordem) || 0,
      ativo: v.ativo !== false,
      relacionamento: v.relacionamento,
    },
    {
      ficha_tipo: tipoRes.data ? { id: tipoRes.data.id, slug: tipoRes.data.slug, nome: tipoRes.data.nome } : null,
      categoria: cat ? { id: cat.id, slug: cat.slug, nome: cat.nome } : null,
      campo: campoRes.data
        ? {
            id: (campoRes.data as any).id,
            slug: (campoRes.data as any).slug,
            nome: (campoRes.data as any).nome,
            tipo: (campoRes.data as any).tipo,
            vinculo: (campoRes.data as any).vinculo ?? null,
            relacionamento: (campoRes.data as any).relacionamento ?? null,
          }
        : null,
    }
  );
}
