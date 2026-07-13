/**
 * Valida uma seleção de formulário salvo (template ou draft) contra a versão
 * atual das ficha_variacoes de uma ficha (bota/cinto). Detecta quando uma
 * variação selecionada foi excluída no banco pelo admin.
 *
 * Retorna a lista de itens removidos (campo + valor) — se vazio, o template
 * é válido e pode ser usado.
 */

export interface FichaCampoLite {
  id: string;
  slug: string;
  nome: string;
}
export interface FichaVariacaoLite {
  id: string;
  campo_id: string;
  nome: string;
}

export interface RemovedItem {
  campo: string;  // nome amigável do campo (ficha_campos.nome)
  valor: string;  // valor salvo que não existe mais
}

/** camelCase → snake_case simples ("tipoCouroCano" → "tipo_couro_cano"). */
function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Retorna a lista de variações removidas quando comparamos `formData`
 * (chaves camelCase) contra `campos` + `variacoes` do banco.
 */
export function findRemovedVariacoes(
  formData: Record<string, unknown>,
  campos: FichaCampoLite[],
  variacoes: FichaVariacaoLite[],
): RemovedItem[] {
  const removed: RemovedItem[] = [];
  const camposBySlug = new Map(campos.map(c => [c.slug, c]));
  const varsByCampo = new Map<string, Set<string>>();
  for (const v of variacoes) {
    if (!varsByCampo.has(v.campo_id)) varsByCampo.set(v.campo_id, new Set());
    varsByCampo.get(v.campo_id)!.add(v.nome);
  }

  for (const [key, rawVal] of Object.entries(formData)) {
    if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === false) continue;
    if (typeof rawVal !== 'string') continue;
    // Ignora chaves internas do próprio formulário.
    if (key.startsWith('__') || key === 'cliente' || key === 'clienteWhatsapp' ||
        key === 'vendedor' || key === 'numeroPedido' || key === 'observacao' ||
        key === 'sobMedida' || key === 'sobMedidaDesc' || key === 'foto' || key === 'fotos') continue;

    const slug = camelToSnake(key);
    const campo = camposBySlug.get(slug);
    if (!campo) continue; // não é um campo mapeável para variações no banco

    const allowed = varsByCampo.get(campo.id);
    if (!allowed || allowed.size === 0) continue; // sem variações no banco = livre

    // Campos multi usam "||" como separador (padrão do OrderPage).
    const parts = (rawVal as string).includes('||')
      ? (rawVal as string).split('||').filter(Boolean)
      : [rawVal as string];

    for (const p of parts) {
      if (!allowed.has(p)) {
        removed.push({ campo: campo.nome, valor: p });
      }
    }
  }
  return removed;
}
