// Codifica/decodifica o snapshot dos filtros da vitrine pública em base64url.
// Stateless: nada é gravado no banco, o link carrega o estado dos filtros.

export interface VitrinePayload {
  search: string;
  tamanhos: string[];
  ficha: Record<string, string[]>;
  mostrarPreco: boolean;
  mostrarDesconto: boolean;
  titulo?: string;
}

const toBase64Url = (s: string): string => {
  const b64 = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(s)))
    : Buffer.from(s, 'utf-8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (s: string): string => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const raw = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  try {
    return decodeURIComponent(escape(raw));
  } catch {
    return raw;
  }
};

export function encodeVitrineToken(payload: VitrinePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeVitrineToken(token: string): VitrinePayload | null {
  try {
    const obj = JSON.parse(fromBase64Url(token));
    return {
      search: String(obj.search || ''),
      tamanhos: Array.isArray(obj.tamanhos) ? obj.tamanhos.map(String) : [],
      ficha: obj.ficha && typeof obj.ficha === 'object'
        ? Object.fromEntries(Object.entries(obj.ficha).map(([k, v]) => [k, Array.isArray(v) ? (v as any[]).map(String) : []]))
        : {},
      mostrarPreco: !!obj.mostrarPreco,
      mostrarDesconto: !!obj.mostrarDesconto,
      titulo: obj.titulo ? String(obj.titulo) : undefined,
    };
  } catch {
    return null;
  }
}
