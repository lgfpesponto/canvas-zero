/**
 * Auto-preenchimento do número do pedido para vendedores com prefixo.
 *
 * Regras:
 *  - O prefixo é definido pelo admin master na página Usuários. Só quem tem
 *    prefixo preenchido recebe numeração automática.
 *  - Formato: `PREFIXO-SEQUENCIA` + código opcional do tipo de pedido
 *    (ex.: `2-345`, `2-346EST`, `2-347PALMI`). A sequência é única por
 *    prefixo (RPC `next_order_numero`), contando inclusive os números que
 *    terminam com código.
 *  - Exceções (número segue manual): `estoque`, `juliana`, `stefany`,
 *    `site` (Rancho Chique) e qualquer usuário com papel `vendedor_comissao`.
 *  - O vendedor pode editar a parte numérica, mas nunca remover o prefixo
 *    (use `garantirPrefixo` no onChange do input).
 *
 * Uso: `const { autoNumero, isAuto } = useAutoOrderNumero(vendedor, codigo);`
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const EXCLUDED_NOMES_USUARIO = new Set(['estoque', 'juliana', 'stefany', 'site']);

export interface VendedorAutoNumero {
  nomeUsuario?: string | null;
  pedidoPrefixo?: string | null;
  role?: string | null;
}

/** Normaliza o prefixo cadastrado: maiúsculo e sem hífen no final. */
export function normalizePrefixo(p?: string | null): string {
  return (p || '').trim().toUpperCase().replace(/-+$/, '');
}

export function shouldAutoNumber(v: VendedorAutoNumero | null | undefined): boolean {
  if (!v) return false;
  if (!normalizePrefixo(v.pedidoPrefixo)) return false;
  const nome = (v.nomeUsuario || '').trim().toLowerCase();
  if (EXCLUDED_NOMES_USUARIO.has(nome)) return false;
  if (v.role === 'vendedor_comissao') return false;
  return true;
}

/** Monta `PREFIXO-SEQ` + código. */
export function montarNumero(prefixo: string | null | undefined, base: string, codigo?: string | null): string {
  const p = normalizePrefixo(prefixo);
  const b = (base || '').trim();
  const c = (codigo || '').trim().toUpperCase();
  if (!b) return '';
  if (!p || b.toUpperCase().startsWith(`${p}-`)) return `${b}${c}`;
  return `${p}-${b}${c}`;
}

/**
 * Garante que o valor digitado continue começando com `PREFIXO-`.
 * Se o usuário apagar/alterar o prefixo, ele é recolocado.
 */
export function garantirPrefixo(valor: string, prefixo?: string | null): string {
  const p = normalizePrefixo(prefixo);
  if (!p) return valor;
  const base = `${p}-`;
  const v = valor || '';
  if (v.toUpperCase().startsWith(base)) return base + v.slice(base.length);
  // remove qualquer pedaço parcial do prefixo digitado no começo
  const limpo = v.replace(new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}?-?`, 'i'), '');
  return base + limpo;
}

/**
 * Retorna o próximo número calculado ao vivo para o vendedor dado,
 * já com o código do tipo de pedido no final (quando informado).
 */
export function useAutoOrderNumero(
  vendedor: VendedorAutoNumero | null | undefined,
  codigo?: string | null,
): {
  autoNumero: string | null;
  isAuto: boolean;
  prefixo: string;
  loading: boolean;
  refresh: () => void;
} {
  const isAuto = shouldAutoNumber(vendedor);
  const prefixo = normalizePrefixo(vendedor?.pedidoPrefixo);
  const suffix = (codigo || '').trim().toUpperCase();
  const [autoNumero, setAutoNumero] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAuto || !prefixo) {
      setAutoNumero(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc('next_order_numero' as any, { _prefixo: prefixo });
        if (cancelled) return;
        if (error) { console.warn('[useAutoOrderNumero] rpc', error); setAutoNumero(null); }
        else setAutoNumero(data ? `${data as string}${suffix}` : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuto, prefixo, suffix, tick]);

  return { autoNumero, isAuto, prefixo, loading, refresh: () => setTick(t => t + 1) };
}
