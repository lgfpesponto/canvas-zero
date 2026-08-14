/**
 * Sugestões automáticas de cor a partir da cor do couro do cano.
 * As sugestões só reordenam / pré-preenchem — nenhuma regra de preço muda.
 */

const norm = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const has = (cor: string, ...termos: string[]) => termos.some(t => norm(cor).includes(t));

/** Remove a vogal final das palavras: "branco"/"branca" → "branc" (tolerância de gênero). */
const stem = (s?: string | null) => norm(s).replace(/([a-z])[oa](\b|$)/g, '$1');

/** Cor da Linha sugerida para a cor do couro do cano. */
export function sugerirCorLinha(corCouro: string): string | null {
  if (!corCouro) return null;
  if (has(corCouro, 'preto e branco', 'malhado', 'preto', 'preta')) return 'Preta';
  if (has(corCouro, 'off white', 'branco', 'branca', 'cru')) return 'Branca';
  if (has(corCouro, 'bege', 'areia')) return 'Bege';
  if (has(corCouro, 'marrom', 'nescau', 'chocolate', 'cafe', 'caramelo', 'whisky', 'tabaco',
    'cappuccino', 'castor', 'havana', 'pinhao', 'mustang', 'brasileiro', 'americano')) return 'Café';
  if (has(corCouro, 'rosa')) return 'Rosa';
  if (has(corCouro, 'vermelho', 'vermelha')) return 'Vermelha';
  if (has(corCouro, 'azul', 'petroleo')) return 'Azul';
  if (has(corCouro, 'verde')) return 'Verde';
  if (has(corCouro, 'amarelo', 'mostarda')) return 'Amarelo';
  if (has(corCouro, 'laranja', 'telha')) return 'Laranja';
  return corCouro;
}


/** Cor da Borrachinha sugerida. */
export function sugerirCorBorrachinha(corCouro: string): string | null {
  if (!corCouro) return null;
  if (has(corCouro, 'preto', 'preta')) return 'Preto';
  if (has(corCouro, 'off white', 'branco', 'branca')) return 'Branco';
  if (has(corCouro, 'rosa')) return 'Rosa';
  if (has(corCouro, 'laranja')) return 'Laranja';
  return 'Marrom';
}

/** Cor do Vivo sugerida (e a segunda opção). */
export function sugerirCorVivo(corCouro: string): string | null {
  if (!corCouro) return null;
  if (has(corCouro, 'off white', 'branco', 'branca')) return 'Branco';
  if (has(corCouro, 'rosa')) return 'Rosa';
  if (has(corCouro, 'laranja')) return 'Laranja';
  if (has(corCouro, 'azul')) return 'Azul';
  return 'Preto';
}

/** Segunda sugestão do vivo (branco) quando a primeira é preto. */
export const SEGUNDA_SUGESTAO_VIVO = 'Branco';

type Opt = string | { label: string; preco?: number };

/**
 * Reordena as opções colocando as sugeridas no topo (na ordem informada).
 * A comparação é tolerante a acento/caixa; opções inexistentes são ignoradas.
 */
export function ordenarComSugestao<T extends Opt>(options: T[], sugeridas: (string | null | undefined)[]): T[] {
  const alvos = sugeridas.filter(Boolean).map(s => stem(s as string));
  if (alvos.length === 0) return options;
  const labelOf = (o: T) => stem(typeof o === 'string' ? o : o.label);
  const topo: T[] = [];
  alvos.forEach(a => {
    const found = options.find(o => labelOf(o) === a) || options.find(o => labelOf(o).includes(a) || a.includes(labelOf(o)));
    if (found && !topo.includes(found)) topo.push(found);
  });
  if (topo.length === 0) return options;
  return [...topo, ...options.filter(o => !topo.includes(o))];
}

/** Retorna true se `valor` é a cor sugerida para aquele couro. */
export function ehSugerida(valor: string, sugerida: string | null): boolean {
  if (!valor || !sugerida) return false;
  const a = stem(valor);
  const b = stem(sugerida);
  return a === b || a.includes(b) || b.includes(a);
}

