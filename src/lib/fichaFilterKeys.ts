// Chaves de filtro por ficha compartilhadas entre Estoque, Modelos e Modelos Salvos.
export const FICHA_FILTER_KEYS: { key: string; label: string }[] = [
  { key: 'modelo', label: 'Modelo' },
  { key: 'tipo_couro_cano', label: 'Tipo Couro Cano' },
  { key: 'tipo_couro_gaspea', label: 'Tipo Couro Gáspea' },
  { key: 'solado', label: 'Solado' },
  { key: 'genero', label: 'Gênero' },
];

/** Constrói o mapa { key -> Set<valor> } a partir de uma lista de itens. */
export function buildFichaOptions<T>(
  items: T[],
  getSnapshot: (item: T) => Record<string, unknown> | null | undefined,
): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const k of FICHA_FILTER_KEYS) out[k.key] = new Set();
  for (const it of items) {
    const snap = getSnapshot(it) || {};
    for (const k of FICHA_FILTER_KEYS) {
      const v = (snap as Record<string, unknown>)[k.key];
      if (v && typeof v === 'string') out[k.key].add(v);
    }
  }
  return out;
}

/** Item passa nos filtros se, para cada categoria selecionada, o valor bate. */
export function matchesFichaFilters(
  snapshot: Record<string, unknown> | null | undefined,
  selFicha: Record<string, Set<string>>,
): boolean {
  const snap = snapshot || {};
  for (const k of Object.keys(selFicha)) {
    const set = selFicha[k];
    if (!set || set.size === 0) continue;
    const v = (snap as Record<string, unknown>)[k];
    if (typeof v !== 'string' || !set.has(v)) return false;
  }
  return true;
}

export function countActiveFicha(selFicha: Record<string, Set<string>>): number {
  return Object.values(selFicha).reduce((s, set) => s + (set?.size || 0), 0);
}
