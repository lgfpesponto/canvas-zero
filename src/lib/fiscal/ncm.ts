/** NCM fixo por tipo de produto (regra definida pela 7 Estrivos). */
const REGRAS: { test: RegExp; ncm: string; ref: string }[] = [
  { test: /\bbotas?\b/i, ncm: '64039990', ref: 'BOTA' },
  { test: /\b(cintos?|gravatas?)\b/i, ncm: '42033000', ref: 'CINTO' },
  { test: /\bregatas?\b/i, ncm: '61061000', ref: 'EXTRAS' },
  { test: /(creme|revitalizador)/i, ncm: '34051000', ref: 'EXTRAS' },
];

export function ncmPorDescricao(texto: string | null | undefined): { ncm: string; ref: string } | null {
  const t = String(texto ?? '');
  for (const r of REGRAS) if (r.test.test(t)) return { ncm: r.ncm, ref: r.ref };
  return null;
}

export const formatNcm = (n: string) => (n.length === 8 ? `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6)}` : n);
