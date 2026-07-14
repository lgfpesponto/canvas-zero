/**
 * Auto-preenchimento do número do pedido para vendedores com prefixo.
 *
 * Regras:
 *  - Vendedor com `pedidoPrefixo` NÃO nulo E cujo nomeUsuario NÃO seja
 *    `estoque` / `juliana` / `site` (rancho chique) → número é gerado
 *    automaticamente via RPC `next_order_numero(prefixo)` e o campo fica
 *    readonly no formulário.
 *  - Vendedores sem prefixo, Estoque, Juliana e Rancho Chique/Site: o
 *    comportamento manual atual permanece (o vendedor digita o número).
 *  - Rancho Chique tem prefixo `RC` mas os pedidos vêm da Bagy com o número
 *    definido, então nunca é auto-gerado (o vendedor `site` está na lista de
 *    exceção).
 *
 * Uso: `const { autoNumero, loading } = useAutoOrderNumero(vendedor);`
 * Se `autoNumero` vier `null`, o formulário deixa o vendedor digitar.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const EXCLUDED_NOMES_USUARIO = new Set(['estoque', 'juliana', 'site']);

export interface VendedorAutoNumero {
  nomeUsuario?: string | null;
  pedidoPrefixo?: string | null;
}

export function shouldAutoNumber(v: VendedorAutoNumero | null | undefined): boolean {
  if (!v) return false;
  const prefixo = (v.pedidoPrefixo || '').trim();
  if (!prefixo) return false;
  const nome = (v.nomeUsuario || '').trim().toLowerCase();
  if (EXCLUDED_NOMES_USUARIO.has(nome)) return false;
  return true;
}

/**
 * Retorna o próximo número calculado ao vivo para o vendedor dado.
 * `autoNumero` é `null` enquanto carrega ou quando o vendedor não deve ter
 * auto-numeração.
 */
export function useAutoOrderNumero(vendedor: VendedorAutoNumero | null | undefined): {
  autoNumero: string | null;
  isAuto: boolean;
  loading: boolean;
  refresh: () => void;
} {
  const isAuto = shouldAutoNumber(vendedor);
  const prefixo = (vendedor?.pedidoPrefixo || '').trim();
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
        else setAutoNumero((data as string) || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuto, prefixo, tick]);

  return { autoNumero, isAuto, loading, refresh: () => setTick(t => t + 1) };
}
