/**
 * Regras de obrigatoriedade de preço para variações cadastradas.
 *
 * Apenas Modelo e Bordado obrigam preço > 0 (para evitar furo nos relatórios).
 * Demais categorias (couro, solado, cor de linha, etc.) podem ter R$ 0.
 *
 * Exceção: variações chamadas "Sem bordado" são isentas — naturalmente R$ 0.
 */

const MODELO_SLUGS = new Set(['modelos', 'tamanho-genero-modelo']);
const BORDADO_SLUGS = new Set([
  'bordados-cano',
  'bordados-gaspea',
  'bordados-taloneira',
  'bordados-visual',
]);

const MODELO_CUSTOM_CATS = new Set(['modelo', 'modelos']);
const BORDADO_CUSTOM_CATS = new Set([
  'bordado_cano',
  'bordado_gaspea',
  'bordado_taloneira',
  'bordado',
  'bordados',
]);

export type CategoriaTipo = 'modelo' | 'bordado' | 'outro';

export function getCategoriaTipo(slugOrCategoria: string | null | undefined): CategoriaTipo {
  if (!slugOrCategoria) return 'outro';
  const k = slugOrCategoria.toLowerCase().trim();
  if (MODELO_SLUGS.has(k) || MODELO_CUSTOM_CATS.has(k)) return 'modelo';
  if (BORDADO_SLUGS.has(k) || BORDADO_CUSTOM_CATS.has(k)) return 'bordado';
  return 'outro';
}

export function isSemBordado(nome: string | null | undefined): boolean {
  if (!nome) return false;
  return nome.toLowerCase().trim() === 'sem bordado';
}

/**
 * Retorna true quando essa variação precisa de preço > 0.
 */
export function requiresPositivePrice(
  categoriaSlug: string | null | undefined,
  nomeVariacao: string | null | undefined,
): boolean {
  const tipo = getCategoriaTipo(categoriaSlug);
  if (tipo === 'outro') return false;
  if (isSemBordado(nomeVariacao)) return false;
  return true;
}

/**
 * Mensagem padrão exibida quando a regra é violada.
 */
export const PRICE_REQUIRED_MESSAGE =
  'Modelos e Bordados precisam ter preço maior que R$ 0 para evitar furo nos relatórios.';
