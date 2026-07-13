/**
 * Extrai o nome puro de uma variação a partir do label exibido na
 * "Composição do Pedido" (remove prefixos como "Modelo: ", "Couro: ", etc.
 * e sufixos como " (3 un.)").
 */
const PREFIXES = [
  'Modelo: ',
  'Couro: ',
  'Solado: ',
  'Cor Sola: ',
  'Cor Vira: ',
  'Recorte Cano: ',
  'Recorte Gáspea: ',
  'Recorte Taloneira: ',
  'Área Metal: ',
  'Adicional: ',
  'Desenvolvimento: ',
  'Desenvolvimento Bordado: ',
  'Desenvolvimento Laser: ',
  'Desenvolvimento Estampa: ',
];

export function extractVariationName(label: string): string {
  if (!label) return '';
  for (const p of PREFIXES) {
    if (label.startsWith(p)) return label.slice(p.length).trim();
  }
  // Remove sufixo tipo " (3 un.)"
  return label.replace(/\s*\(\s*\d+\s*un\.?\s*\)\s*$/i, '').trim();
}
