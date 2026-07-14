/**
 * Gera sufixo em letras para pedidos Bagy quando o pedido tem mais de 1 par.
 * 0 -> 'A', 25 -> 'Z', 26 -> 'AA', 27 -> 'AB', ...
 */
export function bagyLetterSuffix(index: number): string {
  if (index < 0 || !Number.isFinite(index)) return '';
  let n = Math.floor(index);
  let out = '';
  while (true) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return out;
}
